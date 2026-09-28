const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');

// What a client may do to a session, and what they may put in a new booking.
//
// Two holes found by the production audit (reports/production-audit-2026-09-28.md), both
// reproduced on the emulator before this suite existed:
//   P4 — a client could change any field of their own session, so moving a finished session
//        into the future and cancelling it in the same write got the credit refunded.
//   P5 — a client could create a booking that already said deductedAtBooking: true, which
//        onScheduleBooked takes to mean "charged" and skips: a free session.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-schedule';
const COACH = 'coachA';
const CLIENT = 'client1';
const OTHER = 'client2';

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => { await env.cleanup(); });

const base = { trainerId: COACH, clientId: CLIENT, date: '2026-10-20', time: '10:00', type: 'PT Session' };

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'users', COACH), { id: COACH, role: 'trainer' });
    await setDoc(doc(db, 'users', CLIENT), { id: CLIENT, role: 'client', trainerId: COACH });
    await setDoc(doc(db, 'users', OTHER), { id: OTHER, role: 'client', trainerId: COACH });
    await setDoc(doc(db, 'schedule', 'upcoming'), { ...base, status: 'confirmed', deductedAtBooking: true });
    await setDoc(doc(db, 'schedule', 'done'), { ...base, date: '2026-09-01', status: 'completed', deductedAtBooking: true });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();

describe('client updates', () => {
  test('may cancel their own upcoming session', async () => {
    await assertSucceeds(updateDoc(doc(as(CLIENT), 'schedule', 'upcoming'), { status: 'cancelled' }));
  });

  test('may cancel late, with the late-cancel flag', async () => {
    await assertSucceeds(updateDoc(doc(as(CLIENT), 'schedule', 'upcoming'), { status: 'cancelled', lateCancellation: true }));
  });

  test('P4: may not move the date while cancelling', async () => {
    await assertFails(updateDoc(doc(as(CLIENT), 'schedule', 'upcoming'), { status: 'cancelled', date: '2026-12-01' }));
  });

  test('P4: may not cancel a session that already happened', async () => {
    await assertFails(updateDoc(doc(as(CLIENT), 'schedule', 'done'), { status: 'cancelled' }));
  });

  test('may not reschedule, complete, or touch credit fields', async () => {
    const ref = doc(as(CLIENT), 'schedule', 'upcoming');
    await assertFails(updateDoc(ref, { date: '2026-12-01' }));
    await assertFails(updateDoc(ref, { status: 'completed' }));
    await assertFails(updateDoc(ref, { status: 'cancelled', deductedAtBooking: false }));
  });

  test('may not delete a session', async () => {
    await assertFails(deleteDoc(doc(as(CLIENT), 'schedule', 'done')));
  });

  test("may not touch another client's session", async () => {
    await assertFails(updateDoc(doc(as(OTHER), 'schedule', 'upcoming'), { status: 'cancelled' }));
  });
});

describe('trainer updates', () => {
  test('may still reschedule, complete, reopen and delete', async () => {
    const db = as(COACH);
    await assertSucceeds(updateDoc(doc(db, 'schedule', 'upcoming'), { date: '2026-10-21', time: '11:00' }));
    await assertSucceeds(updateDoc(doc(db, 'schedule', 'upcoming'), { status: 'completed' }));
    await assertSucceeds(updateDoc(doc(db, 'schedule', 'upcoming'), { status: 'confirmed' }));
    await assertSucceeds(deleteDoc(doc(db, 'schedule', 'done')));
  });

  test('may not move a session to another client', async () => {
    await assertFails(updateDoc(doc(as(COACH), 'schedule', 'upcoming'), { clientId: OTHER }));
  });
});

describe('client bookings', () => {
  test('a plain pending booking with their own coach is allowed', async () => {
    await assertSucceeds(setDoc(doc(as(CLIENT), 'schedule', 'new1'), { ...base, id: 'new1', status: 'pending', duration: 60 }));
  });

  test('P5: may not pre-mark a booking as already charged', async () => {
    await assertFails(setDoc(doc(as(CLIENT), 'schedule', 'new2'), { ...base, id: 'new2', status: 'pending', deductedAtBooking: true }));
  });

  test('may not create a booking that is already completed, or a blocked slot', async () => {
    await assertFails(setDoc(doc(as(CLIENT), 'schedule', 'new3'), { ...base, id: 'new3', status: 'completed' }));
    await assertFails(setDoc(doc(as(CLIENT), 'schedule', 'new4'), { ...base, id: 'new4', status: 'pending', isBlocked: true }));
  });
});
