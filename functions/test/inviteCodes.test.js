/**
 * functions/inviteCodes.js against the Firestore emulator.
 *
 * P2 + P3 (reports/production-audit-2026-09-28.md): connecting to a coach and issuing
 * invite codes moved server-side. P3 was a trainer copying another trainer's code; the
 * reservation document inviteCodes/{code} is what makes a code belong to exactly one
 * trainer, and codes from before reservations must not resolve once they are shared.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
// Own project id — bookSession.test.js clears whole collections in parallel.
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-invitecodes';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-invitecodes' });
const db = admin.firestore();
const {
  resolveTrainerByCode, ensureInviteCode, connectClientByCode, randomCode, CODE_CHARS,
} = require('../inviteCodes');

async function clearAll() {
  for (const col of ['users', 'inviteCodes']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}

const user = (id, data) => db.doc(`users/${id}`).set({ id, ...data });
const reservation = async (code) => (await db.doc(`inviteCodes/${code}`).get()).data();

beforeEach(clearAll);
afterAll(async () => { await clearAll(); await admin.app().delete(); });

describe('randomCode', () => {
  test('six characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = randomCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(CODE_CHARS).toContain(ch);
    }
  });
});

describe('ensureInviteCode', () => {
  test('a new trainer gets a code, and the code is reserved to them', async () => {
    await user('t1', { role: 'trainer', name: 'Ani' });
    const code = await ensureInviteCode(db, 't1');
    expect((await db.doc('users/t1').get()).data().inviteCode).toBe(code);
    expect((await reservation(code)).trainerId).toBe('t1');
  });

  test('asking again returns the same code', async () => {
    await user('t1', { role: 'trainer' });
    const first = await ensureInviteCode(db, 't1');
    expect(await ensureInviteCode(db, 't1')).toBe(first);
  });

  test("an existing trainer keeps the code they already hand out", async () => {
    await user('t1', { role: 'trainer', inviteCode: 'ANI123' });
    expect(await ensureInviteCode(db, 't1')).toBe('ANI123');
    expect((await reservation('ANI123')).trainerId).toBe('t1');
  });

  test('P3: a trainer carrying a code already reserved by someone else is given a new one', async () => {
    await user('t1', { role: 'trainer', inviteCode: 'ANI123' });
    await ensureInviteCode(db, 't1');
    await user('t2', { role: 'trainer', inviteCode: 'ANI123' }); // copied before the fix
    const code = await ensureInviteCode(db, 't2');
    expect(code).not.toBe('ANI123');
    expect((await db.doc('users/t2').get()).data().inviteCode).toBe(code);
    expect((await reservation('ANI123')).trainerId).toBe('t1');
  });

  test('a collision with an existing code is skipped, not reused', async () => {
    await user('t1', { role: 'trainer', inviteCode: 'AAAAAA' });
    await user('t2', { role: 'trainer' });
    const draws = ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B'];
    const randomInt = () => CODE_CHARS.indexOf(draws.shift());
    expect(await ensureInviteCode(db, 't2', { randomInt })).toBe('BBBBBB');
  });

  test('a client cannot be given a code', async () => {
    await user('c1', { role: 'client' });
    await expect(ensureInviteCode(db, 'c1')).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('resolveTrainerByCode', () => {
  test('a reserved code resolves to its trainer, id and name only', async () => {
    await user('t1', { role: 'trainer', name: 'Ani', email: 'ani@x.test', bankDetails: { accountNumber: '12345678' } });
    const code = await ensureInviteCode(db, 't1');
    const trainer = await resolveTrainerByCode(db, code);
    expect(trainer).toEqual({ id: 't1', name: 'Ani' });
  });

  test('a code from before reservations resolves, and is reserved on first use', async () => {
    await user('t1', { role: 'trainer', name: 'Ani', inviteCode: 'OLD123' });
    expect(await resolveTrainerByCode(db, 'OLD123')).toEqual({ id: 't1', name: 'Ani' });
    expect((await reservation('OLD123')).trainerId).toBe('t1');
  });

  test('P3: once a code is reserved, a trainer who copied it does not get its students', async () => {
    await user('t1', { role: 'trainer', name: 'Ani', inviteCode: 'ANI123' });
    await resolveTrainerByCode(db, 'ANI123'); // reserved to t1
    await user('t2', { role: 'trainer', name: 'Copycat', inviteCode: 'ANI123' });
    expect(await resolveTrainerByCode(db, 'ANI123')).toEqual({ id: 't1', name: 'Ani' });
  });

  test('P3: an unreserved code held by two trainers resolves to nobody', async () => {
    await user('t1', { role: 'trainer', name: 'Ani', inviteCode: 'ANI123' });
    await user('t2', { role: 'trainer', name: 'Copycat', inviteCode: 'ANI123' });
    expect(await resolveTrainerByCode(db, 'ANI123')).toBeNull();
    expect(await reservation('ANI123')).toBeUndefined();
  });

  test("a code on a client's document never resolves", async () => {
    await user('c1', { role: 'client', inviteCode: 'CLIENT' });
    expect(await resolveTrainerByCode(db, 'CLIENT')).toBeNull();
  });

  test('an unknown code resolves to nobody', async () => {
    expect(await resolveTrainerByCode(db, 'NOPE99')).toBeNull();
  });
});

describe('connectClientByCode', () => {
  test('a client with a valid code is connected to that coach', async () => {
    await user('t1', { role: 'trainer', name: 'Ani', inviteCode: 'ANI123' });
    await user('c1', { role: 'client', trainerId: null });
    const res = await connectClientByCode(db, 'c1', 'ANI123');
    expect(res).toEqual({ found: true, trainer: { id: 't1', name: 'Ani' } });
    expect((await db.doc('users/c1').get()).data().trainerId).toBe('t1');
  });

  test('a wrong code connects nobody and changes nothing', async () => {
    await user('c1', { role: 'client', trainerId: null });
    expect(await connectClientByCode(db, 'c1', 'NOPE99')).toEqual({ found: false });
    expect((await db.doc('users/c1').get()).data().trainerId).toBeNull();
  });

  test('a trainer cannot connect themselves to another coach', async () => {
    await user('t1', { role: 'trainer', inviteCode: 'ANI123' });
    await user('t2', { role: 'trainer' });
    await expect(connectClientByCode(db, 't2', 'ANI123')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('an account with no profile yet cannot connect', async () => {
    await user('t1', { role: 'trainer', inviteCode: 'ANI123' });
    await expect(connectClientByCode(db, 'ghost', 'ANI123')).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
