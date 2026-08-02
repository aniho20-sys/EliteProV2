'use strict';

/**
 * Regression tests for the session-credit Cloud Functions.
 *
 * ARCHITECTURE UNDER TEST
 * ────────────────────────
 * Sessions ARE session credit: `onScheduleBooked` (onCreate on `schedule/{id}`)
 * deducts 1 from `sessionOffset` the moment a real session is booked and marks
 * the schedule doc `deductedAtBooking: true`. `onScheduleCreditUpdate` (onUpdate
 * on `schedule/{id}`) then handles what happens next:
 *   - cancel >=24h before the session refunds 1 credit, capped at 2 free
 *     early-cancels per client per calendar month
 *   - cancel <24h before keeps the charge
 *   - bookings made before this shipped (no `deductedAtBooking` flag) are
 *     caught up instead: late-cancel or Mark Complete charges them exactly
 *     once; early-cancel stays free (mirrors the old client-side behaviour)
 *   - once `deductedAtBooking` is set, Mark Complete is a no-op (already paid)
 *
 * These tests exercise the real exported functions against the Firestore
 * emulator — no mocking of `db.runTransaction` or Firestore reads/writes.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 *
 * The FIRESTORE_EMULATOR_HOST env var must be set BEFORE firebase-admin
 * initializes. Jest's resetModules:true in jest.config.js ensures each test
 * file gets a fresh module registry, so setting it at the top of this file
 * is sufficient.
 */

// ── Must be set before any firebase import ──
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-16718';

const functionsTest = require('firebase-functions-test')({ projectId: 'elitepro-16718' });
const myFunctions = require('../index');

const admin = require('firebase-admin');
const db = admin.firestore();

const wrappedOnScheduleBooked = functionsTest.wrap(myFunctions.onScheduleBooked);
const wrappedOnScheduleCreditUpdate = functionsTest.wrap(myFunctions.onScheduleCreditUpdate);
const wrappedOnNewWorkoutLog = functionsTest.wrap(myFunctions.onNewWorkoutLog);

// ── Test fixture IDs ──
const TRAINER_ID = 'test-trainer-t1';
const CLIENT_ID = 'test-client-c1';

// ── Helpers ──

async function ledgerEntries() {
  const snap = await db.collection('creditLedger').where('clientId', '==', CLIENT_ID).get();
  return snap.docs.map(d => d.data());
}

async function clearTestCollections() {
  const cols = ['users', 'schedule', 'workoutLogs', 'creditLedger'];
  await Promise.all(cols.map(async (col) => {
    const snap = await db.collection(col).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }));
}

async function seedClient(overrides = {}) {
  await db.doc(`users/${TRAINER_ID}`).set({ id: TRAINER_ID, role: 'trainer', name: 'Test Trainer' });
  await db.doc(`users/${CLIENT_ID}`).set({
    id: CLIENT_ID,
    role: 'client',
    name: 'Test Client',
    trainerId: TRAINER_ID,
    sessionOffset: 0,
    ...overrides,
  });
}

function getClient() {
  return db.doc(`users/${CLIENT_ID}`).get().then(s => s.data());
}

// Returns { date, time } for a session `hoursFromNow` away, so late/early
// cancellation tests don't depend on wall-clock time when the suite runs.
function sessionDateTime(hoursFromNow) {
  const dt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const date = dt.toISOString().slice(0, 10);
  const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

async function createSchedule(fields) {
  const ref = await db.collection('schedule').add({
    trainerId: TRAINER_ID,
    clientId: CLIENT_ID,
    type: 'PT Session',
    duration: 60,
    status: 'pending',
    ...fields,
  });
  const snap = await ref.get();
  return { ref, snap };
}

async function updateScheduleStatus(ref, beforeSnap, newFields) {
  const afterRef = ref;
  await afterRef.update(newFields);
  const afterSnap = await afterRef.get();
  return functionsTest.makeChange(beforeSnap, afterSnap);
}

// ── Tests ──

describe('onScheduleBooked (deduct 1 credit at booking time)', () => {
  beforeEach(async () => {
    await clearTestCollections();
  });

  afterAll(() => {
    functionsTest.cleanup();
  });

  test('real booking deducts 1 credit and marks deductedAtBooking', async () => {
    await seedClient({ sessionOffset: 3 });
    const { snap } = await createSchedule(sessionDateTime(48));

    await wrappedOnScheduleBooked(snap);

    const client = await getClient();
    expect(client.sessionOffset).toBe(4);
    const schedAfter = await snap.ref.get();
    expect(schedAfter.data().deductedAtBooking).toBe(true);
  });

  test('blocked time slot is not charged', async () => {
    await seedClient({ sessionOffset: 0 });
    const { snap } = await createSchedule({ ...sessionDateTime(48), isBlocked: true, clientId: '' });

    await wrappedOnScheduleBooked(snap);

    const client = await getClient();
    expect(client.sessionOffset).toBe(0);
    const schedAfter = await snap.ref.get();
    expect(schedAfter.data().deductedAtBooking).toBeUndefined();
  });

  test('missing client doc does not crash and does not write a flag', async () => {
    const { snap } = await createSchedule({ ...sessionDateTime(48), clientId: 'no-such-client' });

    await expect(wrappedOnScheduleBooked(snap)).resolves.not.toThrow();
    const schedAfter = await snap.ref.get();
    expect(schedAfter.data().deductedAtBooking).toBeUndefined();
  });
});

describe('onScheduleCreditUpdate — cancellation', () => {
  beforeEach(async () => {
    await clearTestCollections();
  });

  afterAll(() => {
    functionsTest.cleanup();
  });

  test('new-model booking cancelled >=24h before refunds 1 credit', async () => {
    await seedClient({ sessionOffset: 4 });
    const { ref, snap } = await createSchedule({ ...sessionDateTime(48), deductedAtBooking: true });

    const change = await updateScheduleStatus(ref, snap, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(3);
    expect(client.earlyCancelCount).toBe(1);
  });

  test('new-model booking cancelled <24h before keeps the charge', async () => {
    await seedClient({ sessionOffset: 4 });
    const { ref, snap } = await createSchedule({ ...sessionDateTime(2), deductedAtBooking: true });

    const change = await updateScheduleStatus(ref, snap, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(4);
    expect(client.earlyCancelCount).toBeUndefined();
  });

  test('early-cancel cap: 3rd early cancel in the same month is not refunded', async () => {
    const month = new Date().toISOString().slice(0, 7);
    await seedClient({ sessionOffset: 6, earlyCancelMonth: month, earlyCancelCount: 2 });
    const { ref, snap } = await createSchedule({ ...sessionDateTime(48), deductedAtBooking: true });

    const change = await updateScheduleStatus(ref, snap, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(6); // unchanged — cap already used up
    expect(client.earlyCancelCount).toBe(2);
  });

  test('early-cancel cap resets in a new calendar month', async () => {
    await seedClient({ sessionOffset: 6, earlyCancelMonth: '2020-01', earlyCancelCount: 2 });
    const { ref, snap } = await createSchedule({ ...sessionDateTime(48), deductedAtBooking: true });

    const change = await updateScheduleStatus(ref, snap, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(5); // refunded — stale month doesn't count
    expect(client.earlyCancelCount).toBe(1);
  });

  test('legacy booking (no deductedAtBooking) cancelled <24h charges now', async () => {
    await seedClient({ sessionOffset: 2 });
    const { ref, snap } = await createSchedule(sessionDateTime(2)); // no deductedAtBooking flag

    const change = await updateScheduleStatus(ref, snap, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(3);
  });

  test('legacy booking cancelled >=24h stays free (never charged)', async () => {
    await seedClient({ sessionOffset: 2 });
    const { ref, snap } = await createSchedule(sessionDateTime(48)); // no deductedAtBooking flag

    const change = await updateScheduleStatus(ref, snap, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(2);
  });
});

describe('onScheduleCreditUpdate — Mark Complete', () => {
  beforeEach(async () => {
    await clearTestCollections();
  });

  afterAll(() => {
    functionsTest.cleanup();
  });

  test('new-model booking marked complete is a no-op (already charged at booking)', async () => {
    await seedClient({ sessionOffset: 4 });
    const { ref, snap } = await createSchedule({ ...sessionDateTime(-1), deductedAtBooking: true });

    const change = await updateScheduleStatus(ref, snap, { status: 'completed' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(4);
  });

  test('legacy booking (no deductedAtBooking) marked complete charges exactly once', async () => {
    await seedClient({ sessionOffset: 2 });
    const { ref, snap } = await createSchedule(sessionDateTime(-1)); // no flag

    const change = await updateScheduleStatus(ref, snap, { status: 'completed' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(3);
  });

  test('no-op when status is unchanged', async () => {
    await seedClient({ sessionOffset: 2 });
    const { ref, snap } = await createSchedule({ ...sessionDateTime(-1), deductedAtBooking: true });

    const change = await updateScheduleStatus(ref, snap, { notes: 'edited note, same status' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.sessionOffset).toBe(2);
  });
});

describe('Reopen (undo Mark Complete)', () => {
  beforeEach(clearTestCollections);

  test('legacy booking: complete -> reopen -> complete charges exactly once, not twice', async () => {
    await seedClient({ sessionOffset: 2, totalSessions: 10 });
    const { ref, snap } = await createSchedule(sessionDateTime(-1)); // legacy, no flag

    // 1. Mark Complete — legacy bookings are charged here
    const toComplete = await updateScheduleStatus(ref, snap, { status: 'completed' });
    await wrappedOnScheduleCreditUpdate(toComplete);
    expect((await getClient()).sessionOffset).toBe(3);

    // 2. Reopen — must refund, or the next complete double-charges
    const completedSnap = await ref.get();
    const toReopen = await updateScheduleStatus(ref, completedSnap, { status: 'confirmed' });
    await wrappedOnScheduleCreditUpdate(toReopen);
    expect((await getClient()).sessionOffset).toBe(2);

    // 3. Complete again — back to charged exactly once overall
    const reopenedSnap = await ref.get();
    const toCompleteAgain = await updateScheduleStatus(ref, reopenedSnap, { status: 'completed' });
    await wrappedOnScheduleCreditUpdate(toCompleteAgain);
    expect((await getClient()).sessionOffset).toBe(3);
  });

  test('new-model booking: complete -> reopen -> complete never moves credit', async () => {
    await seedClient({ sessionOffset: 5, totalSessions: 10 });
    const { ref, snap } = await createSchedule({ ...sessionDateTime(-1), deductedAtBooking: true });

    const toComplete = await updateScheduleStatus(ref, snap, { status: 'completed' });
    await wrappedOnScheduleCreditUpdate(toComplete);
    expect((await getClient()).sessionOffset).toBe(5);

    const completedSnap = await ref.get();
    const toReopen = await updateScheduleStatus(ref, completedSnap, { status: 'confirmed' });
    await wrappedOnScheduleCreditUpdate(toReopen);
    expect((await getClient()).sessionOffset).toBe(5);

    const reopenedSnap = await ref.get();
    const toCompleteAgain = await updateScheduleStatus(ref, reopenedSnap, { status: 'completed' });
    await wrappedOnScheduleCreditUpdate(toCompleteAgain);
    expect((await getClient()).sessionOffset).toBe(5); // charged at booking, never here
  });
});

describe('credit overdraft (1-session hard cap)', () => {
  beforeEach(clearTestCollections);

  test('booking at 0 remaining goes to -1 and records an overdraft ledger entry', async () => {
    await seedClient({ sessionOffset: 10, totalSessions: 10 }); // remaining = 0
    const { snap } = await createSchedule(sessionDateTime(48));

    await wrappedOnScheduleBooked(snap);

    const client = await getClient();
    expect(client.sessionOffset).toBe(11);
    expect(client.totalSessions - client.sessionOffset).toBe(-1); // owes 1

    const ledger = await ledgerEntries();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ type: 'overdraft', qty: -1, addedBy: 'system' });
  });

  test('the overdrawn booking is flagged bookedOnCredit', async () => {
    await seedClient({ sessionOffset: 10, totalSessions: 10 });
    const { ref, snap } = await createSchedule(sessionDateTime(48));

    await wrappedOnScheduleBooked(snap);

    expect((await ref.get()).data().bookedOnCredit).toBe(true);
  });

  test('a normal booking with credit left writes no ledger entry', async () => {
    await seedClient({ sessionOffset: 2, totalSessions: 10 }); // remaining = 8
    const { ref, snap } = await createSchedule(sessionDateTime(48));

    await wrappedOnScheduleBooked(snap);

    expect(await ledgerEntries()).toHaveLength(0);
    expect((await ref.get()).data().bookedOnCredit).toBeUndefined();
  });

  test('a client with no package set (totalSessions null) never overdrafts', async () => {
    await seedClient({ sessionOffset: 99 }); // no totalSessions — unlimited
    const { snap } = await createSchedule(sessionDateTime(48));

    await wrappedOnScheduleBooked(snap);

    expect(await ledgerEntries()).toHaveLength(0);
  });

  test('topping up after an overdraft nets off the owed session automatically', async () => {
    await seedClient({ sessionOffset: 10, totalSessions: 10 });
    const { snap } = await createSchedule(sessionDateTime(48));
    await wrappedOnScheduleBooked(snap); // now offset 11 / total 10 => -1

    // Top-up is a plain totalSessions increase (addCreditLedgerEntry) — the
    // debt repays itself through remaining = total - offset, with no special
    // "repay" step anywhere.
    await db.doc(`users/${CLIENT_ID}`).update({ totalSessions: 20 });

    const client = await getClient();
    expect(client.totalSessions - client.sessionOffset).toBe(9); // 10 bought - 1 owed
  });

  // Field-reported 2026-08-02: a client used book -> cancel -> book and the
  // second booking appeared not to count. The cycle itself turned out to be
  // accounted for correctly; what was actually broken is covered by the two
  // cap tests below.
  test('0 credit -> book -> early cancel -> book again still counts as an overdraft', async () => {
    await seedClient({ sessionOffset: 10, totalSessions: 10 }); // remaining = 0

    const first = await createSchedule(sessionDateTime(48));
    await wrappedOnScheduleBooked(first.snap);
    expect((await getClient()).totalSessions - (await getClient()).sessionOffset).toBe(-1);

    const afterBooking = await first.ref.get();
    const cancel = await updateScheduleStatus(first.ref, afterBooking, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(cancel);
    expect((await getClient()).totalSessions - (await getClient()).sessionOffset).toBe(0);

    // Re-booking after the refund must overdraw again — not slip through free.
    const second = await createSchedule(sessionDateTime(72));
    await wrappedOnScheduleBooked(second.snap);

    const client = await getClient();
    expect(client.totalSessions - client.sessionOffset).toBe(-1); // owes again
    expect((await second.ref.get()).data().bookedOnCredit).toBe(true);

    // Ledger must still reconcile to the real balance, not drift.
    const ledger = await ledgerEntries();
    expect(ledger.reduce((sum, e) => sum + e.qty, 0)).toBe(-1);
  });

  test('a booking that would exceed the 1-session cap is rejected server-side, not charged', async () => {
    await seedClient({ sessionOffset: 11, totalSessions: 10 }); // already at -1
    const { ref, snap } = await createSchedule(sessionDateTime(48));

    await wrappedOnScheduleBooked(snap);

    // The UI blocks this, but the UI reads a lagging listener — the function is
    // the only place with a consistent balance, so it has to hold the line too.
    expect((await ref.get()).exists).toBe(false); // booking removed
    const client = await getClient();
    expect(client.sessionOffset).toBe(11); // not charged
    expect(await ledgerEntries()).toHaveLength(0);
  });

  test('two rapid bookings at 0 credit cannot both overdraw (the real bypass)', async () => {
    await seedClient({ sessionOffset: 10, totalSessions: 10 }); // remaining = 0

    // Both are created before either trigger runs — exactly what happens when a
    // client taps Book twice before the listener catches up.
    const a = await createSchedule(sessionDateTime(48));
    const b = await createSchedule(sessionDateTime(72));
    await wrappedOnScheduleBooked(a.snap);
    await wrappedOnScheduleBooked(b.snap);

    const client = await getClient();
    expect(client.totalSessions - client.sessionOffset).toBe(-1); // capped, NOT -2
    expect((await a.ref.get()).exists).toBe(true);
    expect((await b.ref.get()).exists).toBe(false); // second one rejected
    expect(await ledgerEntries()).toHaveLength(1);
  });

  test('early-cancelling the overdrawn booking refunds it and reverses the ledger entry', async () => {
    await seedClient({ sessionOffset: 10, totalSessions: 10 });
    const { ref, snap } = await createSchedule(sessionDateTime(48));
    await wrappedOnScheduleBooked(snap);

    const afterBooking = await ref.get();
    const change = await updateScheduleStatus(ref, afterBooking, { status: 'cancelled' });
    await wrappedOnScheduleCreditUpdate(change);

    const client = await getClient();
    expect(client.totalSessions - client.sessionOffset).toBe(0); // no longer owes

    const ledger = await ledgerEntries();
    expect(ledger).toHaveLength(2);
    // Append-only: the debt entry stays, a reversing entry is added on top, so
    // the ledger still sums to the client's real balance.
    expect(ledger.reduce((sum, e) => sum + e.qty, 0)).toBe(0);
    expect(ledger.some(e => e.type === 'overdraft_reversed' && e.qty === 1)).toBe(true);
  });
});

/**
 * ⚠️ GUARDIAN TEST — DO NOT DELETE OR "SIMPLIFY" ⚠️
 *
 * This block exists specifically to prevent workout logs and session status
 * from ever becoming coupled. See CLAUDE.md convention #32.
 *
 * A client logging a workout is THEIR OWN training record — including
 * sessions they did alone at the gym with no coach involved. It must never
 * mark a scheduled session complete, and must never spend a session credit.
 * The only thing that completes a session is the trainer pressing Mark
 * Complete in the recap modal.
 *
 * If someone later "optimises" this by auto-completing a session when a
 * matching log appears, this test fails — and that failure is correct.
 * The fix is to revert the optimisation, not to update the test.
 */
describe('GUARDIAN: workout logs must never touch session status or credit', () => {
  beforeEach(clearTestCollections);

  test('creating a workout log leaves session status and sessionOffset untouched', async () => {
    await seedClient({ sessionOffset: 3, totalSessions: 10 });

    // A confirmed session booked for the same day the client logs a workout —
    // the exact shape someone would be tempted to auto-complete.
    const { date } = sessionDateTime(2);
    const { ref } = await createSchedule({
      ...sessionDateTime(2),
      status: 'confirmed',
      deductedAtBooking: true,
    });

    const logRef = await db.collection('workoutLogs').add({
      clientId: CLIENT_ID,
      date,
      logType: 'self_training',
      entries: [{ exerciseId: 'squat', unit: 'weight_reps', sets: [{ weight: 60, reps: 5, completed: true }] }],
      notes: 'Trained solo at the gym',
    });
    const logSnap = await logRef.get();

    await wrappedOnNewWorkoutLog(logSnap);

    const session = (await ref.get()).data();
    expect(session.status).toBe('confirmed'); // NOT 'completed'

    const client = await getClient();
    expect(client.sessionOffset).toBe(3); // unchanged — no credit spent
  });

  test('a trainer-logged pt_session log also does not complete the session or charge again', async () => {
    await seedClient({ sessionOffset: 3, totalSessions: 10 });

    const { date } = sessionDateTime(2);
    const { ref } = await createSchedule({
      ...sessionDateTime(2),
      status: 'confirmed',
      deductedAtBooking: true,
    });

    const logRef = await db.collection('workoutLogs').add({
      clientId: CLIENT_ID,
      trainerId: TRAINER_ID,
      date,
      logType: 'pt_session',
      entries: [],
    });
    const logSnap = await logRef.get();

    await wrappedOnNewWorkoutLog(logSnap);

    const session = (await ref.get()).data();
    expect(session.status).toBe('confirmed');

    const client = await getClient();
    expect(client.sessionOffset).toBe(3);
  });
});
