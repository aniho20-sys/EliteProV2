// @vitest-environment jsdom
//
// A page file gone after a deploy reloads the app instead of showing an error — the first
// error the error monitoring caught (Ani's iPhone, 2026-09-29 00:02, clientErrors/63aadf66…).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Component, Suspense } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { lazyPage, isStaleChunkError, installStaleChunkRecovery } from './lazyPage';

// Exactly what Safari reported.
const FROM_ANIS_PHONE = new TypeError(
  "'text/html' is not a valid JavaScript MIME type for module script 'https://elitepro-16718.web.app/assets/SchedulePage--mWaGxgi.js'.",
);

class Catch extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <p>{`caught: ${this.state.error.message}`}</p> : this.props.children; }
}

let win;
beforeEach(() => {
  sessionStorage.clear();
  win = { sessionStorage, location: { reload: vi.fn() }, addEventListener: window.addEventListener.bind(window) };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function renderPage(load) {
  const Page = lazyPage(load, win);
  return render(<Catch><Suspense fallback={<p>loading</p>}><Page /></Suspense></Catch>);
}
const tick = () => new Promise(r => setTimeout(r, 0));

describe('isStaleChunkError', () => {
  test.each([
    FROM_ANIS_PHONE,
    new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'),
    new TypeError('error loading dynamically imported module'),
    new TypeError('Importing a module script failed.'),
  ])('%s', (err) => expect(isStaleChunkError(err)).toBe(true));

  test('an ordinary bug is not one', () => {
    expect(isStaleChunkError(new TypeError("Cannot read properties of undefined (reading 'name')"))).toBe(false);
  });
});

describe('lazyPage', () => {
  test('a page that loads is shown', async () => {
    renderPage(async () => ({ default: () => <p>schedule</p> }));
    expect(await screen.findByText('schedule')).toBeTruthy();
    expect(win.location.reload).not.toHaveBeenCalled();
  });

  test("the old version's file is gone: reload once, no error screen", async () => {
    renderPage(async () => { throw FROM_ANIS_PHONE; });
    await tick(); await tick();
    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/caught:/)).toBeNull();
  });

  test('still failing right after that reload: the error shows, no loop', async () => {
    sessionStorage.setItem('elitepro_stale_chunk_reload', String(Date.now()));
    renderPage(async () => { throw FROM_ANIS_PHONE; });
    expect(await screen.findByText(/caught: 'text\/html'/)).toBeTruthy();
    expect(win.location.reload).not.toHaveBeenCalled();
  });

  test('a real bug in a page is not hidden behind a reload', async () => {
    renderPage(async () => { throw new TypeError('boom'); });
    expect(await screen.findByText('caught: boom')).toBeTruthy();
    expect(win.location.reload).not.toHaveBeenCalled();
  });
});

test("Vite's preload failure reloads too, instead of throwing", () => {
  const target = new EventTarget();
  const w = { sessionStorage, location: { reload: vi.fn() }, addEventListener: target.addEventListener.bind(target) };
  installStaleChunkRecovery(w);
  const event = new Event('vite:preloadError', { cancelable: true });
  target.dispatchEvent(event);
  expect(w.location.reload).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
});
