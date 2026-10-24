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

const fb = vi.hoisted(() => ({ profile: null, docs: {}, listeners: [], queries: [] }));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

vi.mock('firebase/firestore', () => {
  // Each listener answers from fb.docs[collection], filtered by its equality filters, and
  // answers again whenever the test changes that collection.
  const matches = (q, d) => q.filters.every(f => f.op === '==' && d[f.field] === f.value);
  const answer = (l) => l.next({ docs: (fb.docs[l.q.col] || []).filter(d => matches(l.q, d)).map(d => ({ id: d.id, data: () => d })) });
  return {
    collection: (_db, ...path) => ({ name: path.join('/') }),
    where: (field, op, value) => ({ field, op, value }),
    query: (col, ...filters) => ({ col: col.name, filters: filters.filter(f => f && f.field) }),
    or: (...filters) => ({ field: 'or', op: 'or', value: filters }),
    orderBy: () => null,
    doc: (_db, ...path) => ({ path: path.join('/') }),
    onSnapshot: (q, next) => {
      if (q.path) { queueMicrotask(() => next({ id: q.path, exists: () => false, data: () => undefined })); return () => {}; }
      fb.queries.push(q);
      const l = { q, next };
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

vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn(async () => ({ data: {} })) }));

const firestore = await import('firebase/firestore');
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
  fb.docs = {
    users: [COACH, AMY, BEN],
    workoutLogs: [
      { id: 'l-amy', clientId: AMY.id, trainerId: COACH.id, date: '2026-10-01', entries: [] },
      { id: 'l-ben', clientId: BEN.id, trainerId: COACH.id, date: '2026-10-02', entries: [] },
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
