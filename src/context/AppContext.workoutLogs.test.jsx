// @vitest-environment jsdom
//
// A coach's view of their clients' workout logs (Grok Bot review, 2026-10-24).
//
// A log carries the coach it was written under (trainerId). The coach's app used to load
// logs with where('trainerId', '==', coach), so a client who had left stayed in the coach's
// app. firestore.rules now lets a coach read a log only while its client is theirs
// (firestore-tests/attack.rules.test.js), and the rules refuse that trainerId query outright,
// so the app must ask one client at a time — and drop a client's logs the moment they leave.
//
// Firebase itself is replaced here, so nothing in this file can reach a real project (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup, act } from '@testing-library/react';

const fb = vi.hoisted(() => ({ profile: null, docs: {}, listeners: [], queries: [], refuse: null, called: [] }));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

vi.mock('firebase/firestore', () => {
  // Each listener answers from fb.docs[collection] — filtered (==, >=, or), sorted and
  // limited as its query says — and answers again whenever the test changes that collection.
  // fb.refuse(q) → that query fails as production does while an index is missing.
  const test = (f, d) => (f.op === '==' ? d[f.field] === f.value
    : f.op === '>=' ? d[f.field] >= f.value
      : f.op === 'or' ? f.value.some(g => test(g, d)) : false);
  const answer = (l) => {
    if (fb.refuse && fb.refuse(l.q)) { if (l.error) l.error({ code: 'failed-precondition' }); return; }
    let docs = (fb.docs[l.q.col] || []).filter(d => l.q.filters.every(f => test(f, d)));
    if (l.q.order) {
      const { field, dir } = l.q.order;
      docs = [...docs].sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    if (l.q.max) docs = docs.slice(0, l.q.max);
    l.next({ docs: docs.map(d => ({ id: d.id, data: () => d })) });
  };
  return {
    collection: (_db, ...path) => ({ name: path.join('/') }),
    where: (field, op, value) => ({ field, op, value }),
    query: (col, ...parts) => ({
      col: col.name,
      filters: parts.filter(f => f && f.field),
      order: parts.find(p => p && p.orderField) && { field: parts.find(p => p && p.orderField).orderField, dir: parts.find(p => p && p.orderField).dir },
      max: (parts.find(p => p && p.max) || {}).max,
    }),
    or: (...filters) => ({ field: 'or', op: 'or', value: filters }),
    orderBy: (field, dir = 'asc') => ({ orderField: field, dir }),
    limit: (n) => ({ max: n }),
    doc: (_db, ...path) => ({ path: path.join('/') }),
    onSnapshot: (q, next, error) => {
      if (q.path) { queueMicrotask(() => next({ id: q.path, exists: () => false, data: () => undefined })); return () => {}; }
      fb.queries.push(q);
      const l = { q, next, error };
      fb.listeners.push(l);
      queueMicrotask(() => answer(l));
      return () => { fb.listeners = fb.listeners.filter(x => x !== l); };
    },
    __answerAll: (col) => fb.listeners.filter(l => l.q.col === col).forEach(answer),
    setDoc: vi.fn(), updateDoc: vi.fn(), addDoc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(async () => ({ docs: [] })),
    deleteDoc: vi.fn(), writeBatch: vi.fn(), runTransaction: vi.fn(),
  };
});

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => { cb({ uid: fb.profile.id, email: 'coach@example.test' }); return () => {}; },
  getRedirectResult: () => Promise.resolve(null),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(), signOut: vi.fn(), deleteUser: vi.fn(),
}));

vi.mock('firebase/functions', () => ({ httpsCallable: (_f, name) => async () => { fb.called.push(name); return { data: {} }; } }));

const firestore = await import('firebase/firestore');
const { localDateAdd } = await import('../utils/dateUtils');
const { recentSince, RECENT_BODY_STATS } = await import('../utils/recentHistory');
const { AppProvider, useApp } = await import('./AppContext');

let api;
function Grab() { api = useApp(); return null; }

const COACH = { id: 'coach-1', role: 'trainer', name: 'Coach', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
const AMY = { id: 'amy', role: 'client', name: 'Amy', trainerId: COACH.id };
const BEN = { id: 'ben', role: 'client', name: 'Ben', trainerId: COACH.id };

beforeEach(() => {
  fb.profile = COACH;
  fb.listeners = [];
  fb.queries = [];
  fb.refuse = null;
  fb.called = [];
  fb.docs = {
    users: [COACH, AMY, BEN],
    workoutLogs: [
      { id: 'l-amy', clientId: AMY.id, trainerId: COACH.id, date: localDateAdd(-24), entries: [] },
      { id: 'l-ben', clientId: BEN.id, trainerId: COACH.id, date: localDateAdd(-23), entries: [] },
    ],
  };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function signIn() {
  render(<AppProvider><Grab /></AppProvider>);
  await waitFor(() => expect(api.currentUser?.id).toBe(COACH.id));
}

describe('a coach’s clients’ workout logs', () => {
  test('are asked for one client at a time, never by the coach id on the log', async () => {
    await signIn();
    await waitFor(() => expect(api.getWorkoutLogs(AMY.id).map(l => l.id)).toEqual(['l-amy']));
    expect(api.getWorkoutLogs(BEN.id).map(l => l.id)).toEqual(['l-ben']);

    const logQueries = fb.queries.filter(q => q.col === 'workoutLogs');
    const fields = logQueries.flatMap(q => q.filters.map(f => f.field));
    expect(fields).not.toContain('trainerId');
    expect(fields).not.toContain('or');
    const askedFor = logQueries.flatMap(q => q.filters.filter(f => f.field === 'clientId').map(f => f.value));
    expect(askedFor).toEqual(expect.arrayContaining([COACH.id, AMY.id, BEN.id]));
  });

  test('of a client who leaves are gone at once, though they were loaded before', async () => {
    await signIn();
    await waitFor(() => expect(api.getWorkoutLogs(AMY.id)).toHaveLength(1));

    fb.docs.users = [COACH, { ...AMY, trainerId: null }, BEN];
    await act(async () => { firestore.__answerAll('users'); });

    await waitFor(() => expect(api.getWorkoutLogs(AMY.id)).toEqual([]));
    expect(api.data.workoutLogs.map(l => l.id)).toEqual(['l-ben']);
    expect(fb.listeners.some(l => l.q.col === 'workoutLogs' && l.q.filters.some(f => f.value === AMY.id))).toBe(false);
  });
});

// A client's own exercises carry their own id (addExercise, while they have no coach). The
// exercises listener used to ask only for the coach's, and nothing at all with no coach, so
// those exercises vanished from the app the moment they were added (Grok Bot review).
describe('a client’s own exercises', () => {
  const SAM = { id: 'sam', role: 'client', name: 'Sam', trainerId: null };
  const own = { id: 'ex-own', name: 'Sam’s Sled Push', trainerId: SAM.id };
  const coachs = { id: 'ex-coach', name: 'Coach’s Carry', trainerId: COACH.id };
  const names = () => api.getExercises().map(e => e.id);

  beforeEach(() => {
    fb.docs.users = [SAM, COACH];
    fb.docs.exercises = [own, coachs];
  });

  test('show while the client has no coach', async () => {
    fb.profile = SAM;
    render(<AppProvider><Grab /></AppProvider>);
    await waitFor(() => expect(names()).toContain('ex-own'));
    expect(names()).not.toContain('ex-coach');
  });

  test('still show beside the coach’s once the client connects', async () => {
    fb.profile = { ...SAM, trainerId: COACH.id };
    fb.docs.users = [fb.profile, COACH];
    render(<AppProvider><Grab /></AppProvider>);
    await waitFor(() => expect(names()).toEqual(expect.arrayContaining(['ex-own', 'ex-coach'])));
  });
});

// B76 (reports/load-test-2026-10-24.md): 50 clients with a year each was 16,551 records and
// 114 listeners every time the coach opened the app. The coach's app now keeps the last 60
// days of logs and sessions and each client's latest body stats; a page that needs a
// client's whole history asks for it (watchClientHistory) and gives it back when it closes.
describe('a coach’s app keeps only recent history (B76)', () => {
  const recent = localDateAdd(-5);
  const old = localDateAdd(-200);
  const bodyDates = Array.from({ length: 12 }, (_, i) => localDateAdd(-7 * i));

  beforeEach(() => {
    fb.docs.users = [COACH, AMY];
    fb.docs.workoutLogs = [
      { id: 'log-new', clientId: AMY.id, trainerId: COACH.id, date: recent, entries: [] },
      { id: 'log-old', clientId: AMY.id, trainerId: COACH.id, date: old, entries: [] },
    ];
    fb.docs.schedule = [
      { id: 's-new', trainerId: COACH.id, clientId: AMY.id, date: recent, time: '10:00', status: 'completed' },
      { id: 's-old', trainerId: COACH.id, clientId: AMY.id, date: old, time: '10:00', status: 'completed' },
    ];
    fb.docs[`bodyStats/${AMY.id}/entries`] = bodyDates.map((date, i) => ({ id: `b${i}`, date, weight: 70 + i }));
  });

  const logIds = () => api.getWorkoutLogs(AMY.id).map(l => l.id).sort();
  const sessionIds = () => api.getSchedule({ clientId: AMY.id }).map(s => s.id).sort();

  test('the dashboard holds the last 60 days of logs and sessions, and the latest body stats', async () => {
    await signIn();
    await waitFor(() => expect(logIds()).toEqual(['log-new']));
    await waitFor(() => expect(sessionIds()).toEqual(['s-new']));
    await waitFor(() => expect(api.getBodyStats(AMY.id)).toHaveLength(RECENT_BODY_STATS));
    const dates = api.getBodyStats(AMY.id).map(b => b.date);
    expect(dates).toEqual([...dates].sort());            // oldest first, as the charts expect
    expect(dates[dates.length - 1]).toBe(bodyDates[0]);  // and the newest is there
    expect(api.historyComplete(AMY.id)).toBe(false);
    expect(api.historyStart(AMY.id)).toBe(recentSince());
  });

  test('a page that watches a client gets all of it, and gives it back on close', async () => {
    await signIn();
    await waitFor(() => expect(logIds()).toEqual(['log-new']));
    let release;
    act(() => { release = api.watchClientHistory([AMY.id]); });
    await waitFor(() => expect(api.historyComplete(AMY.id)).toBe(true));
    expect(logIds()).toEqual(['log-new', 'log-old']);
    expect(sessionIds()).toEqual(['s-new', 's-old']);
    expect(api.getBodyStats(AMY.id)).toHaveLength(12);
    expect(api.historyStart(AMY.id)).toBeNull();

    act(() => release());
    await waitFor(() => expect(logIds()).toEqual(['log-new']));
    expect(sessionIds()).toEqual(['s-new']);
    expect(api.historyComplete(AMY.id)).toBe(false);
  });

  test('two pages watching one client share it: closing one keeps it for the other', async () => {
    await signIn();
    let a; let b;
    act(() => { a = api.watchClientHistory([AMY.id]); b = api.watchClientHistory([AMY.id]); });
    await waitFor(() => expect(api.historyComplete(AMY.id)).toBe(true));
    act(() => a());
    expect(api.historyComplete(AMY.id)).toBe(true);
    act(() => b());
    await waitFor(() => expect(api.historyComplete(AMY.id)).toBe(false));
  });

  test('the calendar looking further back loads those weeks', async () => {
    await signIn();
    await waitFor(() => expect(sessionIds()).toEqual(['s-new']));
    act(() => api.extendScheduleTo(localDateAdd(-250)));
    await waitFor(() => expect(sessionIds()).toEqual(['s-new', 's-old']));
  });

  // Production refuses a windowed query until its composite index is built; the emulator
  // never does, so only this stand-in can show what the app does then.
  test('index not built yet: the same data unwindowed — slower, never an empty dashboard', async () => {
    fb.refuse = (q) => (q.filters || []).some(f => f.op === '>=');
    await signIn();
    await waitFor(() => expect(logIds()).toEqual(['log-new', 'log-old']));
    await waitFor(() => expect(sessionIds()).toEqual(['s-new', 's-old']));
    await waitFor(() => expect(api.loading).toBe(false));
  });

  test('a client’s own app still has their whole history', async () => {
    fb.profile = { ...AMY };
    render(<AppProvider><Grab /></AppProvider>);
    await waitFor(() => expect(api.currentUser?.id).toBe(AMY.id));
    await waitFor(() => expect(logIds()).toEqual(['log-new', 'log-old']));
    await waitFor(() => expect(sessionIds()).toEqual(['s-new', 's-old']));
    await waitFor(() => expect(api.getBodyStats(AMY.id)).toHaveLength(12));
  });
});

// B76 step 2: a client's summary (functions/clientSummary.js) arrives on their user doc, so
// the coach's app needs no listener of that client's own — 214 of them at 100 clients
// before (reports/load-test-2026-10-24.md).
describe('clients with a server-kept summary (B76 step 2)', () => {
  const old = localDateAdd(-200);
  const summary = {
    version: 1,
    recentLogs: [{ id: 'log-old', date: old, planId: null, workoutName: 'Hill sprints' }],
    lastSession: { id: 's-old', date: localDateAdd(-150), type: 'Assessment' },
    latestBodyStat: { date: old, weight: 70, bodyFat: 18 },
  };
  const ownListeners = (id) => fb.listeners.filter(l => (l.q.col === 'workoutLogs' && l.q.filters.some(f => f.value === id))
    || l.q.col === `bodyStats/${id}/entries`);

  beforeEach(() => {
    fb.docs.users = [COACH, { ...AMY, summary }];
    fb.docs.workoutLogs = [{ id: 'log-old', clientId: AMY.id, trainerId: COACH.id, date: old, entries: [{ exerciseId: 'squat' }] }];
    fb.docs.schedule = [{ id: 's-old', trainerId: COACH.id, clientId: AMY.id, date: localDateAdd(-150), time: '10:00', status: 'completed', type: 'Assessment' }];
  });

  test('no listener of their own; logs, body stats and last session come from the summary', async () => {
    await signIn();
    await waitFor(() => expect(api.getWorkoutLogs(AMY.id).map(l => l.id)).toEqual(['log-old']));
    expect(ownListeners(AMY.id)).toEqual([]);
    expect(api.getWorkoutLogs(AMY.id)[0]).toMatchObject({ date: old, workoutName: 'Hill sprints', entries: [] });
    expect(api.getBodyStats(AMY.id)).toEqual([expect.objectContaining({ weight: 70, bodyFat: 18 })]);
    expect(api.getSchedule({ clientId: AMY.id, includeLastCompleted: true }).map(s => s.id)).toEqual(['s-old']);
    expect(api.getSchedule({ clientId: AMY.id }).map(s => s.id)).toEqual([]);   // never onto the calendar
    expect(api.historyStart(AMY.id)).toBeNull();                                 // the summary covers all of it
    expect(fb.called).not.toContain('ensureClientSummaries');
  });

  test('a page watching the client still gets the full history, sets and all', async () => {
    await signIn();
    let release;
    act(() => { release = api.watchClientHistory([AMY.id]); });
    await waitFor(() => expect(api.historyComplete(AMY.id)).toBe(true));
    expect(api.getWorkoutLogs(AMY.id)[0].entries).toEqual([{ exerciseId: 'squat' }]);
    act(() => release());
  });

  test('a client without one is listened to as before, and the server is asked once to build it', async () => {
    fb.docs.users = [COACH, { ...AMY }];
    await signIn();
    await waitFor(() => expect(ownListeners(AMY.id).length).toBe(2));
    await waitFor(() => expect(fb.called.filter(n => n === 'ensureClientSummaries')).toHaveLength(1));

    fb.docs.users = [COACH, { ...AMY, summary }];   // the server built it
    await act(async () => { firestore.__answerAll('users'); });
    await waitFor(() => expect(ownListeners(AMY.id)).toEqual([]));
    expect(fb.called.filter(n => n === 'ensureClientSummaries')).toHaveLength(1);
  });

  test('a summary of another version counts as missing', async () => {
    fb.docs.users = [COACH, { ...AMY, summary: { ...summary, version: 0 } }];
    await signIn();
    await waitFor(() => expect(fb.called).toContain('ensureClientSummaries'));
    expect(ownListeners(AMY.id).length).toBe(2);
  });
});

