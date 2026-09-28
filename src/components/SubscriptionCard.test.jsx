// @vitest-environment jsdom
//
// The student's monthly-plan card (Phase 3 Step 3), driven as a student would.
//
// B13: Ani chose tests over a device run for this flow (2026-09-28). The part no test here
// can reach is GoCardless's own hosted page; everything on our side of it is covered:
// who sees the card, the prices shown, tapping Subscribe, every outcome the return
// endpoint can send back, and "Check again". Server logic is covered separately in
// functions/test/gcSubscriptions.test.js. Firebase is replaced; nothing reaches a real
// project (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const fb = vi.hoisted(() => ({ callable: null }));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/firestore', () => {
  const token = (...args) => ({ args });
  return {
    collection: token, query: token, where: token, or: token, orderBy: token, doc: token,
    onSnapshot: () => () => {},
    setDoc: vi.fn(), updateDoc: vi.fn(), addDoc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(),
    deleteDoc: vi.fn(), writeBatch: vi.fn(), runTransaction: vi.fn(),
  };
});
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => { cb({ uid: 'c1', email: 'c1@example.test' }); return () => {}; },
  getRedirectResult: () => Promise.resolve(null),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(), signOut: vi.fn(), deleteUser: vi.fn(),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: (_functions, name) => (payload) => fb.callable(name, payload),
}));

const { AppContext, AppProvider, useApp } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: SubscriptionCard } = await import('./SubscriptionCard');

const source = (rel) => readFileSync(join(cwd(), rel), 'utf8');

// ── Harness: the card with a stubbed context, inside a router at /profile ──

const TRAINER = { id: 't1', role: 'trainer', name: 'Ani', subscriptionRate: 50 };
const STUDENT = { id: 'c1', role: 'client', trainerId: 't1', subscriptionTester: true };

let ctx;
let lastLocation;
function LocationSpy() { lastLocation = useLocation(); return null; }

function renderCard({ student = STUDENT, trainer = TRAINER, url = '/profile' } = {}) {
  ctx = {
    ...ctx,
    currentUser: student,
    data: { users: [student, ...(trainer ? [trainer] : [])] },
    setLanguage: vi.fn(),
  };
  return render(
    <AppContext.Provider value={ctx}>
      <LanguageProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[url]}>
            <Routes><Route path="/profile" element={<><SubscriptionCard /><LocationSpy /></>} /></Routes>
          </MemoryRouter>
        </ToastProvider>
      </LanguageProvider>
    </AppContext.Provider>,
  );
}

const pending = { id: 'sub12345678', status: 'pending', tier: 8, monthlyAmount: 433.33 };
const active = { id: 'sub12345678', status: 'active', tier: 8, monthlyAmount: 433.33 };

beforeEach(() => {
  ctx = {
    getSubscriptions: vi.fn(async () => []),
    startSubscription: vi.fn(async () => ({ subscriptionId: 'sub12345678', url: 'about:blank' })),
    refreshSubscription: vi.fn(async () => ({ status: 'pending' })),
  };
  // Tapping Subscribe sends the browser to GoCardless; jsdom cannot navigate, and says so.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// ── Who sees it ──

describe('who sees the monthly plan card', () => {
  test('a student their coach marked as tester', async () => {
    renderCard();
    expect(await screen.findByText('Monthly plan')).toBeTruthy();
    expect(screen.getByText('Test mode — no real money is taken')).toBeTruthy();
  });

  test.each([
    ['a student not marked as tester', { student: { ...STUDENT, subscriptionTester: false } }],
    ['a student with no coach', { student: { ...STUDENT, trainerId: null }, trainer: null }],
    ['a coach with no plan rate', { trainer: { ...TRAINER, subscriptionRate: undefined } }],
    ['a coach invoicing in another currency', { trainer: { ...TRAINER, currency: 'HKD' } }],
  ])('not %s', (_label, opts) => {
    const { container } = renderCard(opts);
    expect(container.textContent).toBe('');
    expect(ctx.getSubscriptions).not.toHaveBeenCalled();
  });
});

// ── Choosing and subscribing ──

describe('choosing a plan', () => {
  test("prices come from the coach's rate, over 52 weeks", async () => {
    renderCard();
    // £50 × 4 × 13 / 12 = £216.67; × 8 = £433.33; × 12 = £650.00
    expect(await screen.findByText('GBP 216.67/month')).toBeTruthy();
    expect(screen.getByText('GBP 433.33/month')).toBeTruthy();
    expect(screen.getByText('GBP 650.00/month')).toBeTruthy();
  });

  test('the chosen tier is what is sent, and the button cannot be tapped twice', async () => {
    renderCard();
    fireEvent.click(await screen.findByText('12 sessions a month'));
    fireEvent.click(screen.getByText('Set up Direct Debit with GoCardless'));

    await waitFor(() => expect(ctx.startSubscription).toHaveBeenCalledWith(12));
    const busy = await screen.findByText('Opening GoCardless…');
    expect(busy.closest('button').disabled).toBe(true);
    fireEvent.click(busy);
    expect(ctx.startSubscription).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['functions/already-exists', 'You already have a monthly plan.'],
    ['functions/failed-precondition', 'Your coach has not finished setting up monthly plans yet.'],
    ['functions/unavailable', 'Something went wrong setting up the plan. Please try again.'],
  ])('a refusal (%s) is explained, and the button works again', async (code, message) => {
    ctx.startSubscription = vi.fn(async () => { throw Object.assign(new Error('no'), { code }); });
    renderCard();
    fireEvent.click(await screen.findByText('Set up Direct Debit with GoCardless'));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText('Set up Direct Debit with GoCardless').closest('button').disabled).toBe(false);
  });
});

// ── Back from GoCardless (gcSubscriptionReturn redirects to #/profile?sub=<status>) ──

describe('coming back from GoCardless', () => {
  test('active: says so, shows the plan, and clears the address', async () => {
    ctx.getSubscriptions = vi.fn(async () => [active]);
    renderCard({ url: '/profile?sub=active' });
    expect(await screen.findByText('Your monthly plan is active.')).toBeTruthy();
    expect(await screen.findByText('Your plan: 8 sessions a month · GBP 433.33/month')).toBeTruthy();
    await waitFor(() => expect(lastLocation.search).toBe(''));
  });

  test.each([
    ['pending', 'GoCardless is still confirming — check again in a minute.'],
    ['completing', 'GoCardless is still confirming — check again in a minute.'],
    ['abandoned', 'The Direct Debit setup was not completed.'],
    ['exit', 'The Direct Debit setup was not completed.'],
    ['failed', 'Something went wrong setting up the plan. Please try again.'],
    ['unknown', 'Something went wrong setting up the plan. Please try again.'],
  ])('%s', async (sub, message) => {
    renderCard({ url: `/profile?sub=${sub}` });
    expect(await screen.findByText(message)).toBeTruthy();
  });

  test('every status the server can send back is one the card handles', () => {
    // completeSubscription returns these (functions/gcSubscriptions.js), the return
    // endpoint falls back to 'pending' on error, and the exit URL says 'exit'.
    const server = source('functions/gcSubscriptions.js');
    const returned = new Set([...server.matchAll(/return \{ status: '(\w+)'/g)].map(m => m[1]));
    returned.delete('claimed'); // internal to the transaction, never returned to the caller
    const card = source('src/components/SubscriptionCard.jsx');
    for (const status of returned) {
      const named = card.includes(`'${status}'`);
      // Anything not named falls to the generic failure toast — acceptable only for these.
      if (!named) expect(['unknown', 'failed']).toContain(status);
    }
    expect(source('functions/index.js')).toContain("const PROFILE_URL = 'https://elitepro-16718.web.app/#/profile'");
  });
});

// ── A plan GoCardless has not confirmed yet ──

describe('check again', () => {
  test('asks the server about this subscription and shows the result', async () => {
    ctx.getSubscriptions = vi.fn()
      .mockResolvedValueOnce([pending])
      .mockResolvedValue([active]);
    ctx.refreshSubscription = vi.fn(async () => ({ status: 'active' }));
    renderCard();

    fireEvent.click(await screen.findByText('Check again'));
    await waitFor(() => expect(ctx.refreshSubscription).toHaveBeenCalledWith('sub12345678'));
    expect(await screen.findByText('Your monthly plan is active.')).toBeTruthy();
    expect(await screen.findByText('Active')).toBeTruthy();
  });

  test('GoCardless refusing is not reported as "still confirming"', async () => {
    ctx.getSubscriptions = vi.fn()
      .mockResolvedValueOnce([pending])
      .mockResolvedValue([{ ...pending, status: 'failed' }]);
    ctx.refreshSubscription = vi.fn(async () => ({ status: 'failed' }));
    renderCard();

    fireEvent.click(await screen.findByText('Check again'));
    expect(await screen.findByText('Something went wrong setting up the plan. Please try again.')).toBeTruthy();
    expect(screen.queryByText('GoCardless is still confirming — check again in a minute.')).toBeNull();
    // The failed plan is history; the student can choose again.
    expect(await screen.findByText('Set up Direct Debit with GoCardless')).toBeTruthy();
  });
});

// ── The app's calls match what the server reads ──

describe('AppContext → server', () => {
  let api;
  function Grab() { api = useApp(); return null; }

  test('subscribe and check-again call the exported functions with the fields they read', async () => {
    const calls = [];
    fb.callable = vi.fn(async (name, payload) => { calls.push([name, payload]); return { data: {} }; });
    render(<AppProvider><Grab /></AppProvider>);
    await waitFor(() => expect(api.firebaseUser).toBeTruthy());

    await api.startSubscription(8);
    await api.refreshSubscription('sub12345678');
    expect(calls).toEqual([
      ['gcStartSubscription', { tier: 8 }],
      ['gcRefreshSubscription', { subscriptionId: 'sub12345678' }],
    ]);

    const server = source('functions/index.js');
    expect(server).toMatch(/^exports\.gcStartSubscription = functions\.https\.onCall/m);
    expect(server).toMatch(/^exports\.gcRefreshSubscription = functions\.https\.onCall/m);
    expect(server).toContain('tier: data && data.tier');
    expect(server).toContain('(data && data.subscriptionId)');
  });
});
