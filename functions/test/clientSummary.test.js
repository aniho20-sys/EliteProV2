/**
 * functions/clientSummary.js against the Firestore emulator (B76 step 2).
 *
 * The coach's dashboard reads each client's summary instead of listening to every client's
 * logs, sessions and body stats. These pin what the summary says: the newest logs, the last
 * completed session with the CURRENT coach only, the newest body stats — built from what is
 * stored, never from the write that triggered it.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-summary';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-summary' });
const db = admin.firestore();
const { buildClientSummary, scheduleClientToRefresh, ensureClientSummaries, RECENT_LOGS, SUMMARY_VERSION } = require('../clientSummary');

const NOW = () => new Date('2026-10-25T09:00:00Z');

async function clearAll() {
  for (const col of ['users', 'schedule', 'workoutLogs', 'bodyStats/amy/entries', 'bodyStats/ben/entries']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}
beforeEach(async () => {
  await clearAll();
  await db.doc('users/coach').set({ id: 'coach', role: 'trainer' });
  await db.doc('users/amy').set({ id: 'amy', role: 'client', trainerId: 'coach', name: 'Amy' });
});
afterAll(async () => { await clearAll(); await admin.app().delete(); });

const log = (id, date, extra = {}) => db.doc(`workoutLogs/${id}`).set({ id, clientId: 'amy', trainerId: 'coach', date, entries: [{ exerciseId: 'squat' }], ...extra });
const session = (id, date, extra = {}) => db.doc(`schedule/${id}`).set({ id, clientId: 'amy', trainerId: 'coach', date, time: '10:00', type: 'PT Session', status: 'completed', ...extra });
const summaryOf = async (id = 'amy') => (await db.doc(`users/${id}`).get()).data().summary;

describe('a client’s summary', () => {
  test('the newest logs, newest first, at most RECENT_LOGS — whatever order they were written in', async () => {
    await log('l1', '2026-01-05', { planId: 'p1' });
    await log('l9', '2026-10-20', { workoutName: 'Free session' });
    for (let i = 2; i <= 7; i++) await log(`l${i}`, `2026-0${i}-01`);
    await buildClientSummary({ db, clientId: 'amy', now: NOW });
    const s = await summaryOf();
    expect(s.recentLogs).toHaveLength(RECENT_LOGS);
    expect(s.recentLogs[0]).toEqual({ id: 'l9', date: '2026-10-20', planId: null, workoutName: 'Free session' });
    expect(s.recentLogs.map(l => l.date)).toEqual([...s.recentLogs.map(l => l.date)].sort().reverse());
    expect(s.version).toBe(SUMMARY_VERSION);
    expect(s.updatedAt).toBe('2026-10-25T09:00:00.000Z');
    expect(JSON.stringify(s)).not.toContain('squat'); // no workout contents, only what the dashboard shows
  });

  test('the last completed session with the current coach — not a booked one, not another coach’s', async () => {
    await session('s-done', '2026-09-01', { type: 'Assessment' });
    await session('s-booked', '2026-11-01', { status: 'confirmed' });
    await session('s-cancelled', '2026-10-10', { status: 'cancelled' });
    await session('s-other-coach', '2026-10-15', { trainerId: 'oldcoach' });
    await buildClientSummary({ db, clientId: 'amy', now: NOW });
    expect((await summaryOf()).lastSession).toEqual({ id: 's-done', date: '2026-09-01', type: 'Assessment' });
  });

  test('the newest body stats entry', async () => {
    await db.doc('bodyStats/amy/entries/e1').set({ date: '2026-08-01', weight: 72, bodyFat: 20 });
    await db.doc('bodyStats/amy/entries/e2').set({ date: '2026-10-01', weight: 70.5, bodyFat: 18.4, waist: 80 });
    await buildClientSummary({ db, clientId: 'amy', now: NOW });
    expect((await summaryOf()).latestBodyStat).toEqual({ date: '2026-10-01', weight: 70.5, bodyFat: 18.4 });
  });

  test('nothing yet: an empty summary, not a missing one — so the app knows it has been built', async () => {
    await buildClientSummary({ db, clientId: 'amy', now: NOW });
    expect(await summaryOf()).toMatchObject({ recentLogs: [], lastSession: null, latestBodyStat: null });
  });

  test('a client with no coach has no sessions to show', async () => {
    await db.doc('users/amy').update({ trainerId: null });
    await session('s1', '2026-09-01');
    await buildClientSummary({ db, clientId: 'amy', now: NOW });
    expect((await summaryOf()).lastSession).toBeNull();
  });

  test('never on a coach, and never creates a deleted account again', async () => {
    expect(await buildClientSummary({ db, clientId: 'coach', now: NOW })).toBeNull();
    expect((await db.doc('users/coach').get()).data().summary).toBeUndefined();
    expect(await buildClientSummary({ db, clientId: 'gone', now: NOW })).toBeNull();
    expect((await db.doc('users/gone').get()).exists).toBe(false);
  });
});

describe('which session writes rebuild a summary', () => {
  test('only when the session is or was completed; both clients if it moved', () => {
    expect(scheduleClientToRefresh(null, { clientId: 'amy', status: 'confirmed' })).toEqual([]);
    expect(scheduleClientToRefresh({ clientId: 'amy', status: 'confirmed' }, { clientId: 'amy', status: 'completed' })).toEqual(['amy']);
    expect(scheduleClientToRefresh({ clientId: 'amy', status: 'completed' }, null)).toEqual(['amy']);
    expect(scheduleClientToRefresh({ clientId: 'amy', status: 'completed' }, { clientId: 'ben', status: 'completed' })).toEqual(['amy', 'ben']);
  });
});

describe('building the missing ones (clients from before step 2)', () => {
  test('every client of this coach without a current summary; not another coach’s, not twice', async () => {
    await db.doc('users/ben').set({ id: 'ben', role: 'client', trainerId: 'coach' });
    await db.doc('users/zoe').set({ id: 'zoe', role: 'client', trainerId: 'othercoach' });
    await log('l1', '2026-10-01');
    expect(await ensureClientSummaries({ db, trainerId: 'coach', now: NOW })).toEqual({ built: 2 });
    expect((await summaryOf('amy')).recentLogs.map(l => l.id)).toEqual(['l1']);
    expect(await summaryOf('ben')).toMatchObject({ recentLogs: [] });
    expect((await db.doc('users/zoe').get()).data().summary).toBeUndefined();
    expect(await ensureClientSummaries({ db, trainerId: 'coach', now: NOW })).toEqual({ built: 0 });
  });
  test('an older summary version is rebuilt', async () => {
    await db.doc('users/amy').update({ summary: { version: 0 } });
    expect(await ensureClientSummaries({ db, trainerId: 'coach', now: NOW })).toEqual({ built: 1 });
    expect((await summaryOf()).version).toBe(SUMMARY_VERSION);
  });
});
