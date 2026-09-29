/**
 * functions/availability.js against the Firestore emulator.
 *
 * Production audit 2026-09-28, High-value 4: clients read their coach's whole schedule,
 * seeing other clients' sessions and the coach's notes. They now get only when the coach
 * is busy. These tests pin what leaves: date, time, length — never who, what or notes.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-availability';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-availability' });
const db = admin.firestore();
const { trainerAvailability } = require('../availability');

async function clearAll() {
  for (const col of ['users', 'schedule']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}
beforeEach(clearAll);
afterAll(async () => { await clearAll(); await admin.app().delete(); });

const NOW = new Date('2026-09-29T09:00:00Z');
const session = (id, data) => db.doc(`schedule/${id}`).set({
  trainerId: 'coach', clientId: 'other', type: 'PT Session', status: 'confirmed', duration: 60,
  notes: 'knee injury — no deep squats', ...data,
});

beforeEach(async () => {
  await db.doc('users/coach').set({ id: 'coach', role: 'trainer' });
  await db.doc('users/me').set({ id: 'me', role: 'client', trainerId: 'coach' });
  await db.doc('users/other').set({ id: 'other', role: 'client', trainerId: 'coach' });
});

test("returns when the coach is busy — and nothing about whom or why", async () => {
  await session('s1', { date: '2026-10-01', time: '10:00', duration: 45 });
  const { slots } = await trainerAvailability(db, 'me', NOW);
  expect(slots).toEqual([{ date: '2026-10-01', time: '10:00', duration: 45 }]);
  const text = JSON.stringify(slots);
  for (const leaked of ['other', 'knee', 'PT Session', 'confirmed']) expect(text).not.toContain(leaked);
});

test('blocked time counts as busy', async () => {
  await session('b1', { date: '2026-10-01', time: '12:00', clientId: '', isBlocked: true });
  expect((await trainerAvailability(db, 'me', NOW)).slots).toEqual([{ date: '2026-10-01', time: '12:00', duration: 60 }]);
});

test('cancelled and long-past sessions are not busy', async () => {
  await session('c1', { date: '2026-10-01', time: '10:00', status: 'cancelled' });
  await session('p1', { date: '2026-09-20', time: '10:00', status: 'completed' });
  await session('y1', { date: '2026-09-28', time: '10:00' }); // yesterday: kept for clock skew
  expect((await trainerAvailability(db, 'me', NOW)).slots.map(s => s.date)).toEqual(['2026-09-28']);
});

test("another coach's sessions never appear", async () => {
  await session('x1', { date: '2026-10-01', time: '10:00', trainerId: 'someone-else' });
  expect((await trainerAvailability(db, 'me', NOW)).slots).toEqual([]);
});

test('a client with no coach, or no profile, gets nothing', async () => {
  await session('s1', { date: '2026-10-01', time: '10:00' });
  await db.doc('users/me').update({ trainerId: null });
  expect((await trainerAvailability(db, 'me', NOW)).slots).toEqual([]);
  expect((await trainerAvailability(db, 'ghost', NOW)).slots).toEqual([]);
});

test('sorted by date and time', async () => {
  await session('a', { date: '2026-10-02', time: '09:00' });
  await session('b', { date: '2026-10-01', time: '15:00' });
  await session('c', { date: '2026-10-01', time: '08:00' });
  expect((await trainerAvailability(db, 'me', NOW)).slots.map(s => `${s.date} ${s.time}`))
    .toEqual(['2026-10-01 08:00', '2026-10-01 15:00', '2026-10-02 09:00']);
});
