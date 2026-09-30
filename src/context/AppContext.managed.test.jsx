// @vitest-environment jsdom
//
// B35: what AppContext writes when a coach adds a client who does not use the app, checked
// against firestore.rules itself — the managed-client create branch is read from the file,
// not restated — and how removal is routed. firestore-tests/managedClient.rules.test.js
// proves the rule; this proves the app writes what the rule accepts. A mismatch between
// the two fails only on a phone, as "Couldn't add the client".
//
// Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const fb = vi.hoisted(() => ({
  user: { uid: 'coach-1', email: 'coach@example.test', displayName: 'Ani', photoURL: null },
  setDoc: null, updateDoc: null, callable: null,
}));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/firestore', () => {
  const token = (...args) => ({ args });
  return {
    collection: token, query: token, where: token, or: token, orderBy: token,
    doc: (_db, ...path) => ({ path: path.join('/') }),
    onSnapshot: () => () => {},
    setDoc: (...a) => fb.setDoc(...a),
    updateDoc: (...a) => fb.updateDoc(...a),
    addDoc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(),
    writeBatch: vi.fn(), runTransaction: vi.fn(),
  };
});
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => { cb(fb.user); return () => {}; },
  getRedirectResult: () => Promise.resolve(null),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(), signOut: vi.fn(), deleteUser: vi.fn(),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: (_functions, name) => (payload) => fb.callable(name, payload),
}));

const { AppProvider, useApp } = await import('./AppContext');

const rules = readFileSync(join(cwd(), 'firestore.rules'), 'utf8');
const managedBranch = (() => {
  const m = rules.match(/userId\.matches\('([^']+)'\)[\s\S]*?keys\(\)\.hasOnly\(\[([^\]]+)\]\)/);
  if (!m) throw new Error('managed-client create branch not found in firestore.rules — update this test');
  return { idPattern: new RegExp(`^${m[1]}$`), fields: m[2].split(',').map(s => s.trim().replace(/'/g, '')) };
})();
const exportedCallables = new Set(
  [...readFileSync(join(cwd(), 'functions/index.js'), 'utf8').matchAll(/^exports\.(\w+) = functions\.https\.onCall/gm)].map(m => m[1]),
);

let api;
function Grab() { api = useApp(); return null; }
async function renderApi() {
  render(<AppProvider><Grab /></AppProvider>);
  await waitFor(() => expect(api.firebaseUser).toBeTruthy());
  return api;
}

beforeEach(() => {
  fb.setDoc = vi.fn(async () => {});
  fb.updateDoc = vi.fn(async () => {});
  fb.callable = vi.fn(async () => ({ data: { removed: true } }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('adding a client without the app', () => {
  test('writes only what firestore.rules accepts, at an id only this path can use', async () => {
    const { addManagedClient } = await renderApi();
    await act(async () => { await addManagedClient('  Sam Taylor  '); });

    expect(fb.setDoc).toHaveBeenCalledTimes(1);
    const [ref, record] = fb.setDoc.mock.calls[0];
    expect(Object.keys(record).sort()).toEqual([...managedBranch.fields].sort());
    expect(record.id).toMatch(managedBranch.idPattern);
    expect(ref.path).toBe(`users/${record.id}`);
    expect(record).toMatchObject({ name: 'Sam Taylor', role: 'client', managed: true, trainerId: 'coach-1' });
  });

  test('the new client appears in the coach\'s list straight away', async () => {
    const app = await renderApi();
    let record;
    await act(async () => { record = await app.addManagedClient('Sam'); });
    await waitFor(() => expect(api.getClient(record.id)).toMatchObject({ name: 'Sam', managed: true }));
  });

  test('an empty name writes nothing', async () => {
    const { addManagedClient } = await renderApi();
    await expect(addManagedClient('   ')).rejects.toThrow();
    expect(fb.setDoc).not.toHaveBeenCalled();
  });
});

describe('removing a client', () => {
  test('without the app: the server deletes it, by the name the server exports', async () => {
    const app = await renderApi();
    let record;
    await act(async () => { record = await app.addManagedClient('Sam'); });
    await act(async () => { await api.removeClient(record.id); });
    expect(fb.callable).toHaveBeenCalledWith('removeManagedClient', { clientId: record.id });
    expect(exportedCallables).toContain('removeManagedClient');
    expect(fb.updateDoc).not.toHaveBeenCalled();
    await waitFor(() => expect(api.getClient(record.id)).toBeUndefined());
  });

  test('with an account: detached as before, no server call', async () => {
    const { removeClient } = await renderApi();
    await act(async () => { await removeClient('real-client-uid'); });
    expect(fb.updateDoc).toHaveBeenCalledWith({ path: 'users/real-client-uid' }, { trainerId: null });
    expect(fb.callable).not.toHaveBeenCalled();
  });
});
