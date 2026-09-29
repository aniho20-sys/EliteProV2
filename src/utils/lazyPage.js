import { lazy } from 'react';

// React.lazy for the app's pages, which survives a deploy.
//
// Each page is a separate file whose name carries a content hash. A deploy replaces them
// all, and the service worker (registerType 'autoUpdate') swaps to the new version and
// clears the old cache while a page from the old version is still open. That page then
// asks for its old SchedulePage-<hash>.js, the file is gone, Hosting's catch-all rewrite
// answers with index.html, and the browser refuses HTML as a script — the first error the
// app's own error monitoring caught, on Ani's iPhone, 2026-09-29 00:02.
//
// The fix is the one the error calls for: load the new version. A page load that fails
// this way reloads the app once; if it fails again straight after, the error goes to the
// ErrorBoundary as before, so a real outage still shows (and is still reported) rather
// than looping.

const STALE_CHUNK = [
  /Failed to fetch dynamically imported module/i, // Chrome
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /is not a valid JavaScript MIME type/i, // Safari, when HTML came back instead
  /Unable to preload CSS/i, // Vite's own preload helper
];

export function isStaleChunkError(error) {
  const message = String(error?.message ?? error ?? '');
  return error?.name === 'ChunkLoadError' || STALE_CHUNK.some(re => re.test(message));
}

const RELOAD_KEY = 'elitepro_stale_chunk_reload';
const RETRY_WINDOW_MS = 10_000;

// Reloads unless a reload for this same reason happened moments ago. Returns whether it did.
export function reloadForNewVersion(win = window) {
  let last = 0;
  try { last = Number(win.sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* storage blocked */ }
  if (Date.now() - last < RETRY_WINDOW_MS) return false;
  try { win.sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage blocked */ }
  win.location.reload();
  return true;
}

export function lazyPage(load, win = typeof window !== 'undefined' ? window : undefined) {
  return lazy(() => load().catch((error) => {
    // Never settles: the page is about to be replaced by the reload.
    if (win && isStaleChunkError(error) && reloadForNewVersion(win)) return new Promise(() => {});
    throw error;
  }));
}

// Vite fires this when a page's supporting files (CSS, shared chunks) fail to preload —
// the same stale-version failure one step earlier.
export function installStaleChunkRecovery(win = window) {
  win.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion(win)) event.preventDefault();
  });
}
