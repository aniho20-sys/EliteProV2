// @vitest-environment jsdom
//
// The student side of connecting to a coach, driven through the real sign-up screen.
//
// Since P2 + P3 (reports/production-audit-2026-09-28.md) the browser may no longer write
// trainerId or inviteCode: a student's coach is set by the connectWithInviteCode callable,
// a trainer's code by ensureInviteCode. The server half is covered against the emulator
// (functions/test/inviteCodes.test.js, firestore-tests/inviteCode.rules.test.js). What
// neither covers is the app itself — that tapping "Get Started" with a code actually calls
// those functions, by the names the server exports, with the payload the server reads, and
// creates a profile the rules accept. A mismatch in any of those fails only on a phone,
// and reads to the student as "check your connection".
//
// Firebase itself is replaced here, so nothing in this file can reach a real project (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

// jsdom makes import.meta.url an http URL, so files are found from the repo root.
const ROOT = cwd();
const source = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const fb = vi.hoisted(() => ({
  user: { uid: 'student-1', email: 'student@example.test', displayName: 'Sam', photoURL: null },
  setDoc: null,
  updateDoc: null,
  callable: null, // (name, payload) => Promise<{ data }>
}));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

vi.mock('firebase/firestore', () => {
  const token = (...args) => ({ args });
  return {
    collection: token, query: token, where: token, or: token, orderBy: token,
    doc: (_db, ...path) => ({ path: path.join('/') }),
    // Listeners never fire: this file is about writes, not about loading data.
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
const { ThemeProvider } = await import('./ThemeContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: RoleSelectPage } = await import('../pages/RoleSelectPage');

// ── What the server side actually accepts, read from the source rather than restated ──

const rulesSource = source('firestore.rules');
const functionsSource = source('functions/index.js');

// The field allowlist on `users` create — the only keys a new profile may carry.
const createAllowlist = (() => {
  const m = rulesSource.match(/request\.resource\.data\.role in \['trainer', 'client'\]\s*&& request\.resource\.data\.keys\(\)\.hasOnly\(\[([^\]]+)\]\)/);
  if (!m) throw new Error('users create allowlist not found in firestore.rules — update this test');
  return m[1].split(',').map(s => s.trim().replace(/'/g, ''));
})();

const exportedCallables = new Set(
  [...functionsSource.matchAll(/^exports\.(\w+) = functions\.https\.onCall/gm)].map(m => m[1]),
);

// ── Harness ──

let calls;

function renderSignUp() {
  return render(
    <AppProvider><ThemeProvider><LanguageProvider><RoleSelectPage /></LanguageProvider></ThemeProvider></AppProvider>,
  );
}

async function signUp({ role, name = 'Sam', code }) {
  renderSignUp();
  fireEvent.click(await screen.findByText(role === 'client' ? 'Client' : 'Trainer'));
  fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: name } });
  if (code !== undefined) {
    fireEvent.change(screen.getByPlaceholderText('e.g. AX7K2M'), { target: { value: code } });
  }
  fireEvent.click(screen.getByText('Get Started'));
}

let api;
function Grab() {
  api = useApp();
  return null;
}
async function renderApi() {
  render(<AppProvider><Grab /></AppProvider>);
  await waitFor(() => expect(api.firebaseUser).toBeTruthy());
  return api;
}

const trainerDataWrites = () => [
  ...fb.setDoc.mock.calls.filter(([, data]) => data && (data.trainerId || 'inviteCode' in data)),
  ...fb.updateDoc.mock.calls.filter(([, data]) => data && ('trainerId' in data || 'inviteCode' in data)),
];

beforeEach(() => {
  calls = [];
  fb.setDoc = vi.fn(async (ref, data) => { calls.push(['setDoc', ref.path, data]); });
  fb.updateDoc = vi.fn(async (ref, data) => { calls.push(['updateDoc', ref.path, data]); });
  fb.callable = vi.fn(async (name, payload) => {
    calls.push(['callable', name, payload]);
    if (name === 'resolveInviteCode' || name === 'connectWithInviteCode') {
      return payload.code === 'ANI123'
        ? { data: { found: true, trainer: { id: 'coach-ani', name: 'Ani' } } }
        : { data: { found: false } };
    }
    if (name === 'ensureInviteCode') return { data: { code: 'NEW234' } };
    throw new Error(`unexpected callable ${name}`);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// ── Sign-up screen ──

describe('student signs up with a coach\'s invite code', () => {
  test('the code is checked, the profile created, then the server connects them — in that order', async () => {
    await signUp({ role: 'client', code: 'ani123' });
    await waitFor(() => expect(calls.some(c => c[1] === 'connectWithInviteCode')).toBe(true));

    expect(calls.map(c => `${c[0]}:${c[1]}`)).toEqual([
      'callable:resolveInviteCode',
      'setDoc:users/student-1',
      'callable:connectWithInviteCode',
    ]);
    expect(calls[0][2]).toEqual({ code: 'ANI123' });
    expect(calls[2][2]).toEqual({ code: 'ANI123' });
  });

  test('the new profile carries only fields firestore.rules accepts, and no coach', async () => {
    await signUp({ role: 'client', code: 'ANI123' });
    await waitFor(() => expect(fb.setDoc).toHaveBeenCalled());

    const [, profile] = fb.setDoc.mock.calls[0];
    for (const key of Object.keys(profile)) expect(createAllowlist).toContain(key);
    expect(profile).toMatchObject({ id: 'student-1', role: 'client', trainerId: null });
    expect(profile).not.toHaveProperty('inviteCode');
  });

  test('the browser never writes a coach onto the student itself', async () => {
    await signUp({ role: 'client', code: 'ANI123' });
    await waitFor(() => expect(calls.some(c => c[1] === 'connectWithInviteCode')).toBe(true));
    expect(trainerDataWrites()).toEqual([]);
  });

  test('a wrong code is refused before any account is created', async () => {
    await signUp({ role: 'client', code: 'WRONG1' });
    expect(await screen.findByText(/Invalid invite code/)).toBeTruthy();
    expect(fb.setDoc).not.toHaveBeenCalled();
    expect(calls.map(c => c[1])).toEqual(['resolveInviteCode']);
  });

  test('a dropped connection says so, not "invalid code", and creates nothing', async () => {
    fb.callable = vi.fn(async () => { throw Object.assign(new Error('offline'), { code: 'functions/unavailable' }); });
    await signUp({ role: 'client', code: 'ANI123' });
    expect(await screen.findByText(/Could not check that invite code/)).toBeTruthy();
    expect(screen.queryByText(/Invalid invite code/)).toBeNull();
    expect(fb.setDoc).not.toHaveBeenCalled();
  });

  test('no code: the student is created unconnected and no server call is made', async () => {
    await signUp({ role: 'client' });
    await waitFor(() => expect(fb.setDoc).toHaveBeenCalled());
    expect(fb.callable).not.toHaveBeenCalled();
    expect(fb.setDoc.mock.calls[0][1].trainerId).toBeNull();
  });
});

describe('trainer signs up', () => {
  test('the profile has no self-chosen code; the server issues one', async () => {
    await signUp({ role: 'trainer' });
    await waitFor(() => expect(calls.some(c => c[1] === 'ensureInviteCode')).toBe(true));

    const [, profile] = fb.setDoc.mock.calls[0];
    for (const key of Object.keys(profile)) expect(createAllowlist).toContain(key);
    expect(profile.role).toBe('trainer');
    expect(profile).not.toHaveProperty('inviteCode');
    expect(profile).not.toHaveProperty('trainerId');
    expect(trainerDataWrites()).toEqual([]);
  });
});

// ── Profile → "Connect to coach" (connectToTrainer) ──

describe('connectToTrainer', () => {
  test('a valid code — pasted with stray spaces and invisible characters — connects via the server', async () => {
    const { connectToTrainer } = await renderApi();
    const res = await connectToTrainer('student-1', ' ani 123​');
    expect(res).toEqual({ success: true, trainer: { id: 'coach-ani', name: 'Ani' } });
    expect(calls).toEqual([['callable', 'connectWithInviteCode', { code: 'ANI123' }]]);
    expect(trainerDataWrites()).toEqual([]);
  });

  test('a wrong code is reported as invalid', async () => {
    const { connectToTrainer } = await renderApi();
    expect(await connectToTrainer('student-1', 'WRONG1')).toMatchObject({ success: false, reason: 'invalid' });
  });

  test('an empty code never reaches the server', async () => {
    const { connectToTrainer } = await renderApi();
    expect(await connectToTrainer('student-1', '  ')).toMatchObject({ success: false, reason: 'invalid' });
    expect(fb.callable).not.toHaveBeenCalled();
  });

  test('a server refusal and a dropped connection are told apart', async () => {
    fb.callable = vi.fn(async () => { throw Object.assign(new Error('no'), { code: 'functions/failed-precondition' }); });
    const { connectToTrainer } = await renderApi();
    expect(await connectToTrainer('student-1', 'ANI123')).toMatchObject({ success: false, reason: 'network' });

    fb.callable = vi.fn(async () => { throw Object.assign(new Error('no'), { code: 'functions/permission-denied' }); });
    expect(await connectToTrainer('student-1', 'ANI123')).toMatchObject({ success: false, reason: 'permission' });
  });
});

// ── The names above must be names the server exports ──

describe('callables the app uses exist on the server', () => {
  test.each(['resolveInviteCode', 'connectWithInviteCode', 'ensureInviteCode'])('%s', (name) => {
    expect(exportedCallables).toContain(name);
    // …and the app calls it by exactly that name.
    expect(source('src/context/AppContext.jsx')).toContain(`'${name}'`);
  });
});
