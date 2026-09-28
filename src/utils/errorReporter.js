import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Sends the app's own crashes to the reportClientError function (functions/clientErrors.js),
// which groups them and tells Ani. Before this, a white screen on a student's phone was
// invisible unless the student said something (production audit 2026-09-28).
//
// Imported by main.jsx and ErrorBoundary rather than going through AppContext (#1): the
// errors worth catching most include the ones that happen before AppProvider exists, or
// that take it down.
//
// Never throws, never retries, and sends each distinct error once per page load, at most
// MAX_PER_LOAD in all — a reporter that loops on its own failure is worse than none.

const MAX_PER_LOAD = 10;
const sent = new Set();

// Errors that are not ours to fix and would only bury the ones that are. Kept short and
// explicit: anything not listed is reported.
const NOISE = [
  /ResizeObserver loop/i, // a browser layout warning, harmless
  /^Script error\.?$/i, // cross-origin script with no detail — nothing to act on
];
const FROM_EXTENSION = /(chrome|moz|safari(-web)?)-extension:\/\//i;

/* global __APP_BUILD__ */ // set by vite.config.js `define`
const build = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '';

function describe(error) {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack || '' };
  if (error && typeof error === 'object' && 'message' in error) {
    return { message: String(error.message), stack: String(error.stack || '') };
  }
  return { message: String(error), stack: '' };
}

// The send itself; replaced in tests.
let transport = (payload) => httpsCallable(functions, 'reportClientError')(payload);
export function __setTransport(fn) { transport = fn; }
export function __reset() { sent.clear(); }

export function reportError(error, source = 'window', extraStack = '') {
  try {
    const { message, stack } = describe(error);
    if (!message || NOISE.some(re => re.test(message))) return false;
    if (FROM_EXTENSION.test(stack)) return false;
    // AbortError is a user cancelling something (a share sheet, a fetch) — not a bug.
    if (error && error.name === 'AbortError') return false;

    const key = `${source}|${message}`;
    if (sent.has(key) || sent.size >= MAX_PER_LOAD) return false;
    sent.add(key);

    Promise.resolve()
      .then(() => transport({
        message,
        stack: extraStack ? `${stack}\n\nComponent stack:${extraStack}` : stack,
        source,
        url: window.location.href,
        userAgent: navigator.userAgent,
        build,
      }))
      .catch(() => {}); // offline, or the function is down: nothing useful to do
    return true;
  } catch {
    return false;
  }
}

export function installErrorReporting(target = window) {
  target.addEventListener('error', (event) => {
    // A failed <img>/<script> load fires 'error' with no Error attached; only report real
    // script errors.
    if (event.error || event.message) reportError(event.error || event.message, 'window');
  });
  target.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'promise');
  });
}
