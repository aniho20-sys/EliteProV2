'use strict';

/**
 * Regression tests for the credit booking system.
 *
 * ROOT CAUSE OF THE BUG THIS COVERS
 * ──────────────────────────────────
 * The migration in AppContext.jsx filtered clients with `u.totalSessions != null`,
 * so clients without a session quota were never migrated → creditBalance stayed null.
 * In handleAdd(), the guard `if (creditBalance !== null)` was false, so the code
 * fell through to the legacy addScheduleItem() path — creating the schedule doc
 * without calling bookSession() → no credit deduction, no ledger entry.
 *
 * FIX: Migration now runs for ALL trainer clients regardless of totalSessions.
 *
 * WHY THE ACCEPTANCE TEST MISSED IT
 * ───────────────────────────────────
 * Round 3 scenario 1 seeded creditBalance directly via adjustClientCredits(), so
 * creditBalance was never null. The "fresh migration" path was never exercised.
 *
 * HOW THESE TESTS PREVENT REGRESSION
 * ────────────────────────────────────
 * 1. Server-side: The CF rejects booking when creditBalance is 0 or null (via ??"0"
 *    coercion). These tests hit the actual CF logic via the emulator — no mocking.
 * 2. Atomic writes: We verify schedule + creditBalance + ledger are all written in
 *    the same transaction, so any partial-write regression would fail multiple asserts.
 *
 * HOW TO RUN
 * ──────────
 * 1. Start Firestore emulator: firebase emulators:start --only firestore
 * 2. In another terminal: cd functions && npm test
 *
 * Or run both together: npm run test:emulator (from functions directory)
 *
 * The FIRESTORE_EMULATOR_HOST env var must be set BEFORE firebase-admin initializes.
 * Jest's resetModules:true in jest.config.js ensures each test file gets a fresh
 * module registry, so setting the env var at the top of this file is sufficient.
 */

// ── Must be set before any firebase import ──
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-16718';

// firebase-functions-test initializes the Admin SDK pointing at the emulator.
const functionsTest = require('firebase-functions-test')({ projectId: 'elitepro-16718' });

// Require index AFTER setting env vars — this triggers initializeApp() which
// picks up FIRESTORE_EMULATOR_HOST and routes all Firestore calls to the emulator.
const myFunctions = require('../index');

const admin = require('firebase-admin');
const db = admin.firestore();

// ── Test fixture IDs ──
const TRAINER_ID = 'test-trainer-t1';
const CLIENT_ID  = 'test-client-c1';

const BOOKING_DATA = {
  date: '2030-12-01', // far future so isMoreThan24HoursAway always returns true
  time: '10:00',
  type: 'PT Session',
  trainerId: TRAINER_ID,
  duration: 60,
  notes: '',
};

// ── Helpers ──

async function clearTestCollections() {
  const cols = ['users', 'schedule', 'creditLedger'];
  await Promise.all(cols.map(async (col) => {
    const snap = await db.collection(col).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }));
}

async function seedUsers(creditBalance) {
  await Promise.all([
    db.doc(`users/${TRAINER_ID}`).set({
      id: TRAINER_ID,
      role: 'trainer',
      name: 'Test Trainer',
    }),
    db.doc(`users/${CLIENT_ID}`).set({
      id: CLIENT_ID,
      role: 'client',
      name: 'Test Client',
      trainerId: TRAINER_ID,
      ...(creditBalance !== undefined ? { creditBalance } : {}),
    }),
  ]);
}

const wrappedBookSession = functionsTest.wrap(myFunctions.bookSession);

// ── Tests ──

describe('bookSession Cloud Function', () => {
  beforeEach(async () => {
    await clearTestCollections();
  });

  afterAll(() => {
    functionsTest.cleanup();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  test('success: deducts 1 credit, sets creditDeducted:true on schedule doc, writes ledger entry', async () => {
    await seedUsers(5);

    const result = await wrappedBookSession(BOOKING_DATA, { auth: { uid: CLIENT_ID } });

    // Return value
    expect(result.newBalance).toBe(4);
    expect(result.scheduleId).toBeTruthy();

    // creditBalance on users/{clientId} is now 4
    const clientSnap = await db.doc(`users/${CLIENT_ID}`).get();
    expect(clientSnap.data().creditBalance).toBe(4);

    // schedule doc exists with creditDeducted: true
    const schedSnap = await db.doc(`schedule/${result.scheduleId}`).get();
    expect(schedSnap.exists).toBe(true);
    const schedData = schedSnap.data();
    expect(schedData.creditDeducted).toBe(true);
    expect(schedData.clientId).toBe(CLIENT_ID);
    expect(schedData.trainerId).toBe(TRAINER_ID);
    expect(schedData.status).toBe('pending');
    expect(schedData.date).toBe(BOOKING_DATA.date);

    // Exactly one ledger entry for this booking
    const ledgerSnap = await db.collection('creditLedger')
      .where('clientId', '==', CLIENT_ID)
      .where('schedule_id', '==', result.scheduleId)
      .get();
    expect(ledgerSnap.size).toBe(1);
    const ledger = ledgerSnap.docs[0].data();
    expect(ledger.type).toBe('booking');
    expect(ledger.amount).toBe(-1);
    expect(ledger.balance_after).toBe(4);
    expect(ledger.credit_type).toBe('session');
    expect(ledger.trainerId).toBe(TRAINER_ID);
  });

  test('last credit: balance goes to 0, all writes committed atomically', async () => {
    await seedUsers(1);

    const result = await wrappedBookSession(BOOKING_DATA, { auth: { uid: CLIENT_ID } });

    expect(result.newBalance).toBe(0);

    const clientSnap = await db.doc(`users/${CLIENT_ID}`).get();
    expect(clientSnap.data().creditBalance).toBe(0);

    const schedSnap = await db.doc(`schedule/${result.scheduleId}`).get();
    expect(schedSnap.data().creditDeducted).toBe(true);
  });

  // ── Server-side rejection ───────────────────────────────────────────────────

  test('server rejects booking when creditBalance is 0 — not just UI disabled', async () => {
    await seedUsers(0);

    await expect(
      wrappedBookSession(BOOKING_DATA, { auth: { uid: CLIENT_ID } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Transaction rolled back: no schedule doc created
    const schedSnap = await db.collection('schedule')
      .where('clientId', '==', CLIENT_ID).get();
    expect(schedSnap.size).toBe(0);

    // Balance unchanged
    const clientSnap = await db.doc(`users/${CLIENT_ID}`).get();
    expect(clientSnap.data().creditBalance).toBe(0);

    // No ledger entry
    const ledgerSnap = await db.collection('creditLedger')
      .where('clientId', '==', CLIENT_ID).get();
    expect(ledgerSnap.size).toBe(0);
  });

  test('server rejects booking when creditBalance field is missing (null/undefined) — root cause scenario', async () => {
    // This is the exact state that triggered the original bug:
    // client had no creditBalance field (migration skipped them).
    // The server treats missing field as 0 (via ?? 0) and rejects.
    // The client-side code used to bypass the CF entirely when null; now it
    // can never be null because migration covers all clients.
    await seedUsers(undefined); // no creditBalance field written

    await expect(
      wrappedBookSession(BOOKING_DATA, { auth: { uid: CLIENT_ID } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Confirm no partial writes
    const schedSnap = await db.collection('schedule')
      .where('clientId', '==', CLIENT_ID).get();
    expect(schedSnap.size).toBe(0);
  });

  // ── Auth enforcement ────────────────────────────────────────────────────────

  test('server rejects unauthenticated calls', async () => {
    await seedUsers(5);

    await expect(
      wrappedBookSession(BOOKING_DATA, {}) // no auth context
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  // ── Input validation ────────────────────────────────────────────────────────

  test('server rejects missing required fields', async () => {
    await seedUsers(5);

    await expect(
      wrappedBookSession({ time: '10:00', type: 'PT Session' }, { auth: { uid: CLIENT_ID } })
      // missing date and trainerId
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  // ── Race condition guard ────────────────────────────────────────────────────

  test('concurrent bookings with 1 credit: exactly one succeeds, one gets failed-precondition', async () => {
    await seedUsers(1);

    const [result1, result2] = await Promise.allSettled([
      wrappedBookSession(BOOKING_DATA, { auth: { uid: CLIENT_ID } }),
      wrappedBookSession({ ...BOOKING_DATA, time: '11:00' }, { auth: { uid: CLIENT_ID } }),
    ]);

    const fulfilled = [result1, result2].filter(r => r.status === 'fulfilled');
    const rejected  = [result1, result2].filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toMatchObject({ code: 'failed-precondition' });

    // Final balance is 0, not -1
    const clientSnap = await db.doc(`users/${CLIENT_ID}`).get();
    expect(clientSnap.data().creditBalance).toBe(0);

    // Only one schedule doc was created
    const schedSnap = await db.collection('schedule')
      .where('clientId', '==', CLIENT_ID).get();
    expect(schedSnap.size).toBe(1);
  });
});
