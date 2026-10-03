// @vitest-environment jsdom
//
// B36: a coach connects their own GoCardless account from Profile — copy the webhook
// address, paste the webhook secret and an access token, tap Connect. Driven through the
// real Profile page. Firebase is replaced (#38); the server half is functions/test/gcDirect.test.js.

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// jsdom has no matchMedia; the theme and device checks ask it.
window.matchMedia = window.matchMedia || ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn(async () => ({ data: {} })) }));
vi.mock('firebase/auth', () => ({
  reauthenticateWithPopup: vi.fn(), reauthenticateWithCredential: vi.fn(),
  GoogleAuthProvider: class {}, EmailAuthProvider: { credential: vi.fn() },
}));
vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({ permission: 'default', supported: false, requestPermission: vi.fn(), token: null }),
}));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { ThemeProvider } = await import('../context/ThemeContext');
const { default: ProfilePage } = await import('./ProfilePage');

const COACH = { id: 'coachUid0000000001', name: 'Ani Ho', email: 'ani@example.test', role: 'trainer', inviteCode: 'ANI123', currency: 'GBP' };
const WEBHOOK_URL = 'https://us-central1-elitepro-16718.cloudfunctions.net/gcWebhook/coachUid0000000001';

let app;
function makeApp(over = {}) {
  return {
    currentUser: COACH, firebaseUser: { uid: COACH.id, providerData: [] }, setLanguage: vi.fn(),
    updateClient: vi.fn(), logout: vi.fn(), sendPasswordReset: vi.fn(), getInviteCode: vi.fn(async () => 'ANI123'),
    connectToTrainer: vi.fn(), getClient: () => undefined, deleteAccount: vi.fn(), getExercises: () => [],
    getPaymentConnection: vi.fn(async () => ({ status: 'connected', environment: 'sandbox', connectedAt: '2026-09-23T10:00:00Z' })),
    startGcConnect: vi.fn(), disconnectGc: vi.fn(),
    connectGcDirect: vi.fn(async () => ({ environment: 'live', creditorName: "Ani's Studio", verificationStatus: 'successful' })),
    getClients: () => [], getSubscriptions: vi.fn(async () => []), getClientErrors: vi.fn(async () => []),
    getPlatformStats: vi.fn(async () => null), updateExercise: vi.fn(),
    ...over,
  };
}

function renderProfile() {
  return render(
    <AppContext.Provider value={app}>
      <ThemeProvider><LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={['/profile']}><ProfilePage /></MemoryRouter>
      </ToastProvider></LanguageProvider></ThemeProvider>
    </AppContext.Provider>,
  );
}

let copied;
beforeEach(() => {
  copied = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (s) => { copied.push(s); } } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  app = makeApp();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openForm() {
  renderProfile();
  fireEvent.click(await screen.findByRole('button', { name: 'Use your own GoCardless account' }));
}
const secretInput = () => screen.getByLabelText(/Copy that webhook's secret/);
const tokenInput = () => screen.getByLabelText(/Create → Access token/);
const connectBtn = () => screen.getByRole('button', { name: /Connect my account/ });

describe('connecting your own GoCardless account', () => {
  test('offered even while connected to sandbox, so it can be switched to live', async () => {
    await openForm();
    expect(screen.getByText(WEBHOOK_URL)).toBeTruthy();
  });

  test('the webhook address is this coach\'s own, and Copy copies exactly it', async () => {
    await openForm();
    fireEvent.click(screen.getAllByRole('button', { name: /^Copy$/ }).at(-1));
    await waitFor(() => expect(copied).toEqual([WEBHOOK_URL]));
  });

  test('Connect stays off until both values are pasted', async () => {
    await openForm();
    expect(connectBtn().disabled).toBe(true);
    fireEvent.change(secretInput(), { target: { value: 'whsec_0123456789abcdef' } });
    expect(connectBtn().disabled).toBe(true);
    fireEvent.change(tokenInput(), { target: { value: 'live_0123456789abcdefghij' } });
    expect(connectBtn().disabled).toBe(false);
  });

  test('both values reach the server as pasted, then the card shows the live connection', async () => {
    app.getPaymentConnection = vi.fn()
      .mockResolvedValueOnce({ status: 'connected', environment: 'sandbox' })
      .mockResolvedValue({ status: 'connected', mode: 'direct', environment: 'live', verificationStatus: 'successful' });
    await openForm();
    fireEvent.change(secretInput(), { target: { value: 'whsec_0123456789abcdef' } });
    fireEvent.change(tokenInput(), { target: { value: 'live_0123456789abcdefghij' } });
    fireEvent.click(connectBtn());
    await waitFor(() => expect(app.connectGcDirect).toHaveBeenCalledWith({
      accessToken: 'live_0123456789abcdefghij', webhookSecret: 'whsec_0123456789abcdef',
    }));
    expect(await screen.findByText('Connected to your GoCardless account')).toBeTruthy();
    // Connected directly: the offer disappears.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Use your own GoCardless account' })).toBeNull());
  });

  test('a token GoCardless refuses, and a pasted label, each get their own message', async () => {
    app.connectGcDirect = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('GoCardless did not accept this access token'), { code: 'functions/invalid-argument' }))
      .mockRejectedValueOnce(Object.assign(new Error('That does not look like an access token'), { code: 'functions/invalid-argument' }));
    await openForm();
    fireEvent.change(secretInput(), { target: { value: 'whsec_0123456789abcdef' } });
    fireEvent.change(tokenInput(), { target: { value: 'live_0123456789abcdefghij' } });
    fireEvent.click(connectBtn());
    expect(await screen.findByText(/didn't accept that access token/)).toBeTruthy();
    fireEvent.click(connectBtn());
    expect(await screen.findByText(/not its label/)).toBeTruthy();
    expect(tokenInput().value).toBe('live_0123456789abcdefghij'); // kept, so it can be fixed
  });

  test('an account GoCardless has not verified yet says so', async () => {
    app.connectGcDirect = vi.fn(async () => ({ environment: 'live', verificationStatus: 'in_review' }));
    await openForm();
    fireEvent.change(secretInput(), { target: { value: 'whsec_0123456789abcdef' } });
    fireEvent.change(tokenInput(), { target: { value: 'live_0123456789abcdefghij' } });
    fireEvent.click(connectBtn());
    expect((await screen.findAllByText(/still verifying your account/)).length).toBeGreaterThan(0);
  });
});

describe('the app and the server agree', () => {
  test('the address the app shows is one the server routes to this coach', async () => {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { webhookRoute } = require('../../functions/gcWebhooks.js');
    const { gcWebhookUrl, FUNCTIONS_BASE } = await import('../utils/gcLinks');
    const path = gcWebhookUrl(COACH.id).slice(`${FUNCTIONS_BASE}/gcWebhook`.length);
    expect(webhookRoute(path)).toEqual({ trainerId: COACH.id });
  });

  test('the callable the app calls is one the server exports', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { cwd } = await import('node:process');
    const server = readFileSync(join(cwd(), 'functions/index.js'), 'utf8');
    const appSrc = readFileSync(join(cwd(), 'src/context/AppContext.jsx'), 'utf8');
    expect(server).toMatch(/^exports\.gcConnectDirect = functions\.https\.onCall/m);
    expect(appSrc).toContain("httpsCallable(functions, 'gcConnectDirect')");
  });
});

describe('an own account GoCardless was still verifying', () => {
  const pendingConn = { status: 'connected', mode: 'direct', environment: 'live', verificationStatus: 'in_review' };

  test('verified since: Profile asks again and the notice goes', async () => {
    app.getPaymentConnection = vi.fn(async () => pendingConn);
    app.refreshGcConnection = vi.fn(async () => ({ verificationStatus: 'successful' }));
    renderProfile();
    await waitFor(() => expect(app.refreshGcConnection).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/still verifying your account/)).toBeNull());
  });

  test('still in review, or GoCardless unreachable: the notice stays and nothing breaks', async () => {
    app.getPaymentConnection = vi.fn(async () => pendingConn);
    app.refreshGcConnection = vi.fn(async () => { throw new Error('offline'); });
    renderProfile();
    expect(await screen.findByText(/still verifying your account/)).toBeTruthy();
  });

  test('already verified: GoCardless is not asked again', async () => {
    app.getPaymentConnection = vi.fn(async () => ({ ...pendingConn, verificationStatus: 'successful' }));
    app.refreshGcConnection = vi.fn();
    renderProfile();
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(app.refreshGcConnection).not.toHaveBeenCalled();
  });

  test('the refresh function the app calls is one the server exports', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { cwd } = await import('node:process');
    expect(readFileSync(join(cwd(), 'functions/index.js'), 'utf8')).toMatch(/^exports\.gcRefreshConnection = functions\.https\.onCall/m);
    expect(readFileSync(join(cwd(), 'src/context/AppContext.jsx'), 'utf8')).toContain("httpsCallable(functions, 'gcRefreshConnection')");
  });
});
