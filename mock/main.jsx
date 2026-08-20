// Screenshot renderer for the landing page.
//
// This is NOT part of the app bundle — vite build only takes the root index.html as an
// entry, so nothing here ships. It exists so the marketing screenshots are the real
// components rendering the real stylesheet, rather than a separate mockup that drifts
// away from the product the first time someone changes a class name.
//
// Every name and number below is invented. No production data is used and no demo
// account exists: the pages are driven by a stubbed AppContext instead.
/* eslint-disable react-refresh/only-export-components -- render-once screenshot entry,
   never mounted by the app and never hot-reloaded into it. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppContext } from '../src/context/AppContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import TrainerDashboard from '../src/pages/TrainerDashboard';
import ClientDashboard from '../src/pages/ClientDashboard';
import MyWorkoutsPage from '../src/pages/MyWorkoutsPage';
import WorkoutPlansPage from '../src/pages/WorkoutPlansPage';
import ClientDetailPage from '../src/pages/ClientDetailPage';
import { exerciseLibrary, equipmentTypes } from '../src/data/exercises';
import { localToday, localDateAdd } from '../src/utils/dateUtils';
import '../src/styles/index.css';

const TODAY = localToday();
const day = (n) => localDateAdd(n);

const TRAINER = {
  id: 't1', role: 'trainer', name: 'Jordan Blake', email: 'coach@example.com',
  renewalRate: 45, renewalRateNext: 55, currency: 'GBP', inviteCode: 'ELITE1',
};

// One client per Needs Attention category, so the card shows all four states at once.
const CLIENTS = [
  // 1 — Session owed: booked on credit, balance is negative.
  { id: 'c1', role: 'client', name: 'Alex Chen', trainerId: 't1',
    totalSessions: 10, sessionOffset: 11, intakeCompleted: true },
  // 2 — Renewal: running low but not yet overdrawn.
  { id: 'c2', role: 'client', name: 'Sam Reid', trainerId: 't1',
    totalSessions: 12, sessionOffset: 10, intakeCompleted: true,
    age: 34, height: 178, goals: 'Build strength, drop body fat', joinDate: '2026-03-04' },
  // 3 — Churn risk: healthy balance, but no log and no completed session for weeks.
  { id: 'c3', role: 'client', name: 'Jamie Wu', trainerId: 't1',
    totalSessions: 20, sessionOffset: 8, intakeCompleted: true },
  // 4 — Training profile missing, with a session already on the books.
  { id: 'c4', role: 'client', name: 'Priya Nair', trainerId: 't1',
    totalSessions: 8, sessionOffset: 1, intakeCompleted: false },
];

const SCHEDULE = [
  { id: 's1', trainerId: 't1', clientId: 'c1', date: TODAY, time: '07:30', duration: 60, type: 'PT Session', status: 'confirmed' },
  { id: 's2', trainerId: 't1', clientId: 'c2', date: TODAY, time: '12:00', duration: 60, type: 'PT Session', status: 'confirmed' },
  { id: 's3', trainerId: 't1', clientId: 'c4', date: day(1), time: '18:00', duration: 60, type: 'PT Session', status: 'pending' },
  { id: 's4', trainerId: 't1', clientId: 'c1', date: day(-2), time: '07:30', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 's5', trainerId: 't1', clientId: 'c2', date: day(-3), time: '12:00', duration: 60, type: 'PT Session', status: 'completed' },
  // Jamie's last completed session is well past the churn threshold.
  { id: 's6', trainerId: 't1', clientId: 'c3', date: day(-27), time: '17:00', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 's7', trainerId: 't1', clientId: 'c4', date: day(-1), time: '18:00', duration: 60, type: 'PT Session', status: 'completed' },
];

const PLANS = [
  { id: 'p1', name: 'Lower Body Strength', trainerId: 't1', clientId: 'c2', day: 'Monday',
    exercises: [
      { exerciseId: 'squat', sets: 4, reps: '5', rest: 180, notes: 'Build to a heavy set of 5' },
      { exerciseId: 'romanian-deadlift', sets: 3, reps: '8-10', rest: 120, notes: '' },
      { exerciseId: 'leg-press', sets: 3, reps: '10-12', rest: 90, notes: '' },
      { exerciseId: 'calf-raise', sets: 4, reps: '12-15', rest: 60, notes: '' },
    ] },
  { id: 'p2', name: 'Upper Body Push', trainerId: 't1', clientId: 'c2', day: 'Wednesday',
    exercises: [
      { exerciseId: 'bench-press', sets: 4, reps: '6-8', rest: 150, notes: 'Pause on the chest' },
      { exerciseId: 'overhead-press', sets: 3, reps: '8', rest: 120, notes: '' },
      { exerciseId: 'incline-db-press', sets: 3, reps: '10', rest: 90, notes: '' },
      { exerciseId: 'tricep-pushdown', sets: 3, reps: '12-15', rest: 60, notes: '' },
    ] },
  { id: 'p3', name: 'Pull & Core', trainerId: 't1', clientId: 'c2', day: 'Friday',
    exercises: [
      { exerciseId: 'pull-up', sets: 4, reps: 'AMRAP', rest: 120, notes: '' },
      { exerciseId: 'barbell-row', sets: 3, reps: '8-10', rest: 120, notes: '' },
      { exerciseId: 'face-pull', sets: 3, reps: '15', rest: 60, notes: '' },
      { exerciseId: 'hanging-leg-raise', sets: 3, reps: '10-12', rest: 60, notes: '' },
    ] },
];

const LOGS = [
  { id: 'l1', clientId: 'c2', planId: 'p1', date: day(-1), rpe: 8, notes: '',
    entries: [{ exerciseId: 'squat', unit: 'weight_reps', sets: [{ weight: 90, reps: 5, completed: true }] }] },
  { id: 'l2', clientId: 'c2', planId: 'p2', date: day(-4), rpe: 7, notes: '',
    entries: [{ exerciseId: 'bench-press', unit: 'weight_reps', sets: [{ weight: 70, reps: 8, completed: true }] }] },
  { id: 'l3', clientId: 'c1', planId: 'p1', date: day(-2), rpe: 8, notes: '', entries: [] },
];

const byId = (id) => [TRAINER, ...CLIENTS].find(u => u.id === id) || null;

const makeCtx = (currentUser) => ({
  currentUser,
  getClients: (trainerId) => CLIENTS.filter(c => c.trainerId === trainerId),
  getClient: byId,
  updateClient: async () => {},
  getSchedule: ({ trainerId, clientId, date } = {}) => SCHEDULE.filter(s =>
    (trainerId === undefined || s.trainerId === trainerId)
    && (clientId === undefined || s.clientId === clientId)
    && (date === undefined || s.date === date)),
  getTrainerSchedule: () => SCHEDULE,
  updateScheduleItem: async () => {},
  getWorkoutPlans: ({ clientId, trainerId } = {}) => PLANS.filter(p =>
    (clientId === undefined || p.clientId === clientId)
    && (trainerId === undefined || p.trainerId === trainerId)),
  getWorkoutLogs: (clientId) => LOGS.filter(l => l.clientId === clientId),
  getBodyStats: () => [
    { id: 'b1', date: day(-30), weight: 78.4, bodyFat: 19.2, chest: 101, waist: 86, arms: 36, legs: 58 },
    { id: 'b2', date: day(-2), weight: 76.9, bodyFat: 17.8, chest: 102, waist: 83, arms: 37, legs: 59 },
  ],
  getExercises: () => exerciseLibrary,
  getPersonalRecords: () => ({ squat: { weight: 90, date: day(-1) }, 'bench-press': { weight: 70, date: day(-4) } }),
  getSessionStats: (clientId) => {
    const c = byId(clientId);
    const total = c?.totalSessions ?? null;
    const used = c?.sessionOffset ?? 0;
    return { used, total, remaining: total === null ? null : total - used };
  },
  getMessages: () => [],
  getUnreadCount: () => 0,
  sendMessage: async () => {},
  markMessagesRead: async () => {},
  addWorkoutPlan: async () => {},
  updateWorkoutPlan: async () => {},
  deleteWorkoutPlan: async () => {},
  addWorkoutLog: async () => {},
  updateWorkoutLog: async () => {},
  addBodyStat: async () => {},
  updateBodyStat: async () => {},
  removeClient: async () => {},
  addExercise: async () => {},
  updateExercise: async () => {},
  addCreditLedgerEntry: async () => {},
  getCreditLedger: async () => [
    { id: 'cl1', clientId: 'c1', date: day(-40), qty: 10, rate: 45 },
  ],
  getIntakeForm: async () => null,
  equipmentTypes,
  data: { users: [TRAINER, ...CLIENTS], workoutPlans: PLANS, workoutLogs: LOGS, schedule: SCHEDULE, messages: [], exercises: exerciseLibrary, invoices: [] },
});

// Anything a page reaches for that is not stubbed above resolves to a function returning
// an empty list. The screens here only need read paths, and a mock that throws on an
// unrelated helper would be a rendering problem, not a signal about the product.
const withDefaults = (ctx) => new Proxy(ctx, {
  get: (target, key) => (key in target ? target[key] : () => []),
});

// Each screen is rendered at phone width inside its own provider tree, exactly as the
// real app mounts it, and captured by its data-shot id.
function Screen({ id, width = 390, user, path, element, children }) {
  return (
    <div data-shot={id} style={{ width, background: 'var(--bg)', padding: '16px 16px 24px' }}>
      <AppContext.Provider value={withDefaults(makeCtx(user))}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path || '/']}>
            {path
              ? <Routes><Route path={path.replace(/[^/]+$/, ':clientId')} element={element} /></Routes>
              : children}
          </MemoryRouter>
        </ToastProvider>
      </AppContext.Provider>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', padding: 24, background: '#0b0d12' }}>
        <Screen id="dashboard" user={TRAINER}><TrainerDashboard /></Screen>
        {/* Sections 2 and 3 of the landing page address the trainer, so they show the
            trainer's own screens — the client-side equivalents (ClientDashboard's package
            card, MyWorkoutsPage) are what the client sees, not what a coach evaluating the
            product would recognise. */}
        <Screen id="sessions" user={TRAINER} path="/clients/c2" element={<ClientDetailPage />} />
        <Screen id="plan" user={TRAINER}><WorkoutPlansPage /></Screen>
      </div>
    </ThemeProvider>
  </React.StrictMode>,
);
