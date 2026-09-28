// @vitest-environment jsdom
//
// The trainer's time zone reaches their profile, so the server can place a session's
// wall-clock time when judging a late cancel (functions/zonedTime.js). Firebase is
// replaced here; nothing reaches a real project (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';

const fb = vi.hoisted(() => ({ profile: null, updateDoc: null }));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  where: (field, op, value) => ({ field, op, value }),
  query: (col, ...filters) => ({ col: col.name, filters }),
  or: vi.fn(), orderBy: vi.fn(),
  doc: (_db, ...path) => ({ path: path.join('/') }),
  // Only the signed-in user's own profile listener answers; the rest stay silent.
  onSnapshot: (q, next) => {
    const self = q && q.col === 'users' && q.filters?.[0]?.field === 'id';
    if (self) {
      queueMicrotask(() => next({ docs: [{ id: fb.profile.id, data: () => fb.profile }] }));
    }
    return () => {};
  },
  updateDoc: (...a) => fb.updateDoc(...a),
  setDoc: vi.fn(), addDoc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(),
  writeBatch: vi.fn(), runTransaction: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => { cb({ uid: fb.profile.id, email: 'x@example.test' }); return () => {}; },
  getRedirectResult: () => Promise.resolve(null),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(), signOut: vi.fn(), deleteUser: vi.fn(),
}));

vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppProvider, useApp } = await import('./AppContext');

let api;
function Grab() { api = useApp(); return null; }

async function signIn(profile) {
  fb.profile = profile;
  render(<AppProvider><Grab /></AppProvider>);
  await waitFor(() => expect(api.currentUser?.id).toBe(profile.id));
}

const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

beforeEach(() => { fb.updateDoc = vi.fn(async () => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('trainer time zone', () => {
  test("a trainer with no saved zone gets this browser's", async () => {
    await signIn({ id: 't1', role: 'trainer', name: 'Ani' });
    await waitFor(() => expect(fb.updateDoc).toHaveBeenCalledWith({ path: 'users/t1' }, { timeZone: browserZone }));
    expect(fb.updateDoc).toHaveBeenCalledTimes(1);
  });

  test('a saved zone is left alone — opening the app abroad must not move every session', async () => {
    await signIn({ id: 't1', role: 'trainer', name: 'Ani', timeZone: 'Europe/London' });
    await new Promise(r => setTimeout(r, 20));
    expect(fb.updateDoc).not.toHaveBeenCalled();
  });

  test('a student is never given one — only the trainer\'s is read', async () => {
    await signIn({ id: 'c1', role: 'client', name: 'Sam', trainerId: null });
    await new Promise(r => setTimeout(r, 20));
    expect(fb.updateDoc).not.toHaveBeenCalled();
  });
});
