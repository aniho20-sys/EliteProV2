// @vitest-environment jsdom
//
// B25: Ani's view of the app's error reports. Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: ClientErrorsCard } = await import('./ClientErrorsCard');

const ERROR = {
  id: 'abc123',
  message: "TypeError: Cannot read properties of undefined (reading 'name')",
  count: 7,
  users: ['c1', 'c2', 'c3'],
  firstSeen: '2026-09-28T09:00:00.000Z',
  lastSeen: '2026-09-28T20:50:00.000Z',
  source: 'boundary',
  url: 'https://elitepro-16718.web.app/#/clients/xyz',
  userAgent: 'iPhone',
  build: '2026-09-28T21:00:00Z',
  stack: 'TypeError: …\n    at Xe (index.js:40:1234)',
};

let clipboard;
function renderCard(getClientErrors) {
  return render(
    <AppContext.Provider value={{ currentUser: { id: 'ani', role: 'trainer' }, setLanguage: vi.fn(), getClientErrors }}>
      <LanguageProvider><ToastProvider><ClientErrorsCard /></ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => {
  clipboard = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text) => { clipboard.push(text); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('app errors card', () => {
  test('lists each error with how often, how many accounts, and where', async () => {
    renderCard(async () => [ERROR]);
    expect(await screen.findByText(ERROR.message)).toBeTruthy();
    expect(screen.getByText(/Seen 7×/)).toBeTruthy();
    expect(screen.getByText(/Accounts affected: 3/)).toBeTruthy();
    expect(screen.getByText(ERROR.url)).toBeTruthy();
  });

  test('copy puts everything needed to fix it on the clipboard', async () => {
    renderCard(async () => [ERROR]);
    fireEvent.click(await screen.findByText('Copy for Claude'));
    await waitFor(() => expect(clipboard).toHaveLength(1));
    for (const part of [ERROR.message, ERROR.stack, ERROR.url, ERROR.build, 'clientErrors/abc123', 'Seen 7 time(s), 3 account(s)']) {
      expect(clipboard[0]).toContain(part);
    }
    expect(await screen.findByText('Copied!')).toBeTruthy();
  });

  test('no errors: says so, and says what will happen', async () => {
    renderCard(async () => []);
    expect(await screen.findByText('No errors reported')).toBeTruthy();
  });

  test('a failed load says so instead of looking empty', async () => {
    renderCard(async () => { throw Object.assign(new Error('no'), { code: 'permission-denied' }); });
    expect(await screen.findByText(/Could not load the error reports/)).toBeTruthy();
    expect(screen.queryByText('No errors reported')).toBeNull();
  });
});
