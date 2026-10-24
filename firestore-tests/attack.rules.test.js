const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where } = require('firebase/firestore');

// Pre-App-Store security audit, 2026-10-23 (reports/appstore-security-audit-2026-10-23.md).
// Two coaches, each with a client, and nobody signed in — every attack the audit tried.
//
// Every test asserts the safe behaviour and must stay green. The ones named "was a hole
// until 2026-10-23" were holes the audit found and proved in the emulator (Ani approved
// fixing them the same day); each failed against the old rules.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-attack';
const A = 'coachA';
const B = 'coachB';
const A_CLIENT = 'clientA';
const B_CLIENT = 'clientB';

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    const put = (p, d) => setDoc(doc(db, ...p.split('/')), d);
    await put(`users/${A}`, { id: A, role: 'trainer', name: 'Coach A', bankDetails: { accountNumber: '11111111' } });
    await put(`users/${B}`, { id: B, role: 'trainer', name: 'Coach B' });
    await put(`users/${A_CLIENT}`, { id: A_CLIENT, role: 'client', trainerId: A, name: 'Amy', totalSessions: 4, sessionOffset: 1 });
    await put(`users/${B_CLIENT}`, { id: B_CLIENT, role: 'client', trainerId: B, name: 'Ben' });
    await put('schedule/s1', { id: 's1', trainerId: A, clientId: A_CLIENT, date: '2026-11-01', time: '10:00', status: 'confirmed', notes: 'knee' });
    await put('workoutPlans/p1', { id: 'p1', trainerId: A, clientId: A_CLIENT, name: 'Plan A', exercises: [] });
    await put(`bodyStats/${A_CLIENT}`, { clientId: A_CLIENT });
    await put(`bodyStats/${A_CLIENT}/entries/e1`, { weight: 70 });
    await put(`intakeForms/${A_CLIENT}`, { clientId: A_CLIENT, injuries: 'left knee' });
    await put('invoices/i1', { id: 'i1', trainerId: A, clientId: A_CLIENT, amount: 100 });
    await put('creditLedger/l1', { id: 'l1', trainerId: A, clientId: A_CLIENT, qty: 4 });
    await put('workoutLogs/w1', { id: 'w1', clientId: A_CLIENT, trainerId: A, createdBy: A_CLIENT, entries: [] });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('nobody signed in reads nothing', () => {
  test.each([
    `users/${A}`, `users/${A_CLIENT}`, 'schedule/s1', 'workoutPlans/p1', `bodyStats/${A_CLIENT}`,
    `intakeForms/${A_CLIENT}`, 'invoices/i1', 'creditLedger/l1', 'workoutLogs/w1',
  ])('%s', async (p) => {
    await assertFails(getDoc(doc(anon(), ...p.split('/'))));
  });
  test('nor lists users', async () => {
    await assertFails(getDocs(collection(anon(), 'users')));
  });
});

describe('a client cannot touch their own balance, role or coach', () => {
  test.each([
    ['totalSessions', 100], ['sessionOffset', 0], ['role', 'trainer'], ['trainerId', B],
    ['subscriptionTester', true], ['managed', true],
  ])('%s', async (field, value) => {
    await assertFails(updateDoc(doc(as(A_CLIENT), 'users', A_CLIENT), { [field]: value }));
  });
  test('…nor make their own booking free or a trial', async () => {
    await assertFails(setDoc(doc(as(A_CLIENT), 'schedule', 's2'), {
      id: 's2', trainerId: A, clientId: A_CLIENT, date: '2026-11-02', time: '10:00', status: 'pending', deductedAtBooking: true,
    }));
    await assertFails(setDoc(doc(as(A_CLIENT), 'schedule', 's3'), {
      id: 's3', trainerId: A, clientId: A_CLIENT, date: '2026-11-02', time: '10:00', status: 'confirmed',
    }));
  });
  test('…nor write their own credit ledger', async () => {
    await assertFails(setDoc(doc(as(A_CLIENT), 'creditLedger', 'l2'), { id: 'l2', trainerId: A, clientId: A_CLIENT, qty: 50 }));
  });
  test('…nor move a finished session to undo its charge', async () => {
    await assertFails(updateDoc(doc(as(A_CLIENT), 'schedule', 's1'), { date: '2027-01-01', status: 'cancelled' }));
  });
});

describe('a client cannot read another coach’s world', () => {
  test.each([
    `users/${A}`, `users/${A_CLIENT}`, 'schedule/s1', 'workoutPlans/p1', `bodyStats/${A_CLIENT}`,
    `bodyStats/${A_CLIENT}/entries/e1`, `intakeForms/${A_CLIENT}`, 'invoices/i1', 'creditLedger/l1', 'workoutLogs/w1',
  ])('%s', async (p) => {
    await assertFails(getDoc(doc(as(B_CLIENT), ...p.split('/'))));
  });
  test('nor lists another coach’s clients', async () => {
    await assertFails(getDocs(query(collection(as(B_CLIENT), 'users'), where('trainerId', '==', A))));
  });
});

describe('one coach cannot reach into another coach’s clients', () => {
  test.each([
    `users/${A_CLIENT}`, 'schedule/s1', 'workoutPlans/p1', `bodyStats/${A_CLIENT}`, `intakeForms/${A_CLIENT}`,
    'invoices/i1', 'creditLedger/l1', 'workoutLogs/w1',
  ])('B cannot read %s', async (p) => {
    await assertFails(getDoc(doc(as(B), ...p.split('/'))));
  });
  test('B cannot change A’s client’s balance, nor book them, nor add them credit', async () => {
    await assertFails(updateDoc(doc(as(B), 'users', A_CLIENT), { totalSessions: 0 }));
    await assertFails(setDoc(doc(as(B), 'schedule', 'sB'), { id: 'sB', trainerId: B, clientId: A_CLIENT, date: '2026-11-03', time: '09:00', status: 'confirmed' }));
    await assertFails(setDoc(doc(as(B), 'creditLedger', 'lB'), { id: 'lB', trainerId: B, clientId: A_CLIENT, qty: 1 }));
  });
  test('B cannot message A’s client', async () => {
    await assertFails(setDoc(doc(as(B), 'messages', 'mB'), {
      id: 'mB', from: B, to: A_CLIENT, text: 'hi', timestamp: '2026-10-23T10:00:00Z', read: false,
    }));
  });

  // ── Holes found by the audit (not yet fixed) ──
  // workoutPlans create checks the author is a trainer and writes their own trainerId,
  // but not that clientId is their client — and a client's app lists every plan whose
  // clientId is them. So B can put a plan (any text: a phone number, a "pay here" link)
  // in front of A's client.
  test('was a hole until 2026-10-23: B cannot create a workout plan addressed to A’s client', async () => {
    await assertFails(setDoc(doc(as(B), 'workoutPlans', 'pB'), { id: 'pB', trainerId: B, clientId: A_CLIENT, name: 'Call me', exercises: [] }));
  });
  test('was a hole until 2026-10-23: B cannot re-address B’s own plan to A’s client', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'workoutPlans', 'pB2'), { id: 'pB2', trainerId: B, clientId: B_CLIENT, name: 'x', exercises: [] }));
    await assertFails(updateDoc(doc(as(B), 'workoutPlans', 'pB2'), { clientId: A_CLIENT }));
  });
  // Same shape for invoices: clients read every invoice whose clientId is them, so B can
  // send A's client an invoice with B's own bank details on it.
  test('was a hole until 2026-10-23: B cannot create an invoice addressed to A’s client', async () => {
    await assertFails(setDoc(doc(as(B), 'invoices', 'iB'), { id: 'iB', trainerId: B, clientId: A_CLIENT, amount: 250 }));
  });
  test('…and A’s client really would see such a plan (why the holes above matter)', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'workoutPlans', 'pX'), { id: 'pX', trainerId: B, clientId: A_CLIENT, name: 'x' }));
    await assertSucceeds(getDoc(doc(as(A_CLIENT), 'workoutPlans', 'pX')));
  });
});

describe('nobody can pass as the owner', () => {
  // functions/index.js findOwner() picks "the owner" as the first users document whose
  // email field is the owner's address, then pushes signups and error reports to that
  // document's phones. The rules let any account write any email into its own profile, so
  // an account whose uid sorts first can take those alerts over (ext-identity-access).
  test('was a hole until 2026-10-23: a new account cannot put the owner’s address in its own profile', async () => {
    await assertFails(setDoc(doc(as('mallory'), 'users', 'mallory'), {
      id: 'mallory', role: 'trainer', name: 'M', email: 'aniho20@gmail.com',
    }));
  });
  test('was a hole until 2026-10-23: an existing account cannot change its email to the owner’s address', async () => {
    await assertFails(updateDoc(doc(as(B), 'users', B), { email: 'aniho20@gmail.com' }));
  });
  test('the owner-only collections still check the sign-in token, not the profile', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'platformEvents', 'e1'), { type: 'trainer_signup' }));
    await updateDoc(doc(as(B), 'users', B), { email: 'aniho20@gmail.com' }).catch(() => {});
    await assertFails(getDoc(doc(as(B), 'platformEvents', 'e1')));
  });
});

describe('a coach and their own client', () => {
  test('the coach reads their client’s body stats and intake form; the client reads the coach’s bank details', async () => {
    await assertSucceeds(getDoc(doc(as(A), 'bodyStats', A_CLIENT, 'entries', 'e1')));
    await assertSucceeds(getDoc(doc(as(A), 'intakeForms', A_CLIENT)));
    await assertSucceeds(getDoc(doc(as(A_CLIENT), 'users', A)));
  });
  // The comment above bodyStats says only the client deletes, but `allow write` (which
  // includes delete) also names the coach.
  test('was a hole until 2026-10-23: the coach cannot delete their client’s body-stats document', async () => {
    await assertFails(deleteDoc(doc(as(A), 'bodyStats', A_CLIENT)));
  });
  // The coach's app lists logs one client at a time (AppContext), so this query is the one
  // the rules must allow — a rule that only allowed single reads would empty the coach's list.
  test('the coach lists their client’s logs by client', async () => {
    await assertSucceeds(getDocs(query(collection(as(A), 'workoutLogs'), where('clientId', '==', A_CLIENT))));
  });
});

// The log carries the coach's id from when it was written. Reading went by that id, so a
// coach a client had left kept reading every log the client wrote while with them, and
// could list them all with where('trainerId', '==', coach) (Grok Bot review, 2026-10-24).
describe('a coach the client has left', () => {
  const leave = (to = null) => env.withSecurityRulesDisabled((c) => updateDoc(doc(c.firestore(), 'users', A_CLIENT), { trainerId: to }));

  test('was a hole until 2026-10-24: cannot read the client’s old logs', async () => {
    await leave();
    await assertFails(getDoc(doc(as(A), 'workoutLogs', 'w1')));
  });
  test('was a hole until 2026-10-24: cannot list them by their own coach id', async () => {
    await leave();
    await assertFails(getDocs(query(collection(as(A), 'workoutLogs'), where('trainerId', '==', A))));
  });
  test('…nor by the client', async () => {
    await leave();
    await assertFails(getDocs(query(collection(as(A), 'workoutLogs'), where('clientId', '==', A_CLIENT))));
  });
  test('the client still reads their own logs, and a new coach reads them', async () => {
    await leave(B);
    await assertSucceeds(getDoc(doc(as(A_CLIENT), 'workoutLogs', 'w1')));
    await assertSucceeds(getDocs(query(collection(as(B), 'workoutLogs'), where('clientId', '==', A_CLIENT))));
  });
});
