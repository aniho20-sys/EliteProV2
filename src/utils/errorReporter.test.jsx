// @vitest-environment jsdom
//
// Error monitoring, app side (production audit 2026-09-28, High-value 1). Firebase is
// replaced; nothing reaches a real project (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
const callable = vi.hoisted(() => ({ names: [] }));
vi.mock('firebase/functions', () => ({
  httpsCallable: (_f, name) => { callable.names.push(name); return async () => ({ data: { ok: true } }); },
}));

const { reportError, installErrorReporting, __setTransport, __reset } = await import('./errorReporter');
const { default: ErrorBoundary } = await import('../components/ErrorBoundary');

let sent;
const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  __reset();
  sent = [];
  __setTransport(async (payload) => { sent.push(payload); });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('reportError', () => {
  test('sends the error, where it happened, and which build', async () => {
    reportError(new TypeError("Cannot read properties of undefined (reading 'name')"), 'boundary');
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      message: "TypeError: Cannot read properties of undefined (reading 'name')",
      source: 'boundary',
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
    expect(sent[0].stack).toContain('TypeError');
    expect(typeof sent[0].build).toBe('string');
  });

  test('the same error twice in one visit is sent once', async () => {
    reportError(new Error('boom'));
    reportError(new Error('boom'));
    await flush();
    expect(sent).toHaveLength(1);
  });

  test('at most ten reports per visit, however many different errors', async () => {
    for (let i = 0; i < 25; i++) reportError(new Error(`bug ${i}`));
    await flush();
    expect(sent).toHaveLength(10);
  });

  test('browser noise, extensions and cancelled actions are not reported', async () => {
    reportError(new Error('ResizeObserver loop completed with undelivered notifications.'));
    reportError('Script error.');
    const ext = new Error('from an extension');
    ext.stack = 'Error\n    at chrome-extension://abc/content.js:1:1';
    reportError(ext);
    reportError(Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' }));
    await flush();
    expect(sent).toEqual([]);
  });

  test('a report that cannot be sent is dropped quietly, never thrown', async () => {
    __setTransport(async () => { throw new Error('offline'); });
    expect(() => reportError(new Error('boom'))).not.toThrow();
    await flush();
  });

  test('non-Error values still arrive readable', async () => {
    reportError({ message: 'firestore said no', stack: 's' }, 'promise');
    reportError('plain string');
    await flush();
    expect(sent.map(s => s.message)).toEqual(['firestore said no', 'plain string']);
  });
});

describe('installErrorReporting', () => {
  test('catches uncaught errors and unhandled promise rejections', async () => {
    const target = new EventTarget();
    installErrorReporting(target);
    const err = new Error('uncaught');
    target.dispatchEvent(Object.assign(new Event('error'), { error: err, message: err.message }));
    target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('rejected') }));
    await flush();
    expect(sent.map(s => [s.source, s.message])).toEqual([
      ['window', 'Error: uncaught'],
      ['promise', 'Error: rejected'],
    ]);
  });

  test('a failed image load is not a script error', async () => {
    const target = new EventTarget();
    installErrorReporting(target);
    target.dispatchEvent(new Event('error'));
    await flush();
    expect(sent).toEqual([]);
  });
});

describe('ErrorBoundary', () => {
  function Broken() { throw new Error('render crash'); }

  test('a white screen is reported, with the component stack', async () => {
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ source: 'boundary', message: 'Error: render crash' });
    expect(sent[0].stack).toContain('Component stack:');
    expect(sent[0].stack).toContain('Broken');
  });
});

test('the real transport calls the function the server exports', async () => {
  // A fresh copy of the module, so its default transport is in place rather than the stub.
  vi.resetModules();
  const fresh = await import('./errorReporter');
  fresh.reportError(new Error('via default transport'));
  await flush();
  expect(callable.names).toContain('reportClientError');
  expect(readFileSync(join(cwd(), 'functions/index.js'), 'utf8'))
    .toMatch(/^exports\.reportClientError = functions\.https\.onCall/m);
});
