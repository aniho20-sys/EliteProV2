/* global describe, test, expect, beforeEach, afterAll, process, require */
/**
 * What onAccountDelete removes, detaches and keeps — against the Firestore emulator.
 *
 * The bug it exists for (found 2026-09-26, reports/app-audit-2026-09-26.md): the cascade
 * never touched intakeForms, so a deleted client's injuries and PAR-Q answers stayed in
 * the database for ever, and a deleted trainer's clients were left pointing at nobody.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
// Own project id — bookSession.test.js clears whole collections in parallel (see the note
// in resolveInviteCode.test.js).
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-delete';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-delete' });
const db = admin.firestore();
const { deleteAccountData, CHUNK } = require('../accountDeletion');

const CLIENT = 'del-client-1';
const TRAINER = 'del-trainer-1';
const OTHER_CLIENT = 'del-client-2';
const STRANGER = 'del-stranger';

const exists = async (path) => (await db.doc(path).get()).exists;

async function clearAll() {
  const cols = ['users', 'messages', 'workoutLogs', 'schedule', 'workoutPlans', 'exercises',
    'templates', 'exerciseOverrides', 'intakeForms', 'bodyStats', 'invoices', 'creditLedger', 'subscriptions'];
  for (const col of cols) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) await db.recursiveDelete(d.ref);
  }
}

async function seed() {
  const w = (path, data) => db.doc(path).set(data);
  await Promise.all([
    w(`users/${TRAINER}`, { id: TRAINER, role: 'trainer' }),
    w(`users/${CLIENT}`, { id: CLIENT, role: 'client', trainerId: TRAINER }),
    w(`users/${OTHER_CLIENT}`, { id: OTHER_CLIENT, role: 'client', trainerId: TRAINER }),
    w(`users/${STRANGER}`, { id: STRANGER, role: 'client', trainerId: 'someone-else' }),
    w(`intakeForms/${CLIENT}`, { clientId: CLIENT, injuries: 'left knee ACL' }),
    w(`intakeForms/${OTHER_CLIENT}`, { clientId: OTHER_CLIENT, injuries: 'none' }),
    w(`bodyStats/${CLIENT}`, { clientId: CLIENT }),
    w(`bodyStats/${CLIENT}/entries/e1`, { weight: 70 }),
    w(`bodyStats/${OTHER_CLIENT}/entries/e1`, { weight: 80 }),
    w('messages/m1', { from: CLIENT, to: TRAINER }),
    w('messages/m2', { from: TRAINER, to: CLIENT }),
    w('messages/m3', { from: TRAINER, to: OTHER_CLIENT }),
    w('workoutLogs/l1', { clientId: CLIENT }),
    w('workoutLogs/l2', { clientId: OTHER_CLIENT }),
    w('schedule/s1', { trainerId: TRAINER, clientId: CLIENT }),
    w('schedule/s2', { trainerId: TRAINER, clientId: OTHER_CLIENT }),
    w('workoutPlans/p1', { trainerId: TRAINER, clientId: CLIENT }),
    w('workoutPlans/p2', { trainerId: TRAINER, clientId: OTHER_CLIENT }),
    w('exercises/x1', { trainerId: TRAINER }),
    w('templates/t1', { trainerId: TRAINER }),
    w(`exerciseOverrides/${TRAINER}_squat`, { trainerId: TRAINER }),
    w('invoices/i1', { trainerId: TRAINER, clientId: CLIENT }),
    w('creditLedger/c1', { trainerId: TRAINER, clientId: CLIENT }),
    w('subscriptions/sub1', { trainerId: TRAINER, clientId: CLIENT, status: 'cancelled' }),
  ]);
}

beforeEach(async () => { await clearAll(); await seed(); });
afterAll(async () => { await clearAll(); await admin.app().delete(); });

describe('deleting a client', () => {
  test('health data and personal records go', async () => {
    await deleteAccountData({ db, uid: CLIENT });
    expect(await exists(`intakeForms/${CLIENT}`)).toBe(false);   // injuries, PAR-Q
    expect(await exists(`bodyStats/${CLIENT}`)).toBe(false);
    expect(await exists(`bodyStats/${CLIENT}/entries/e1`)).toBe(false);
    expect(await exists(`users/${CLIENT}`)).toBe(false);
    for (const p of ['messages/m1', 'messages/m2', 'workoutLogs/l1', 'schedule/s1', 'workoutPlans/p1']) {
      expect(await exists(p)).toBe(false);
    }
  });

  test('financial records are kept', async () => {
    await deleteAccountData({ db, uid: CLIENT });
    for (const p of ['invoices/i1', 'creditLedger/c1', 'subscriptions/sub1']) {
      expect(await exists(p)).toBe(true);
    }
  });

  test('nobody else is touched', async () => {
    await deleteAccountData({ db, uid: CLIENT });
    for (const p of [`users/${TRAINER}`, `users/${OTHER_CLIENT}`, `intakeForms/${OTHER_CLIENT}`,
      `bodyStats/${OTHER_CLIENT}/entries/e1`, 'messages/m3', 'workoutLogs/l2', 'schedule/s2', 'workoutPlans/p2']) {
      expect(await exists(p)).toBe(true);
    }
  });
});

describe('deleting a trainer', () => {
  test('their clients are detached, not deleted, and keep their own data', async () => {
    const { detachedClients } = await deleteAccountData({ db, uid: TRAINER });
    expect(detachedClients).toBe(2);
    for (const c of [CLIENT, OTHER_CLIENT]) {
      const snap = await db.doc(`users/${c}`).get();
      expect(snap.exists).toBe(true);
      expect(snap.data().trainerId).toBeNull();
    }
    expect(await exists('workoutLogs/l1')).toBe(true);
    expect(await exists(`intakeForms/${CLIENT}`)).toBe(true);
    expect((await db.doc(`users/${STRANGER}`).get()).data().trainerId).toBe('someone-else');
  });

  test("their own content goes; the business's financial records stay", async () => {
    await deleteAccountData({ db, uid: TRAINER });
    for (const p of ['exercises/x1', 'templates/t1', `exerciseOverrides/${TRAINER}_squat`,
      'workoutPlans/p1', 'workoutPlans/p2', 'schedule/s1', 'schedule/s2', 'messages/m2', 'messages/m3', `users/${TRAINER}`]) {
      expect(await exists(p)).toBe(false);
    }
    expect(await exists('invoices/i1')).toBe(true);
    expect(await exists('creditLedger/c1')).toBe(true);
  });
});

test('more docs than one batch holds are all deleted', async () => {
  const n = CHUNK + 50;
  for (let i = 0; i < n; i += 100) {
    const batch = db.batch();
    for (let j = i; j < Math.min(i + 100, n); j++) batch.set(db.doc(`messages/bulk${j}`), { from: CLIENT, to: TRAINER });
    await batch.commit();
  }
  await deleteAccountData({ db, uid: CLIENT });
  const left = await db.collection('messages').where('from', '==', CLIENT).get();
  expect(left.size).toBe(0);
});

test('a message to yourself matches two queries and is still deleted once, without error', async () => {
  await db.doc('messages/self').set({ from: CLIENT, to: CLIENT });
  await expect(deleteAccountData({ db, uid: CLIENT })).resolves.toBeTruthy();
  expect(await exists('messages/self')).toBe(false);
});
