/**
 * functions/clientErrors.js against the Firestore emulator.
 *
 * Error monitoring (production audit 2026-09-28, High-value 1). The endpoint takes
 * reports from anyone, so the grouping, the renotify window and the daily caps are what
 * stop one bug — or one abuser — from becoming a thousand documents and notifications.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-clienterrors';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-clienterrors' });
const db = admin.firestore();
const { normalizeReport, fingerprint, recordClientError, DAILY } = require('../clientErrors');

async function clearAll() {
  for (const col of ['clientErrors', 'clientErrorBudget']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}
beforeEach(clearAll);
afterAll(async () => { await clearAll(); await admin.app().delete(); });

const report = (over = {}) => normalizeReport({
  message: "Cannot read properties of undefined (reading 'name')",
  stack: "TypeError: Cannot read properties of undefined (reading 'name')\n    at Xe (https://elitepro-16718.web.app/assets/index-a1b2c3d4.js:40:1234)",
  source: 'boundary',
  url: 'https://elitepro-16718.web.app/#/clients/abc?invite=ABC123',
  userAgent: 'iPhone',
  build: '2026-09-28T21:00:00Z',
  ...over,
});
const at = (iso) => new Date(iso);

describe('normalizeReport', () => {
  test('an empty message is not worth keeping', () => {
    expect(normalizeReport({ message: '   ' })).toBeNull();
    expect(normalizeReport(null)).toBeNull();
  });

  test('every field is clipped, and the invite code is stripped from the address', () => {
    const r = normalizeReport({ message: 'x'.repeat(9000), stack: 'y'.repeat(9000), url: 'https://a/#/?invite=ABC123', source: 'evil' });
    expect(r.message).toHaveLength(500);
    expect(r.stack).toHaveLength(4000);
    expect(r.url).toBe('https://a/#/');
    expect(r.source).toBe('window');
  });
});

describe('fingerprint', () => {
  test('the same bug after a redeploy is the same error', () => {
    const a = report();
    const b = report({ stack: a.stack.replace('index-a1b2c3d4.js:40:1234', 'index-ffee0099.js:41:999') });
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  test('different messages are different errors', () => {
    expect(fingerprint(report())).not.toBe(fingerprint(report({ message: 'Network down' })));
  });
});

describe('recordClientError', () => {
  test('first sighting is stored and notified', async () => {
    const res = await recordClientError(db, report(), { uid: 'c1', now: at('2026-09-28T10:00:00Z') });
    expect(res).toMatchObject({ stored: true, notify: true, isNew: true, count: 1 });
    const doc = (await db.doc(`clientErrors/${res.id}`).get()).data();
    expect(doc).toMatchObject({ count: 1, users: ['c1'], url: 'https://elitepro-16718.web.app/#/clients/abc' });
  });

  test('twenty students hitting one bug: one document, one notification', async () => {
    let last;
    for (let i = 0; i < 20; i++) {
      last = await recordClientError(db, report(), { uid: `c${i}`, now: at(`2026-09-28T10:${String(i).padStart(2, '0')}:00Z`) });
    }
    expect((await db.collection('clientErrors').get()).size).toBe(1);
    expect(last).toMatchObject({ count: 20, notify: false });
    expect((await db.doc('clientErrorBudget/2026-09-28').get()).data().notifications).toBe(1);
  });

  test('still happening a day later: told again, once', async () => {
    await recordClientError(db, report(), { now: at('2026-09-28T10:00:00Z') });
    expect((await recordClientError(db, report(), { now: at('2026-09-29T09:59:00Z') })).notify).toBe(false);
    expect((await recordClientError(db, report(), { now: at('2026-09-29T10:00:00Z') })).notify).toBe(true);
    expect((await recordClientError(db, report(), { now: at('2026-09-29T11:00:00Z') })).notify).toBe(false);
  });

  test('no more than the daily notification budget, however many different errors', async () => {
    let notified = 0;
    for (let i = 0; i < DAILY.notifications + 5; i++) {
      const res = await recordClientError(db, report({ message: `bug ${'x'.repeat(i + 1)}` }), { now: at('2026-09-28T10:00:00Z') });
      if (res.notify) notified++;
    }
    expect(notified).toBe(DAILY.notifications);
  });

  test('past the daily cap on new errors, new ones are dropped but known ones still count', async () => {
    await recordClientError(db, report(), { now: at('2026-09-28T10:00:00Z') });
    await db.doc('clientErrorBudget/2026-09-28').set({ reports: 5, newErrors: DAILY.newErrors, notifications: 0 });
    expect((await recordClientError(db, report({ message: 'brand new' }), { now: at('2026-09-28T11:00:00Z') })).stored).toBe(false);
    expect((await recordClientError(db, report(), { now: at('2026-09-28T11:00:00Z') })).stored).toBe(true);
  });

  test('past the daily cap on reports, nothing more is stored', async () => {
    await db.doc('clientErrorBudget/2026-09-28').set({ reports: DAILY.reports, newErrors: 0, notifications: 0 });
    expect((await recordClientError(db, report(), { now: at('2026-09-28T11:00:00Z') })).stored).toBe(false);
    expect((await db.collection('clientErrors').get()).size).toBe(0);
  });

  test('a signed-out report has no user', async () => {
    const res = await recordClientError(db, report(), { now: at('2026-09-28T10:00:00Z') });
    expect((await db.doc(`clientErrors/${res.id}`).get()).data()).toMatchObject({ users: [], lastUid: null });
  });
});
