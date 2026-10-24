// Load test only: firebase/firestore with onSnapshot counted, so measure.py can read how
// many listeners the app opened, when each first answered from the server (not the phone's
// cache), and how many documents each holds. Everything else is the real SDK.
export * from '@firebase/firestore';
import { onSnapshot as realOnSnapshot } from '@firebase/firestore';

const stats = (window.__loadTest = window.__loadTest || { listeners: [], start: performance.now() });

const nameOf = (ref) => {
  try {
    if (ref.type === 'document') return ref.path.split('/').slice(0, -1).join('/') || ref.path;
    const q = ref._query || ref;
    const path = q.path ? q.path.canonicalString() : (ref.path || '?');
    return path.split('/').filter((_, i) => i % 2 === 0).join('/');
  } catch { return '?'; }
};

export function onSnapshot(ref, ...rest) {
  const entry = { col: nameOf(ref), openedAt: performance.now(), firstAt: null, serverAt: null, docs: 0, error: null, updates: 0 };
  stats.listeners.push(entry);
  const idx = rest.findIndex(a => typeof a === 'function' || (a && typeof a.next === 'function'));
  const orig = rest[idx];
  const next = typeof orig === 'function' ? orig : orig.next.bind(orig);
  const errIdx = typeof orig === 'function' ? idx + 1 : -1;
  const wrappedNext = (snap) => {
    entry.updates += 1;
    const now = performance.now();
    if (entry.firstAt === null) entry.firstAt = now;
    if (entry.serverAt === null && !(snap.metadata && snap.metadata.fromCache)) entry.serverAt = now;
    entry.docs = snap.docs ? snap.docs.length : (snap.exists && snap.exists() ? 1 : 0);
    return next(snap);
  };
  const args = [...rest];
  if (typeof orig === 'function') {
    args[idx] = wrappedNext;
    const origErr = args[errIdx];
    args[errIdx] = (e) => { entry.error = String(e && e.code || e); const now = performance.now(); if (entry.firstAt === null) entry.firstAt = now; if (entry.serverAt === null) entry.serverAt = now; if (origErr) origErr(e); };
  } else {
    args[idx] = { ...orig, next: wrappedNext };
  }
  const unsub = realOnSnapshot(ref, ...args);
  return () => { entry.closedAt = performance.now(); unsub(); };
}
