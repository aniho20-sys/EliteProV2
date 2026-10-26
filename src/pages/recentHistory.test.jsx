// @vitest-environment jsdom
//
// B76 (reports/load-test-2026-10-24.md): the coach's app keeps only recent history live.
// Driven through the real pages, with the app's data replaced, so nothing here reaches a
// real project (#38):
//   - the dashboard never says "No activity yet" of a client who has simply not trained in
//     the days it holds;
//   - a client's page and the progress overview ask for the full history of who they show,
//     give it back when closed, and show loading — not half the history — until it is here.

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: TrainerDashboard } = await import('./TrainerDashboard');
const { default: ClientDetailPage } = await import('./ClientDetailPage');
const { default: ClientProgressOverviewPage } = await import('./ClientProgressOverviewPage');
const { default: WorkoutLogPage } = await import('./WorkoutLogPage');
const { localDateAdd } = await import('../utils/dateUtils');

const COACH = { id: 'coach-1', name: 'Ani Ho', role: 'trainer', inviteCode: 'ANI123', renewalRate: 40, bankDetails: { accountNumber: '1' } };
const OLD_HAND = { id: 'c-old', name: 'Olive Old', role: 'client', trainerId: 'coach-1', joinDate: '2024-01-01', totalSessions: 10, sessionOffset: 4 };
const NEWBIE = { id: 'c-new', name: 'Nick New', role: 'client', trainerId: 'coach-1', joinDate: localDateAdd(-3), totalSessions: 10, sessionOffset: 0 };

function appWith(overrides = {}) {
  const clients = overrides.clients || [OLD_HAND, NEWBIE];
  return {
    currentUser: COACH, setLanguage: vi.fn(),
    getClients: () => clients,
    getClient: (id) => clients.find(c => c.id === id) || (id === COACH.id ? COACH : undefined),
    getBodyStats: () => [], getSchedule: () => [], getUnreadCount: () => 0, getMessages: () => [],
    getWorkoutPlans: () => [], getWorkoutLogs: () => [], getExercises: () => [],
    getSessionStats: () => ({ used: 4, total: 10, remaining: 6 }),
    getPersonalRecords: () => ({}), muscleGroups: [], addWorkoutLog: vi.fn(), updateWorkoutLog: vi.fn(),
    checkAndAwardBadges: vi.fn(async () => []),
    getIntakeForm: vi.fn(async () => null), getTrainerSubscriptions: vi.fn(async () => []),
    getInviteCode: vi.fn(async () => 'ANI123'),
    updateScheduleItem: vi.fn(), updateClient: vi.fn(), sendMessage: vi.fn(), markMessagesRead: vi.fn(),
    // What the coach's app holds: only the last 60 days of every client (AppContext, B76).
    watchClientHistory: vi.fn(() => vi.fn()),
    healthShared: () => true, // B79: not answered yet = shared
    historyComplete: () => false,
    historyStart: () => localDateAdd(-60),
    extendScheduleTo: vi.fn(),
    ...overrides,
  };
}

function renderAt(element, app, path, route = '*') {
  return render(
    <AppContext.Provider value={app}>
      <LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path={route} element={element} /></Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the coach’s dashboard, holding only recent history', () => {
  test('a client of two years with nothing recent: "no activity in the last 60 days", never "no activity yet"', () => {
    renderAt(<TrainerDashboard />, appWith({ clients: [OLD_HAND] }), '/');
    expect(screen.getByText('No activity in the last 60 days')).toBeTruthy();
    expect(screen.queryByText('No activity yet')).toBeNull();
  });
  // B76 step 2: the summary knows the last completed session however old it is.
  test('a client whose last session was 150 days ago: "inactive 150 days", from their summary', () => {
    const lastSession = { id: 's1', clientId: OLD_HAND.id, date: localDateAdd(-150), status: 'completed', type: 'Assessment' };
    renderAt(<TrainerDashboard />, appWith({
      clients: [OLD_HAND],
      historyStart: () => null,
      getSchedule: (f = {}) => (f.includeLastCompleted && f.clientId === OLD_HAND.id ? [lastSession] : []),
    }), '/');
    expect(screen.getByText('Inactive 150 days')).toBeTruthy();
  });
  test('a client who joined three days ago with nothing: "no activity yet" is still the truth', () => {
    renderAt(<TrainerDashboard />, appWith({ clients: [NEWBIE] }), '/');
    expect(screen.getAllByText('No activity yet').length).toBeGreaterThan(0);
    expect(screen.queryByText('No activity in the last 60 days')).toBeNull();
  });
});

describe('pages that show a client’s whole history', () => {
  test('a client’s page asks for that client’s full history and gives it back when closed', () => {
    const release = vi.fn();
    const app = appWith({ watchClientHistory: vi.fn(() => release) });
    const { unmount } = renderAt(<ClientDetailPage />, app, `/clients/${OLD_HAND.id}`, '/clients/:clientId');
    expect(app.watchClientHistory).toHaveBeenCalledWith([OLD_HAND.id]);
    unmount();
    expect(release).toHaveBeenCalled();
  });
  test('…and shows loading, not half the history, until it is here', () => {
    const app = appWith({ getWorkoutLogs: () => [{ id: 'l1', clientId: OLD_HAND.id, date: localDateAdd(-2), entries: [] }] });
    const { container } = renderAt(<ClientDetailPage />, app, `/clients/${OLD_HAND.id}`, '/clients/:clientId');
    expect(container.querySelector('.skeleton-card, .skeleton-line')).toBeTruthy();
  });
  test('…and once it is here, the page shows it', () => {
    const app = appWith({ historyComplete: () => true, historyStart: () => null });
    const { container } = renderAt(<ClientDetailPage />, app, `/clients/${OLD_HAND.id}`, '/clients/:clientId');
    expect(container.querySelector('.skeleton-card, .skeleton-line')).toBeNull();
  });
  test('the progress overview asks for every client’s full history, and waits for it', () => {
    const app = appWith();
    const { container } = renderAt(<ClientProgressOverviewPage />, app, '/progress-overview');
    expect(app.watchClientHistory).toHaveBeenCalledWith([OLD_HAND.id, NEWBIE.id].sort());
    expect(container.querySelector('.skeleton-card, .skeleton-line')).toBeTruthy();
    expect(screen.queryByText('Olive Old')).toBeNull();
  });
  // New PRs and session-count badges are judged against the client's whole history.
  test('a coach logging a workout for a client asks for that client’s full history; logging their own does not', () => {
    const app = appWith();
    const { unmount } = renderAt(<WorkoutLogPage />, app, { pathname: '/log', state: { clientId: OLD_HAND.id, clientName: OLD_HAND.name } });
    expect(app.watchClientHistory).toHaveBeenCalledWith([OLD_HAND.id]);
    unmount();
    const own = appWith();
    renderAt(<WorkoutLogPage />, own, '/log');
    expect(own.watchClientHistory).not.toHaveBeenCalled();
  });
});
