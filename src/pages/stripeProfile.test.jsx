// @vitest-environment jsdom
//
// B49 Stripe, the app side, driven through the real Profile page and plan card:
//   - Ani pastes ElitePro's Stripe keys (owner only);
//   - once Stripe is set up, a coach sets it up for their own business instead of GoCardless;
//   - a client of a Stripe coach is sent to Stripe, in the coach's currency.
// Firebase is replaced (#38); the server half is functions/test/stripe.test.js.

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

const COACH = { id: 'coachUid0000000001', name: 'Coach', email: 'coach@example.test', role: 'trainer', inviteCode: 'ABC123', currency: 'HKD', planPrices: { weekly: 1700 } };
const ANI = { ...COACH, email: 'aniho20@gmail.com', currency: 'GBP' };
const CLIENT = { id: 'clientUid000000001', name: 'Client', role: 'client', trainerId: COACH.id, subscriptionTester: true };

let app;
function makeApp(over = {}) {
  return {
    currentUser: COACH, firebaseUser: { uid: COACH.id, providerData: [] }, setLanguage: vi.fn(), data: { users: [] },
    updateClient: vi.fn(), logout: vi.fn(), sendPasswordReset: vi.fn(), getInviteCode: vi.fn(async () => 'ABC123'),
    connectToTrainer: vi.fn(), getClient: () => undefined, deleteAccount: vi.fn(), getExercises: () => [],
    getPaymentConnection: vi.fn(async () => null), startGcConnect: vi.fn(), disconnectGc: vi.fn(), connectGcDirect: vi.fn(),
    // Full history always loaded in this fake (B76: watchClientHistory in AppContext).
    watchClientHistory: () => () => {}, historyComplete: () => true, historyStart: () => null, extendScheduleTo: () => {},
    getClients: () => [], getSchedule: () => [], getClientErrors: vi.fn(async () => []), getPlatformStats: vi.fn(async () => null),
    updateExercise: vi.fn(), getSubscriptions: vi.fn(async () => []), startSubscription: vi.fn(), refreshSubscription: vi.fn(), cancelSubscription: vi.fn(),
    getStripeStatus: vi.fn(async () => ({ configured: true, environment: 'sandbox' })),
    saveStripeKeys: vi.fn(async () => ({ environment: 'sandbox' })),
    startStripeConnect: vi.fn(async () => ({ url: 'https://connect.stripe.com/setup/x' })),
    refreshStripeConnection: vi.fn(async () => ({ status: 'connected' })),
    startStripeSubscription: vi.fn(async () => ({ url: 'https://checkout.stripe.com/x' })),
    refreshStripeSubscription: vi.fn(async () => ({ status: 'active' })),
    ...over,
  };
}

const renderProfile = (path = '/profile') => render(
  <AppContext.Provider value={app}>
    <ThemeProvider><LanguageProvider><ToastProvider>
      <MemoryRouter initialEntries={[path]}><ProfilePage /></MemoryRouter>
    </ToastProvider></LanguageProvider></ThemeProvider>
  </AppContext.Provider>,
);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); // jsdom: "navigation not implemented"
  app = makeApp();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Ani’s Stripe keys', () => {
  test('only the owner gets the card; the keys reach the server as pasted', async () => {
    app = makeApp({ currentUser: ANI, getStripeStatus: vi.fn(async () => ({ configured: false, environment: null })) });
    renderProfile();
    expect(await screen.findByText('Stripe for ElitePro')).toBeTruthy();
    expect(screen.getByText('https://us-central1-elitepro-16718.cloudfunctions.net/stripeWebhook')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Secret key/), { target: { value: 'sk_test_abcdefghijk' } });
    fireEvent.change(screen.getByLabelText(/Signing secret/), { target: { value: 'whsec_abcdefghijk' } });
    fireEvent.click(screen.getByRole('button', { name: /Save keys/ }));
    await waitFor(() => expect(app.saveStripeKeys).toHaveBeenCalledWith({ secretKey: 'sk_test_abcdefghijk', webhookSecret: 'whsec_abcdefghijk' }));
    expect(await screen.findByText('Saved — Stripe is in test mode.')).toBeTruthy();
  });
  test('another coach never sees it', async () => {
    renderProfile();
    await screen.findByText('Monthly plans');
    expect(screen.queryByText('Stripe for ElitePro')).toBeNull();
  });
});

describe('a coach and Stripe', () => {
  test('Stripe set up: the Stripe card replaces GoCardless; only the UK is offered while Hong Kong is parked', async () => {
    renderProfile();
    expect(await screen.findByText('Monthly plans')).toBeTruthy();
    expect(screen.queryByText(/GoCardless/)).toBeNull();
    // Even a coach whose currency is HKD sets up in the UK — no country to pick (Ani 2026-10-15).
    fireEvent.click(await screen.findByRole('button', { name: /Set up with Stripe/ }));
    await waitFor(() => expect(app.startStripeConnect).toHaveBeenCalledWith('GB'));
    expect(screen.queryByLabelText('Where your business is')).toBeNull();
  });
  test('Stripe not set up yet: the GoCardless card stays as it was', async () => {
    app = makeApp({ getStripeStatus: vi.fn(async () => ({ configured: false, environment: null })) });
    renderProfile();
    await waitFor(() => expect(app.getStripeStatus).toHaveBeenCalled());
    expect(screen.queryByText('Monthly plans')).toBeNull();
  });
  test('back from Stripe: Stripe is asked, and a ready account shows the plan price in the coach’s currency', async () => {
    app = makeApp({
      getPaymentConnection: vi.fn()
        .mockResolvedValueOnce({ stripe: { accountId: 'acct_1', status: 'onboarding', country: 'HK', environment: 'sandbox' } })
        .mockResolvedValue({ stripe: { accountId: 'acct_1', status: 'connected', country: 'HK', environment: 'sandbox' } }),
    });
    renderProfile('/profile?stripe=return');
    await waitFor(() => expect(app.refreshStripeConnection).toHaveBeenCalled());
    expect(await screen.findByText('Stripe is ready — your clients can now choose a monthly plan.')).toBeTruthy();
    expect(await screen.findByText('Test mode')).toBeTruthy();
    // B84: the coach's own monthly prices, in their currency — an HKD coach starts blank, never £.
    expect(screen.getByText('Monthly plan prices (HKD)')).toBeTruthy();
    expect(screen.getByLabelText(/One session a week/).value).toBe('1700');
    expect(screen.getByLabelText(/Two sessions a week/).value).toBe('');
  });
  test('B79: a UK account with prices in HKD is told to change the currency', async () => {
    app = makeApp({ getPaymentConnection: vi.fn(async () => ({ stripe: { accountId: 'acct_1', status: 'connected', country: 'GB', environment: 'sandbox' } })) });
    renderProfile();
    expect(await screen.findByText(/Your Stripe account charges in GBP/)).toBeTruthy();
  });
  test('B79: matching currency: no warning', async () => {
    app = makeApp({ currentUser: ANI, getPaymentConnection: vi.fn(async () => ({ stripe: { accountId: 'acct_1', status: 'connected', country: 'GB', environment: 'sandbox' } })) });
    renderProfile();
    expect(await screen.findByText(/Plans are charged in GBP/)).toBeTruthy();
    expect(screen.queryByText(/Your Stripe account charges in/)).toBeNull();
  });
  test('still being checked: says so, and Check again asks Stripe', async () => {
    app = makeApp({
      getPaymentConnection: vi.fn(async () => ({ stripe: { accountId: 'acct_1', status: 'onboarding', country: 'GB', environment: 'sandbox' } })),
      refreshStripeConnection: vi.fn(async () => ({ status: 'onboarding' })),
    });
    renderProfile();
    expect(await screen.findByText(/Stripe is still checking your details/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Check again/ }));
    expect(await screen.findByText('Stripe has not finished checking your details yet.')).toBeTruthy();
  });
});

describe('a coach sets the monthly plan prices (B84)', () => {
  const ukReady = () => vi.fn(async () => ({ stripe: { accountId: 'acct_1', status: 'connected', country: 'GB', environment: 'sandbox' } }));
  test('a GBP coach who never saved sees £150 / £280 / £540 filled in; blank saves as not offered', async () => {
    app = makeApp({ currentUser: { ...ANI, planPrices: undefined }, getPaymentConnection: ukReady() });
    renderProfile();
    expect(await screen.findByText('Monthly plan prices (GBP)')).toBeTruthy();
    expect(screen.getByLabelText(/One session every two weeks/).value).toBe('150');
    expect(screen.getByLabelText(/One session a week/).value).toBe('280');
    expect(screen.getByLabelText(/Two sessions a week/).value).toBe('540');
    fireEvent.change(screen.getByLabelText(/Two sessions a week/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/One session a week/), { target: { value: '275.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save plan prices' }));
    await waitFor(() => expect(app.updateClient).toHaveBeenCalledWith(ANI.id, { planPrices: { fortnightly: 150, weekly: 275.5, twice_weekly: null } }));
  });
  test('a saved choice is shown as saved, not replaced by the defaults', async () => {
    app = makeApp({ currentUser: { ...ANI, planPrices: { fortnightly: null, weekly: 300, twice_weekly: null } }, getPaymentConnection: ukReady() });
    renderProfile();
    expect((await screen.findByLabelText(/One session a week/)).value).toBe('300');
    expect(screen.getByLabelText(/One session every two weeks/).value).toBe('');
  });
  test('zero or text is refused before anything is written', async () => {
    app = makeApp({ currentUser: { ...ANI, planPrices: undefined }, getPaymentConnection: ukReady() });
    renderProfile();
    fireEvent.change(await screen.findByLabelText(/One session a week/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save plan prices' }));
    expect(await screen.findByText('Enter a price above zero, or leave it blank')).toBeTruthy();
    expect(app.updateClient).not.toHaveBeenCalled();
  });
});

describe('a client of a Stripe coach', () => {
  const stripeCoach = { ...COACH, stripeEnvironment: 'sandbox' };
  test('sees Stripe wording and HKD prices, and is sent to Stripe — not GoCardless', async () => {
    app = makeApp({ currentUser: CLIENT, firebaseUser: { uid: CLIENT.id, providerData: [] }, data: { users: [stripeCoach] }, getClient: () => stripeCoach });
    renderProfile();
    expect(await screen.findByText(/Payment is taken automatically every month through Stripe/)).toBeTruthy();
    expect(screen.getAllByText(/HKD /).length).toBeGreaterThan(0);
    expect(screen.queryByText(/GoCardless/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(app.startStripeSubscription).toHaveBeenCalledWith('weekly'));
    expect(app.startSubscription).not.toHaveBeenCalled();
  });
  test('a Stripe plan still being confirmed is checked with Stripe', async () => {
    app = makeApp({
      currentUser: CLIENT, firebaseUser: { uid: CLIENT.id, providerData: [] }, data: { users: [stripeCoach] }, getClient: () => stripeCoach,
      getSubscriptions: vi.fn(async () => [{ id: 'plan000001', status: 'pending', provider: 'stripe', plan: 'weekly', monthlyAmount: 1700, currency: 'HKD' }]),
    });
    renderProfile();
    expect(await screen.findByText('Waiting for Stripe to confirm your payment.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Check again/ }));
    await waitFor(() => expect(app.refreshStripeSubscription).toHaveBeenCalledWith('plan000001'));
    expect(app.refreshSubscription).not.toHaveBeenCalled();
  });
});
