// @vitest-environment jsdom
//
// B39 (2026-10-05): a new coach's first five minutes, made shorter. Driven through the real
// pages and components; Firebase is replaced (#38).
//   (1) the dashboard checklist stays until its four steps are really done
//   (2) one "Add sessions" sheet, price filled in, recorded in the ledger
//   (3) a coach's own booking is confirmed as it is made
//   (4) what a new coach cannot use is out of the way; one price is enough; the roll-over
//       and early-cancel rules are written where they apply

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

window.matchMedia = window.matchMedia || ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
window.scrollTo = () => {};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

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
const { default: SetupChecklist } = await import('../components/SetupChecklist');
const { setupSteps } = await import('../utils/setupSteps');
const { default: ClientDetailPage } = await import('./ClientDetailPage');
const { default: SchedulePage } = await import('./SchedulePage');
const { default: ProfilePage } = await import('./ProfilePage');
const { default: ExerciseLibraryPage } = await import('./ExerciseLibraryPage');
const { default: ClientDashboard } = await import('./ClientDashboard');
const { default: SubscriptionCard } = await import('../components/SubscriptionCard');

const NEW_COACH = { id: 'coach-1', name: 'Sam Coach', email: 'sam@example.test', role: 'trainer', currency: 'GBP' };
const READY_COACH = { ...NEW_COACH, inviteCode: 'SAM123', renewalRate: 50, bankDetails: { accountName: 'Sam', sortCode: '12-34-56', accountNumber: '12345678' } };
const CLIENT = { id: 'client-1', name: 'Jo Bloggs', role: 'client', trainerId: 'coach-1', joinDate: '2026-10-01' };

function base(over = {}) {
  const clients = over.clients || [];
  return {
    currentUser: NEW_COACH, firebaseUser: { uid: 'coach-1', providerData: [] }, setLanguage: vi.fn(),
    getClients: () => clients,
    getClient: (id) => clients.find(c => c.id === id) || (over.coach && over.coach.id === id ? over.coach : undefined),
    getSchedule: () => over.schedule || [],
    getInviteCode: vi.fn(async () => 'SAM123'),
    getBodyStats: () => [], getWorkoutPlans: () => [], getWorkoutLogs: () => [], getExercises: () => [],
    getSessionStats: () => ({ used: 0, total: null, remaining: null }),
    getIntakeForm: vi.fn(async () => null), getPersonalRecords: () => ({}),
    getTrainerBusySlots: () => [], refreshTrainerBusySlots: vi.fn(async () => {}), markMessagesRead: vi.fn(),
    getUnreadCount: () => 0, getMessages: () => [], getTrainerSubscriptions: vi.fn(async () => []),
    getSubscriptions: vi.fn(async () => []), getPaymentConnection: vi.fn(async () => null),
    getClientErrors: vi.fn(async () => []), getPlatformStats: vi.fn(async () => null),
    updateClient: vi.fn(async () => {}), addCreditLedgerEntry: vi.fn(async () => {}),
    addScheduleItem: vi.fn(async (item) => ({ ...item, id: 'sched-1' })), updateScheduleItem: vi.fn(), deleteScheduleItem: vi.fn(),
    addExercise: vi.fn(async (ex) => ({ ...ex, id: 'ex-1' })), updateExercise: vi.fn(), deleteExercise: vi.fn(),
    muscleGroups: ['Chest', 'Back', 'Legs'], equipmentTypes: ['Barbell', 'Dumbbell'],
    getExerciseOverride: () => null, upsertExerciseOverride: vi.fn(), deleteExerciseOverride: vi.fn(),
    sendMessage: vi.fn(), logout: vi.fn(), deleteAccount: vi.fn(), sendPasswordReset: vi.fn(),
    connectToTrainer: vi.fn(), startGcConnect: vi.fn(), disconnectGc: vi.fn(), connectGcDirect: vi.fn(),
    savePublicBooking: vi.fn(), data: { users: [] },
    ...over,
  };
}

let lastLocation;
function Where() { lastLocation = useLocation(); return null; }
function renderAt(path, routes, app) {
  return render(
    <AppContext.Provider value={app}>
      <ThemeProvider><LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Where />
          <Routes>{routes}<Route path="*" element={<div>elsewhere</div>} /></Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider></ThemeProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// ── (1) ──
describe('the dashboard setup checklist', () => {
  const card = (app) => renderAt('/', <Route path="/" element={<SetupChecklist />} />, app);

  test('a brand-new coach: four steps, none done, and their invite code on the first screen', async () => {
    const app = base();
    card(app);
    expect(screen.getByText('0 of 4 done')).toBeTruthy();
    for (const step of [/Add a client/, 'Set your price and bank details', 'Add sessions for a client', 'Book your first session']) {
      expect(screen.getByText(step)).toBeTruthy();
    }
    // No code on the profile yet → asked for, and shown.
    await waitFor(() => expect(app.getInviteCode).toHaveBeenCalledWith('coach-1'));
    expect(await screen.findByText('SAM123')).toBeTruthy();
  });

  test('stays after the first client is added — the old card vanished here', () => {
    card(base({ clients: [CLIENT] }));
    expect(screen.getByText('1 of 4 done')).toBeTruthy();
  });

  test('the price step needs a price and bank details, and takes the coach to the price card', () => {
    expect(setupSteps({ currentUser: { ...NEW_COACH, renewalRate: 50 }, clients: [], schedule: [] })[1].done).toBe(false);
    expect(setupSteps({ currentUser: READY_COACH, clients: [], schedule: [] })[1].done).toBe(true);
    card(base());
    fireEvent.click(screen.getByText('Set your price and bank details'));
    expect(lastLocation.pathname).toBe('/profile');
    expect(lastLocation.state).toEqual({ focus: 'pricing' });
  });

  test('the sessions step opens the first client without any', () => {
    card(base({ clients: [{ ...CLIENT, id: 'has', totalSessions: 10 }, { ...CLIENT, id: 'needs' }] }));
    // One client already has sessions, so this step is done — check the link target directly.
    const steps = setupSteps({ currentUser: NEW_COACH, clients: [{ ...CLIENT, id: 'needs' }], schedule: [] });
    expect(steps[2]).toMatchObject({ done: false, to: '/clients/needs' });
  });

  test('blocked time is not a booking', () => {
    expect(setupSteps({ currentUser: NEW_COACH, clients: [], schedule: [{ isBlocked: true, clientId: '' }] })[3].done).toBe(false);
    expect(setupSteps({ currentUser: NEW_COACH, clients: [], schedule: [{ clientId: 'c1' }] })[3].done).toBe(true);
  });

  test('all four done: no card at all', () => {
    const { container } = card(base({
      currentUser: READY_COACH,
      clients: [{ ...CLIENT, totalSessions: 10 }],
      schedule: [{ id: 's1', clientId: CLIENT.id, trainerId: 'coach-1', date: '2026-10-10', time: '10:00', status: 'confirmed' }],
    }));
    expect(container.querySelector('.card')).toBeNull();
  });
});

// ── (2) ──
describe('adding sessions for a client', () => {
  const page = (app) => renderAt(`/clients/${CLIENT.id}`, <Route path="/clients/:clientId" element={<ClientDetailPage />} />, app);

  test('a client with none yet: "Add sessions" is right there, with the coach\'s price filled in', async () => {
    const app = base({ currentUser: READY_COACH, clients: [CLIENT] });
    page(app);
    expect(screen.getByText('No sessions added yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add sessions' }));
    expect(screen.getByLabelText('Price per session (GBP)').value).toBe('50');
    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    expect(screen.getByText(/Total: GBP 500\.00/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(app.addCreditLedgerEntry).toHaveBeenCalledWith(CLIENT.id, { qty: 10, rate: 50 }));
  });

  test('sessions already booked before any were added count as used', () => {
    page(base({ currentUser: READY_COACH, clients: [{ ...CLIENT, sessionOffset: 3 }] }));
    fireEvent.click(screen.getByRole('button', { name: 'Add sessions' }));
    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    expect(screen.getByText(/After top-up: 7 remaining/)).toBeTruthy();
  });

  test('no price set: the sessions are still added, with no price recorded', async () => {
    const app = base({ clients: [CLIENT] });
    page(app);
    fireEvent.click(screen.getByRole('button', { name: 'Add sessions' }));
    expect(screen.getByLabelText('Price per session (GBP)').value).toBe('');
    fireEvent.change(screen.getByLabelText(/Custom/), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(app.addCreditLedgerEntry).toHaveBeenCalledWith(CLIENT.id, { qty: 6, rate: null }));
  });

  test('the raw numbers are behind "Correct balance", not the first thing offered', () => {
    page(base({ clients: [CLIENT] }));
    expect(screen.queryByText('Sessions used:')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Correct balance' }));
    expect(screen.getByText('Sessions used:')).toBeTruthy();
  });
});

// ── (3) ──
describe('booking a session', () => {
  async function book(app, { asCoach }) {
    renderAt('/schedule', <Route path="/schedule" element={<SchedulePage />} />, app);
    fireEvent.click(screen.getAllByRole('button', { name: /Book Session/i })[0]);
    if (asCoach) {
      const clientSelect = screen.getAllByRole('combobox').find(s => [...s.options].some(o => o.value === CLIENT.id));
      fireEvent.change(clientSelect, { target: { value: CLIENT.id } });
    }
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2099-01-05' } });
    const timeSelect = screen.getAllByRole('combobox').find(s => [...s.options].some(o => o.value === '10:00'));
    fireEvent.change(timeSelect, { target: { value: '10:00' } });
    fireEvent.submit(dateInput.closest('form'));
    await waitFor(() => expect(app.addScheduleItem).toHaveBeenCalledTimes(1));
    return app.addScheduleItem.mock.calls[0][0];
  }

  test('the coach booking it confirms it — no second tap on their own booking', async () => {
    const item = await book(base({ currentUser: READY_COACH, clients: [CLIENT] }), { asCoach: true });
    expect(item).toMatchObject({ clientId: CLIENT.id, trainerId: 'coach-1', status: 'confirmed' });
  });

  test('a client\'s booking stays a request for the coach to answer', async () => {
    const coach = { ...READY_COACH, workingHours: { start: '09:00', end: '17:00' } };
    const app = base({ currentUser: { ...CLIENT, intakeCompleted: true }, coach });
    const item = await book(app, { asCoach: false });
    expect(item.status).toBeUndefined(); // addScheduleItem makes it 'pending'
  });

  test('the cancellation rule is written in the booking form, for both', async () => {
    renderAt('/schedule', <Route path="/schedule" element={<SchedulePage />} />, base({ currentUser: READY_COACH, clients: [CLIENT] }));
    fireEvent.click(screen.getAllByRole('button', { name: /Book Session/i })[0]);
    expect(screen.getByText(/24 hours or more before.*up to 2 times a month/)).toBeTruthy();
    cleanup();
    renderAt('/schedule', <Route path="/schedule" element={<SchedulePage />} />, base({ currentUser: { ...CLIENT, intakeCompleted: true }, coach: READY_COACH }));
    fireEvent.click(screen.getAllByRole('button', { name: /Book Session/i })[0]);
    expect(screen.getByText(/at least 24 hours before.*up to 2 times a month/)).toBeTruthy();
  });
});

// ── (4) ──
describe('out of the way, and one price is enough', () => {
  const profile = (app) => renderAt('/profile', <Route path="/profile" element={<ProfilePage />} />, app);

  test('one price saves on its own; the second is optional and folded away', async () => {
    const app = base();
    profile(app);
    expect(screen.queryByLabelText('Rate after sessions run out')).toBeNull();
    fireEvent.change(screen.getByLabelText('Price per session'), { target: { value: '55' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Rates/ }));
    await waitFor(() => expect(app.updateClient).toHaveBeenCalledWith('coach-1', { renewalRate: 55, renewalRateNext: null, currency: 'GBP' }));
  });

  test('a coach who uses two prices sees both, and can still save both', async () => {
    const app = base({ currentUser: { ...READY_COACH, renewalRate: 65, renewalRateNext: 70 } });
    profile(app);
    expect(screen.getByLabelText('Rate after sessions run out').value).toBe('70');
    fireEvent.click(screen.getByRole('button', { name: /Save Rates/ }));
    await waitFor(() => expect(app.updateClient).toHaveBeenCalledWith('coach-1', { renewalRate: 65, renewalRateNext: 70, currency: 'GBP' }));
  });

  test('the GoCardless button that only ever said "not set up yet" is gone; the own-account option stays', async () => {
    profile(base());
    expect(await screen.findByRole('button', { name: 'Use your own GoCardless account' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Connect GoCardless$/ })).toBeNull();
  });

  test('adding an exercise asks for three things; the rest waits behind "More options"', async () => {
    const app = base({ currentUser: READY_COACH });
    renderAt('/exercises', <Route path="/exercises" element={<ExerciseLibraryPage />} />, app);
    fireEvent.click(screen.getAllByRole('button', { name: /Add Exercise/i })[0]);
    expect(screen.queryByText(/Movement pattern/i)).toBeNull();
    expect(screen.queryByText(/Video URL/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByText(/Movement pattern/i)).toBeTruthy();
  });

  test('with the pattern field folded away, no guessed pattern is saved unseen (#35)', async () => {
    const app = base({ currentUser: READY_COACH });
    renderAt('/exercises', <Route path="/exercises" element={<ExerciseLibraryPage />} />, app);
    fireEvent.click(screen.getAllByRole('button', { name: /Add Exercise/i })[0]);
    const modal = document.querySelector('.modal');
    fireEvent.change(within(modal).getAllByRole('textbox')[0], { target: { value: 'Romanian Deadlift' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Lower Back' }));
    // No equipment is preset any more (B45) — the coach picks it.
    fireEvent.change(within(modal).getByRole('combobox'), { target: { value: 'Dumbbell' } });
    fireEvent.submit(modal.querySelector('form'));
    await waitFor(() => expect(app.addExercise).toHaveBeenCalled());
    expect(app.addExercise.mock.calls[0][0].movementPattern).toBe('');
  });

  test('the PR card shows only the last 30 days, newest first (Ani 2026-10-10)', async () => {
    const { localDateAdd } = await import('../utils/dateUtils');
    renderAt('/', <Route path="/" element={<ClientDashboard />} />, base({
      currentUser: { ...CLIENT, intakeCompleted: true },
      coach: READY_COACH,
      getPersonalRecords: () => ({
        old: { weight: 60, date: localDateAdd(-45), name: 'Old Press' },
        recent: { weight: 100, date: localDateAdd(-2), name: 'Recent Squat' },
        newest: { weight: 40, date: localDateAdd(0), name: 'Newest Curl' },
      }),
    }));
    const card = screen.getByText('Last 30 days').closest('.card');
    expect([...card.querySelectorAll('.pr-exercise')].map(e => e.textContent)).toEqual(['Newest Curl', 'Recent Squat']);
    expect(within(card).getByText('2 PRs')).toBeTruthy();
  });

  test('a client of a one-price coach is asked to top up, without a "price goes up" warning', () => {
    const coach = { ...READY_COACH, renewalRate: 50 };
    renderAt('/', <Route path="/" element={<ClientDashboard />} />, base({
      currentUser: { ...CLIENT, intakeCompleted: true },
      coach,
      getSessionStats: () => ({ used: 7, total: 10, remaining: 3 }),
    }));
    expect(screen.getByText(/Top up to keep booking/)).toBeTruthy();
    expect(screen.queryByText(/moves to|After that, renewal is/)).toBeNull();
  });

  test('the monthly plan says what happens to unused sessions', async () => {
    const coach = { ...READY_COACH, subscriptionRate: 50 };
    renderAt('/profile', <Route path="/profile" element={<SubscriptionCard />} />, base({
      currentUser: { ...CLIENT, subscriptionTester: true },
      data: { users: [coach] },
    }));
    expect(await screen.findByText(/carry over to next month — up to 4 on this plan/)).toBeTruthy();
  });
});
