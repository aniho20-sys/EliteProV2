// @vitest-environment jsdom
//
// "Start session" on the coach's dashboard (Ani 2026-10-11): from today's booking straight
// into logging that client's workout, instead of Client → Workout logs → Log session → plan.
// Driven through the real dashboard. Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: TrainerDashboard } = await import('./TrainerDashboard');
const { localToday } = await import('../utils/dateUtils');
const { startSessionState, canStartSession, hasLogDraft, logDraftKey } = await import('../utils/startSession');

const COACH = { id: 'coach-1', name: 'Ani Ho', role: 'trainer', inviteCode: 'ANI123' };
const AMY = { id: 'amy', name: 'Amy Chen', role: 'client', trainerId: 'coach-1' };
const BEN = { id: 'ben', name: 'Ben Ng', role: 'client', trainerId: 'coach-1' };
const PLAN_A = { id: 'plan-a', clientId: 'amy', trainerId: 'coach-1', name: 'Full Body A', exercises: [] };
const PLAN_B = { id: 'plan-b', clientId: 'amy', trainerId: 'coach-1', name: 'Full Body B', exercises: [] };
const BENS_PLAN = { id: 'plan-ben', clientId: 'ben', trainerId: 'coach-1', name: 'Ben Upper', exercises: [] };
const TODAY = localToday();
const session = (over) => ({ id: 's1', trainerId: 'coach-1', clientId: 'amy', date: TODAY, time: '23:59', type: 'Training Session', status: 'confirmed', ...over });

let landedOn;
function LogProbe() { landedOn = useLocation().state; return <div>log page</div>; }

function renderDashboard({ schedule = [session()], plans = [PLAN_A] } = {}) {
  const clients = [AMY, BEN];
  const app = {
    currentUser: COACH, setLanguage: vi.fn(),
    getClients: () => clients, getClient: (id) => clients.find(c => c.id === id),
    getSchedule: () => schedule, getUnreadCount: () => 0, getMessages: () => [],
    getWorkoutPlans: () => plans, getWorkoutLogs: () => [], getBodyStats: () => [],
    getSessionStats: () => ({ used: 0, total: 10, remaining: 10 }), getInviteCode: vi.fn(async () => 'ANI123'),
    updateScheduleItem: vi.fn(), updateClient: vi.fn(), sendMessage: vi.fn(), markMessagesRead: vi.fn(),
  };
  render(
    <AppContext.Provider value={app}>
      <LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/log" element={<LogProbe />} />
            <Route path="*" element={<TrainerDashboard />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
}
const upNextStart = () => document.querySelector('.hero-card').querySelector('.hero-card-start');

beforeEach(() => { landedOn = undefined; localStorage.clear(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Start session on the dashboard', () => {
  test('one plan: straight into logging it for that client', () => {
    renderDashboard({ plans: [PLAN_A, BENS_PLAN] }); // another client's plan is not this client's
    fireEvent.click(upNextStart());
    expect(screen.getByText('log page')).toBeTruthy();
    expect(landedOn).toEqual({ clientId: 'amy', clientName: 'Amy Chen', planId: 'plan-a' });
  });

  test('several plans: the log page asks which, rather than guessing', () => {
    renderDashboard({ plans: [PLAN_A, PLAN_B] });
    fireEvent.click(upNextStart());
    expect(landedOn).toEqual({ clientId: 'amy', clientName: 'Amy Chen' });
  });

  test('a half-logged workout for that client is resumed, not started over', () => {
    localStorage.setItem(logDraftKey('amy'), JSON.stringify({ entries: [{ exerciseId: 'squat', sets: [] }] }));
    renderDashboard();
    fireEvent.click(upNextStart());
    expect(landedOn).toEqual({ clientId: 'amy', clientName: 'Amy Chen' });
  });

  test("each of today's open sessions can be started; finished, cancelled and blocked-out ones cannot", () => {
    renderDashboard({ schedule: [
      session({ id: 'open', time: '23:58' }),
      session({ id: 'done', clientId: 'ben', time: '07:00', status: 'completed' }),
      session({ id: 'off', clientId: 'ben', time: '08:00', status: 'cancelled' }),
    ] });
    const rows = [...document.querySelectorAll('.schedule-item')];
    const startIn = (row) => within(row).queryByRole('button', { name: 'Start session' });
    expect(rows.map(r => !!startIn(r))).toEqual([false, false, true]); // sorted by time
    fireEvent.click(startIn(rows[2]));
    expect(landedOn.clientId).toBe('amy');
  });

  test('no session today: no Start session button', () => {
    renderDashboard({ schedule: [] });
    expect(upNextStart()).toBeNull();
  });
});

describe('the rules behind it', () => {
  test('canStartSession', () => {
    expect(canStartSession(session())).toBe(true);
    expect(canStartSession(session({ status: 'pending' }))).toBe(true);
    expect(canStartSession(session({ status: 'completed' }))).toBe(false);
    expect(canStartSession(session({ status: 'cancelled' }))).toBe(false);
    expect(canStartSession(session({ isBlocked: true }))).toBe(false);
    expect(canStartSession(null)).toBe(false);
  });

  test('a client with no plan goes to the log page to pick a free workout', () => {
    expect(startSessionState(AMY, [])).toEqual({ clientId: 'amy', clientName: 'Amy Chen' });
  });

  test('an empty or broken draft is not a draft', () => {
    localStorage.setItem(logDraftKey('amy'), JSON.stringify({ entries: [] }));
    expect(hasLogDraft('amy')).toBe(false);
    localStorage.setItem(logDraftKey('amy'), '{not json');
    expect(hasLogDraft('amy')).toBe(false);
    expect(hasLogDraft('nobody')).toBe(false);
  });
});
