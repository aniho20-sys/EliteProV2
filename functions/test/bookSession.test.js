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

async function clearTestCollections() {
  const cols = ['users', 'schedule', 'workoutLogs'];
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
