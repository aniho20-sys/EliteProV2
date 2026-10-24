# Load test only (scripts/load-test/README.md): opens the coach's app (the load-test build,
# against the local emulators) as each seeded coach and measures how long the dashboard and
# its data take, how much is downloaded, and how much memory it holds.
#
# The browser refuses every host but 127.0.0.1 / localhost, so the app cannot reach
# elitepro-16718 or anything else on the internet (CLAUDE.md #38).
#
#   python3 scripts/load-test/measure.py 10 50 100 200
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

APP = 'http://127.0.0.1:5199'
CPU_SLOWDOWN = 4  # Chromium's own guide for "mid-tier phone"
QUIET_MS = 3000   # data counts as loaded once no listener has opened or answered for this long
OUT = Path(__file__).parent / 'results'


def allowed(url):
    host = urlparse(url).hostname
    return host in ('127.0.0.1', 'localhost') or url.startswith(('data:', 'blob:'))


def run_once(page, cdp, url, label, reload=False):
    received = {'bytes': 0}
    blocked = []

    def on_data(ev):
        received['bytes'] += ev.get('encodedDataLength', 0) or 0

    cdp.on('Network.dataReceived', on_data)
    t0 = time.time()
    if reload:
        page.reload()
    else:
        page.goto(url)
    page.wait_for_selector('.stat-pill', timeout=1_200_000)
    dashboard_ms = (time.time() - t0) * 1000

    # Data loaded = every listener has answered once and nothing new for QUIET_MS.
    deadline = time.time() + 1200
    while time.time() < deadline:
        s = page.evaluate('''() => {
          const L = (window.__loadTest || {}).listeners || [];
          const now = performance.now();
          const live = L.filter(l => !l.closedAt);
          const pending = live.filter(l => l.serverAt === null).length;
          const last = Math.max(0, ...L.map(l => Math.max(l.openedAt, l.serverAt || 0)));
          return { pending, quietFor: now - last, count: L.length };
        }''')
        if s['count'] and s['pending'] == 0 and s['quietFor'] >= QUIET_MS:
            break
        time.sleep(0.25)
    stats = page.evaluate('''() => {
      const L = window.__loadTest.listeners;
      const open = L.filter(l => !l.closedAt);
      const byCol = {};
      for (const l of open) {
        const c = byCol[l.col] || (byCol[l.col] = { listeners: 0, docs: 0, errors: 0 });
        c.listeners += 1; c.docs += l.docs; if (l.error) c.errors += 1;
      }
      const lastFirst = Math.max(...open.map(l => l.firstAt || 0));
      const lastServer = Math.max(...open.map(l => l.serverAt || 0));
      return { byCol, openListeners: open.length, lastFirstAnswerMs: lastFirst, lastServerAnswerMs: lastServer,
               listenersEverOpened: L.length,
               heapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null,
               navStartToPerf: performance.timeOrigin };
    }''')
    cdp.remove_listener('Network.dataReceived', on_data)
    total_docs = sum(c['docs'] for c in stats['byCol'].values())
    return {
        'run': label,
        'dashboardShownMs': round(dashboard_ms),
        'allDataShownMs': round(stats['lastFirstAnswerMs']),
        'allDataFromServerMs': round(stats['lastServerAnswerMs']),
        'openListeners': stats['openListeners'],
        'listenersEverOpened': stats['listenersEverOpened'],
        'docsLoaded': total_docs,
        'downloadedMB': round(received['bytes'] / 1048576, 2),
        'heapMB': round(stats['heapMB'], 1) if stats['heapMB'] else None,
        'byCollection': stats['byCol'],
        'blockedRequests': blocked,
    }


def measure(n, pw):
    browser = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--enable-precise-memory-info'])
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    blocked = []

    def guard(route):
        if allowed(route.request.url):
            route.continue_()
        else:
            blocked.append(route.request.url)
            route.abort()

    context.route('**/*', guard)
    page = context.new_page()
    cdp = context.new_cdp_session(page)
    cdp.send('Network.enable')
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': CPU_SLOWDOWN})
    url = f'{APP}/?as=coach-{n}#/'
    cold = run_once(page, cdp, url, 'first open (nothing cached)')
    warm = run_once(page, cdp, url, 'reopen (cached on the phone)', reload=True)
    browser.close()
    hosts = sorted({urlparse(u).hostname for u in blocked})
    return {'clients': n, 'cold': cold, 'warm': warm, 'blockedHosts': hosts}


def main():
    sizes = [int(a) for a in sys.argv[1:]] or [10, 50, 100, 200]
    OUT.mkdir(exist_ok=True)
    results = []
    with sync_playwright() as pw:
        for n in sizes:
            r = measure(n, pw)
            results.append(r)
            for k in ('cold', 'warm'):
                x = r[k]
                print(f"{n:>4} clients · {x['run']:<28} dashboard {x['dashboardShownMs']:>6} ms · data shown {x['allDataShownMs']:>6} ms · from server {x['allDataFromServerMs']:>6} ms · "
                      f"{x['docsLoaded']:>6} docs · {x['downloadedMB']:>6} MB · {x['openListeners']:>4} listeners · heap {x['heapMB']} MB", flush=True)
            if r['blockedHosts']:
                print('      blocked (never reached):', ', '.join(r['blockedHosts']), flush=True)
    (OUT / 'latest.json').write_text(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
