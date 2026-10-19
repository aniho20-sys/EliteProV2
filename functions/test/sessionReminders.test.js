/**
 * B51 — reminders before a session (functions/sessionReminders.js) against the Firestore
 * emulator. Times are the coach's own wall clock (zonedTime.js); nothing touches
 * production (#38).
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-reminders';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-reminders' });
const db = admin.firestore();
const { reminderKind, sendSessionReminders } = require('../sessionReminders');

const COLS = ['users', 'schedule', 'sessionReminders'];
async function clearAll() {
  for (const col of COLS) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}

let sent;
const notify = async (n) => { sent.push(n); };
const run = (iso) => sendSessionReminders({ db, now: () => new Date(iso), notify });
const session = (id, fields) => db.doc(`schedule/${id}`).set({
  id, trainerId: 'coachLDN', clientId: 'amy', type: 'Training Session', status: 'confirmed', ...fields,
});

beforeEach(async () => {
  await clearAll();
  sent = [];
  await db.doc('users/coachLDN').set({ id: 'coachLDN', role: 'trainer', name: 'Ani', timeZone: 'Europe/London' });
  await db.doc('users/coachHK').set({ id: 'coachHK', role: 'trainer', name: 'Ken', timeZone: 'Asia/Hong_Kong' });
  await db.doc('users/amy').set({ id: 'amy', role: 'client', trainerId: 'coachLDN', fcmTokens: ['tok-amy'] });
  await db.doc('users/wing').set({ id: 'wing', role: 'client', trainerId: 'coachHK', fcmTokens: ['tok-wing'], language: 'zh-HK' });
});
afterAll(async () => { await clearAll(); await admin.app().delete(); });

describe('when a reminder is due (the coach’s own clock)', () => {
  // 15 Oct 2026, London is on BST (UTC+1).
  const s = { date: '2026-10-16', time: '18:00' };
  const at = (iso) => reminderKind({ session: s, timeZone: 'Europe/London', nowMs: Date.parse(iso) });

  test('the evening before: from 19:00 London time, not 19:00 UTC', () => {
    expect(at('2026-10-15T17:30:00Z')).toBeNull();         // 18:30 BST — too early
    expect(at('2026-10-15T18:05:00Z')).toBe('dayBefore'); // 19:05 BST
    expect(at('2026-10-15T22:30:00Z')).toBe('dayBefore'); // 23:30 BST, still the evening before
  });
  test('about two hours before', () => {
    expect(at('2026-10-16T15:00:00Z')).toBe('soon');  // 16:00 BST, 2h before
    expect(at('2026-10-16T16:10:00Z')).toBe('soon');  // 50 min before
    expect(at('2026-10-16T16:30:00Z')).toBeNull();    // 30 min — too late to be useful
    expect(at('2026-10-16T13:00:00Z')).toBeNull();    // 4h before — the morning is quiet
  });
  test('a session already started gets nothing', () => {
    expect(at('2026-10-16T17:30:00Z')).toBeNull();
  });
  test('a Hong Kong coach’s evening is Hong Kong’s', () => {
    const hk = (iso) => reminderKind({ session: { date: '2026-10-16', time: '10:00' }, timeZone: 'Asia/Hong_Kong', nowMs: Date.parse(iso) });
    expect(hk('2026-10-15T10:30:00Z')).toBeNull();         // 18:30 HKT
    expect(hk('2026-10-15T11:30:00Z')).toBe('dayBefore'); // 19:30 HKT
  });
});

describe('sending', () => {
  test('the evening before: one push to the client, with the time and the coach', async () => {
    await session('s1', { date: '2026-10-16', time: '18:00' });
    await run('2026-10-15T18:05:00Z');
    expect(sent).toEqual([{ userId: 'amy', tokens: ['tok-amy'], title: 'Session tomorrow', body: 'Tomorrow at 18:00 with Ani.' }]);
  });
  test('never twice: the next hourly run, or two runs at once, send nothing more', async () => {
    await session('s1', { date: '2026-10-16', time: '18:00' });
    await Promise.all([run('2026-10-15T18:05:00Z'), run('2026-10-15T18:06:00Z')]);
    await run('2026-10-15T19:05:00Z');
    expect(sent).toHaveLength(1);
  });
  test('the evening reminder and the two-hours one are separate, each once', async () => {
    await session('s1', { date: '2026-10-16', time: '18:00' });
    await run('2026-10-15T18:05:00Z');
    await run('2026-10-16T15:05:00Z');
    await run('2026-10-16T16:05:00Z');
    expect(sent.map(x => x.title)).toEqual(['Session tomorrow', 'Session soon']);
  });
  test('a client who chose Chinese gets Chinese', async () => {
    await session('s2', { trainerId: 'coachHK', clientId: 'wing', date: '2026-10-16', time: '10:00' });
    await run('2026-10-15T11:30:00Z');
    expect(sent).toEqual([{ userId: 'wing', tokens: ['tok-wing'], title: '明天有課堂', body: '明天 10:00，教練 Ken。' }]);
  });
  test('nothing for: pending, cancelled, a blocked slot, a client without the app or without a phone registered', async () => {
    await db.doc('users/noapp').set({ id: 'noapp', role: 'client', managed: true, trainerId: 'coachLDN', fcmTokens: ['x'] });
    await db.doc('users/notoken').set({ id: 'notoken', role: 'client', trainerId: 'coachLDN' });
    const d = { date: '2026-10-16', time: '18:00' };
    await session('p', { ...d, status: 'pending' });
    await session('c', { ...d, status: 'cancelled' });
    await session('b', { ...d, isBlocked: true });
    await session('m', { ...d, clientId: 'noapp' });
    await session('n', { ...d, clientId: 'notoken' });
    await run('2026-10-15T18:05:00Z');
    expect(sent).toEqual([]);
  });
  test('old markers are cleared once their sessions are long past', async () => {
    await db.doc('sessionReminders/old_soon').set({ scheduleId: 'old', kind: 'soon', createdAt: '2026-10-01T00:00:00.000Z' });
    await db.doc('sessionReminders/new_soon').set({ scheduleId: 'new', kind: 'soon', createdAt: '2026-10-14T00:00:00.000Z' });
    await run('2026-10-15T18:05:00Z');
    expect((await db.doc('sessionReminders/old_soon').get()).exists).toBe(false);
    expect((await db.doc('sessionReminders/new_soon').get()).exists).toBe(true);
  });
});
