/**
 * functions/publicBooking.js (B38) — a stranger asking a coach for a trial session.
 *
 * The callers of getPage and requestTrial are NOT signed in, so these tests pin what a
 * stranger can learn (free start times, a name, a price — never ids, clients or notes)
 * and what they can make the server store (one bounded request per free hour, within
 * daily budgets, nothing at all from a bot).
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-public-booking';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-public-booking' });
const db = admin.firestore();
const pb = require('../publicBooking');

const COACH = 'pb-coach';
const OTHER = 'pb-other-coach';
const SLUG = 'abcdefgh23';
// Thursday 1 October 2026, 08:00 in London (BST, UTC+1).
const NOW = new Date('2026-10-01T07:00:00Z');
const TZ = 'Europe/London';

async function clearAll() {
  for (const col of ['users', 'schedule', 'trialRequests', 'trialBudget', 'bookingPages', 'groupClasses']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}

async function seedCoach(publicBooking = {}, extra = {}) {
  await db.doc(`users/${COACH}`).set({
    id: COACH, role: 'trainer', name: 'Ani Ho', email: 'ani@example.test', inviteCode: 'ANI123',
    bankDetails: { accountNumber: '12345678' }, timeZone: TZ, currency: 'GBP',
    workingHours: { start: '09:00', end: '12:00' },
    publicBooking: { enabled: true, price: 20, days: [1, 2, 3, 4, 5], slug: SLUG, ...publicBooking },
    ...extra,
  });
  await db.doc(`bookingPages/${SLUG}`).set({ trainerId: COACH });
}

const ask = (over = {}, ip = '203.0.113.7', now = NOW) => pb.requestTrial({
  db, ip, now,
  input: { slug: SLUG, name: 'Jo Bloggs', contact: '07700 900123', message: 'Bad back', date: '2026-10-02', time: '10:00', consent: true, ...over },
});

beforeEach(clearAll);
afterAll(async () => { await clearAll(); await admin.app().delete(); });

describe('freeSlots', () => {
  const base = { days: [1, 2, 3, 4, 5], workingHours: { start: '09:00', end: '12:00' }, timeZone: TZ, busy: [], now: NOW };

  test('working hours in whole hours, chosen weekdays only, from 12 hours ahead', () => {
    const slots = pb.freeSlots(base);
    // Thursday 1 Oct: 09:00 is only 1h away (London is 08:00) → none that day until 20:00, so none.
    expect(slots.filter(s => s.date === '2026-10-01')).toEqual([]);
    expect(slots.filter(s => s.date === '2026-10-02').map(s => s.time)).toEqual(['09:00', '10:00', '11:00']);
    // Saturday and Sunday are not chosen.
    expect(slots.some(s => s.date === '2026-10-03' || s.date === '2026-10-04')).toBe(false);
    expect(slots.at(-1).date).toBe('2026-10-15');
  });

  test('an hour that overlaps anything already there is not offered', () => {
    const slots = pb.freeSlots({ ...base, busy: [{ date: '2026-10-02', time: '09:30', duration: 30 }] });
    expect(slots.filter(s => s.date === '2026-10-02').map(s => s.time)).toEqual(['10:00', '11:00']);
  });

  test('no working hours set: the same 09:00–17:00 the schedule page assumes', () => {
    const slots = pb.freeSlots({ ...base, workingHours: undefined });
    expect(slots.filter(s => s.date === '2026-10-02').map(s => s.time)).toEqual(
      ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
  });
});

describe('the coach sets the page up', () => {
  test('first save makes one link; later saves keep it', async () => {
    await db.doc(`users/${COACH}`).set({ id: COACH, role: 'trainer', name: 'Ani' });
    const first = await pb.saveSettings({ db, trainerId: COACH, input: { enabled: true, price: 0, days: [6, 1] } });
    expect(first).toMatchObject({ enabled: true, price: 0, days: [1, 6] });
    expect(first.slug).toMatch(/^[a-z0-9]{10}$/);
    expect((await db.doc(`bookingPages/${first.slug}`).get()).data()).toEqual({ trainerId: COACH });

    const second = await pb.saveSettings({ db, trainerId: COACH, input: { enabled: false, price: 25, days: [] } });
    expect(second).toEqual({ enabled: false, price: 25, days: [], slug: first.slug });
    expect((await db.collection('bookingPages').get()).size).toBe(1);
  });

  test('a link already taken is never shared — another is drawn', async () => {
    await db.doc(`users/${COACH}`).set({ id: COACH, role: 'trainer' });
    await db.doc('bookingPages/aaaaaaaaaa').set({ trainerId: OTHER });
    let call = 0;
    const randomInt = () => (call++ < 10 ? 0 : 1); // first draw 'aaaaaaaaaa', then 'bbbbbbbbbb'
    const saved = await pb.saveSettings({ db, trainerId: COACH, input: { enabled: true, price: 0, days: [1] }, randomInt });
    expect(saved.slug).toBe('bbbbbbbbbb');
    expect((await db.doc('bookingPages/aaaaaaaaaa').get()).data().trainerId).toBe(OTHER);
  });

  test('only a trainer; a nonsense price or day is refused; turning on needs a day', async () => {
    await db.doc('users/client-x').set({ id: 'client-x', role: 'client' });
    await expect(pb.saveSettings({ db, trainerId: 'client-x', input: { enabled: false, price: 0, days: [] } }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    for (const input of [{ price: -1, days: [1] }, { price: 5000, days: [1] }, { price: 'x', days: [1] },
      { price: 0, days: [7] }, { enabled: true, price: 0, days: [] }]) {
      expect(() => pb.validateSettings(input)).toThrow(pb.PublicBookingError);
    }
  });
});

describe('what a stranger sees', () => {
  test('a name, a price and free times — nothing else', async () => {
    await seedCoach();
    await db.doc('schedule/s1').set({ trainerId: COACH, clientId: 'c1', date: '2026-10-02', time: '09:00', duration: 60, status: 'confirmed', notes: 'knee', type: 'PT' });
    const page = await pb.getPage({ db, slug: SLUG, now: NOW });
    // groupClasses (B40) carries class times, titles and places left — pinned in 'group classes' below.
    // usualPrice (Ani 2026-10-05): the coach's own per-session price, already shown to their clients.
    expect(Object.keys(page).sort()).toEqual(['coachName', 'currency', 'groupClasses', 'minutes', 'price', 'slots', 'timeZone', 'usualPrice']);
    expect(page).toMatchObject({ coachName: 'Ani Ho', price: 20, currency: 'GBP', minutes: 60, timeZone: TZ });
    expect(page.slots.filter(s => s.date === '2026-10-02').map(s => s.time)).toEqual(['10:00', '11:00']);
    expect(page.slots.every(s => Object.keys(s).sort().join() === 'date,time')).toBe(true);
    const text = JSON.stringify(page);
    for (const secret of [COACH, 'ANI123', '12345678', 'ani@example.test', 'knee', 'c1']) expect(text).not.toContain(secret);
  });

  // Ani 2026-10-05: people book a person — the page shows the coach's own name even when a
  // business name is set (that one is for invoices).
  test('the usual price, only when it is above the trial price', async () => {
    await seedCoach({ price: 20 }, { renewalRate: 65 });
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).usualPrice).toBe(65);
    await seedCoach({ price: 70 }, { renewalRate: 65 });
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).usualPrice).toBeNull();
    await seedCoach({ price: 0 }, {});
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).usualPrice).toBeNull();
  });

  test('the coach\'s own name, even when they have a business name', async () => {
    await seedCoach({}, { businessName: 'Ani Ho Fitness' });
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).coachName).toBe('Ani Ho');
  });

  test('a page that is off, unknown, malformed, or whose link the coach no longer holds is not found', async () => {
    await seedCoach({ enabled: false });
    await expect(pb.getPage({ db, slug: SLUG, now: NOW })).rejects.toMatchObject({ code: 'not-found' });
    await seedCoach({ slug: 'zzzzzzzzzz' });
    await expect(pb.getPage({ db, slug: SLUG, now: NOW })).rejects.toMatchObject({ code: 'not-found' });
    await expect(pb.getPage({ db, slug: 'nopenopeno', now: NOW })).rejects.toMatchObject({ code: 'not-found' });
    await expect(pb.getPage({ db, slug: '../users/x', now: NOW })).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('a stranger asks for a trial', () => {
  beforeEach(() => seedCoach());

  test('stored for the coach, and the hour stops being offered', async () => {
    const res = await ask();
    expect(res).toMatchObject({ ok: true, stored: true, trainerId: COACH, name: 'Jo Bloggs' });
    const stored = (await db.doc(`trialRequests/${res.requestId}`).get()).data();
    expect(stored).toEqual({
      id: res.requestId, trainerId: COACH, name: 'Jo Bloggs', contact: '07700 900123', message: 'Bad back',
      date: '2026-10-02', time: '10:00', createdAt: NOW.toISOString(),
    });
    const page = await pb.getPage({ db, slug: SLUG, now: NOW });
    expect(page.slots.some(s => s.date === '2026-10-02' && s.time === '10:00')).toBe(false);
  });

  test('the same hour twice: the second is told it is taken', async () => {
    await ask();
    await expect(ask({ name: 'Sam' }, '198.51.100.1')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('an hour that was never offered is refused', async () => {
    for (const over of [{ time: '13:00' }, { date: '2026-10-03' }, { date: '2026-10-01', time: '09:00' }, { time: '10:30' }]) {
      await expect(ask(over)).rejects.toMatchObject({ code: 'failed-precondition' });
    }
  });

  test('a bot that fills the hidden field is told "ok" and nothing is stored', async () => {
    expect(await ask({ website: 'http://spam.example' })).toEqual({ ok: true, stored: false });
    expect((await db.collection('trialRequests').get()).size).toBe(0);
    expect((await db.collection('trialBudget').get()).size).toBe(0);
  });

  test('a name, a phone or email, and consent are required; long text is cut', async () => {
    await expect(ask({ name: '   ' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ask({ contact: 'call me' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ask({ contact: '12345' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ask({ consent: 'yes' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(ask({ time: '25:00' })).rejects.toMatchObject({ code: 'invalid-argument' });
    const res = await ask({ contact: 'jo@example.test', name: 'J'.repeat(300), message: 'm'.repeat(5000) });
    const stored = (await db.doc(`trialRequests/${res.requestId}`).get()).data();
    expect(stored.name).toHaveLength(pb.LIMITS.name);
    expect(stored.message).toHaveLength(pb.LIMITS.message);
  });

  test(`one visitor: ${pb.DAILY.perVisitor} a day`, async () => {
    const times = ['09:00', '10:00', '11:00'];
    for (const time of times) await ask({ time });
    await expect(ask({ time: '09:00', date: '2026-10-05' })).rejects.toMatchObject({ code: 'resource-exhausted' });
    // Somebody else is unaffected.
    await expect(ask({ time: '09:00', date: '2026-10-05' }, '198.51.100.1')).resolves.toMatchObject({ stored: true });
  });

  test(`the page holds at most ${pb.MAX_OPEN_PER_COACH} unanswered requests, then shows no times`, async () => {
    const seeded = [];
    for (let i = 0; i < pb.MAX_OPEN_PER_COACH; i++) seeded.push(db.doc(`trialRequests/r${i}`).set({ trainerId: COACH, date: '2026-10-20', time: '09:00' }));
    await Promise.all(seeded);
    await expect(ask()).rejects.toMatchObject({ code: 'resource-exhausted' });
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).slots).toEqual([]);
  });

  test('the visitor\'s IP is never stored', async () => {
    await ask();
    const budgets = await db.collection('trialBudget').get();
    for (const d of budgets.docs) expect(JSON.stringify({ id: d.id, ...d.data() })).not.toContain('203.0.113.7');
  });
});

describe('the coach answers', () => {
  beforeEach(() => seedCoach());

  test('confirm: a client without the app, with the contact they gave, and a trial session at that hour', async () => {
    const { requestId } = await ask();
    const res = await pb.respondToRequest({ db, trainerId: COACH, requestId, action: 'confirm', now: NOW });
    expect(res.clientId).toMatch(/^managed-[0-9]{10,16}-[a-z0-9]{4}$/);
    expect((await db.doc(`users/${res.clientId}`).get()).data()).toEqual({
      id: res.clientId, name: 'Jo Bloggs', role: 'client', trainerId: COACH, managed: true,
      joinDate: '2026-10-01', contact: '07700 900123',
    });
    expect((await db.doc(`schedule/${res.schedId}`).get()).data()).toEqual({
      id: res.schedId, trainerId: COACH, clientId: res.clientId, date: '2026-10-02', time: '10:00', duration: 60,
      type: pb.TRIAL_TYPE, status: 'confirmed', notes: 'Bad back', trial: true,
    });
    expect((await db.doc(`trialRequests/${requestId}`).get()).exists).toBe(false);
    // Still not offered — now because the session is there.
    const page = await pb.getPage({ db, slug: SLUG, now: NOW });
    expect(page.slots.some(s => s.date === '2026-10-02' && s.time === '10:00')).toBe(false);
  });

  test('decline: the request is deleted and the hour is free again', async () => {
    const { requestId } = await ask();
    expect(await pb.respondToRequest({ db, trainerId: COACH, requestId, action: 'decline', now: NOW })).toEqual({ declined: true });
    expect((await db.doc(`trialRequests/${requestId}`).get()).exists).toBe(false);
    expect((await db.collection('users').get()).size).toBe(1);
    const page = await pb.getPage({ db, slug: SLUG, now: NOW });
    expect(page.slots.some(s => s.date === '2026-10-02' && s.time === '10:00')).toBe(true);
  });

  test('another coach cannot answer it, and an answered one cannot be answered again', async () => {
    const { requestId } = await ask();
    await expect(pb.respondToRequest({ db, trainerId: OTHER, requestId, action: 'confirm', now: NOW }))
      .rejects.toMatchObject({ code: 'not-found' });
    await pb.respondToRequest({ db, trainerId: COACH, requestId, action: 'confirm', now: NOW });
    await expect(pb.respondToRequest({ db, trainerId: COACH, requestId, action: 'confirm', now: NOW }))
      .rejects.toMatchObject({ code: 'not-found' });
    expect((await db.collection('schedule').get()).size).toBe(1);
  });

  test('nonsense ids and actions are refused before anything is read', async () => {
    await expect(pb.respondToRequest({ db, trainerId: COACH, requestId: '../users/x', action: 'confirm' }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(pb.respondToRequest({ db, trainerId: COACH, requestId: 'abc', action: 'delete-all' }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('daily cleanup', () => {
  test('unanswered requests a week past their date, and old budgets, go; the rest stay', async () => {
    await Promise.all([
      db.doc('trialRequests/old').set({ trainerId: COACH, date: '2026-09-20', time: '09:00' }),
      db.doc('trialRequests/recent').set({ trainerId: COACH, date: '2026-09-28', time: '09:00' }),
      db.doc('trialBudget/old').set({ day: '2026-09-30', count: 1 }),
      db.doc('trialBudget/today').set({ day: '2026-10-01', count: 1 }),
    ]);
    expect(await pb.cleanup({ db, now: NOW })).toEqual({ requests: 1, budgets: 1, classes: 0 });
    expect((await db.collection('trialRequests').get()).docs.map(d => d.id)).toEqual(['recent']);
    expect((await db.collection('trialBudget').get()).docs.map(d => d.id)).toEqual(['today']);
  });
});

// ── B40: group classes ──
describe('group classes', () => {
  beforeEach(() => seedCoach());
  const CLASS = { date: '2026-10-05', time: '18:00', capacity: 3, minPeople: 2, price: 15, title: 'Strength circuit', address: 'Victoria Park, London E9' };
  const put = (over = {}) => pb.saveGroupClass({ db, trainerId: COACH, input: { ...CLASS, ...over }, now: NOW });
  const join = (classId, over = {}, ip = '203.0.113.7') => ask({ groupClassId: classId, date: undefined, time: undefined, ...over }, ip);

  test('putting one on blocks the coach\'s calendar and shows on the page — without who is coming', async () => {
    const { id } = await put();
    expect((await db.doc(`groupClasses/${id}`).get()).data()).toMatchObject({ ...CLASS, trainerId: COACH, status: 'open', duration: 60 });
    expect((await db.doc(`schedule/gc-${id}`).get()).data()).toMatchObject({ isBlocked: true, clientId: '', date: CLASS.date, time: CLASS.time, groupClassId: id });
    await join(id);
    const page = await pb.getPage({ db, slug: SLUG, now: NOW });
    expect(page.groupClasses).toEqual([{ id, date: CLASS.date, time: CLASS.time, minutes: 60, title: 'Strength circuit', address: 'Victoria Park, London E9', price: 15, spotsLeft: 2 }]);
    expect(JSON.stringify(page)).not.toContain('Jo Bloggs');
  });

  // Ani 2026-10-05: a class needs to say where it is.
  test('an address is optional, trimmed and bounded', async () => {
    const none = await put({ address: undefined, time: '19:00' });
    expect((await db.doc(`groupClasses/${none.id}`).get()).data().address).toBe('');
    const long = await put({ address: `  ${'x'.repeat(400)}  `, time: '20:00' });
    expect((await db.doc(`groupClasses/${long.id}`).get()).data().address).toHaveLength(150);
  });

  test('refused over a session already in the calendar, in the past, or with nonsense numbers', async () => {
    await db.doc('schedule/s1').set({ trainerId: COACH, clientId: 'c1', date: CLASS.date, time: '17:30', duration: 60, status: 'confirmed' });
    await expect(put()).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(put({ date: '2026-09-30' })).rejects.toMatchObject({ code: 'invalid-argument' });
    for (const over of [{ capacity: 1 }, { capacity: 21 }, { minPeople: 4 }, { minPeople: 0 }, { price: -1 }, { time: '25:00' }]) {
      await expect(put({ time: '19:00', ...over })).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    await db.doc('users/student').set({ id: 'student', role: 'client' });
    await expect(pb.saveGroupClass({ db, trainerId: 'student', input: CLASS, now: NOW })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('places fill up; a full class is refused and leaves the page', async () => {
    const { id } = await put({ capacity: 2, minPeople: 1 });
    await join(id, { name: 'A' }, '198.51.100.1');
    await join(id, { name: 'B' }, '198.51.100.2');
    await expect(join(id, { name: 'C' }, '198.51.100.3')).rejects.toMatchObject({ code: 'failed-precondition' });
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).groupClasses).toEqual([]);
  });

  test('a request carries the class\'s own time, whatever the visitor sends', async () => {
    const { id } = await put();
    const res = await join(id, { date: '2030-01-01', time: '03:00' });
    expect((await db.doc(`trialRequests/${res.requestId}`).get()).data()).toMatchObject({
      groupClassId: id, classTitle: 'Strength circuit', date: CLASS.date, time: CLASS.time,
    });
  });

  test('not joinable within 2 hours of the start, nor another coach\'s class', async () => {
    const { id } = await put({ date: '2026-10-01', time: '10:00' }); // 2h after NOW (08:00 London) is 10:00 — the edge
    await expect(pb.requestTrial({ db, ip: 'x', now: new Date('2026-10-01T08:01:00Z'),
      input: { slug: SLUG, name: 'Jo', contact: '07700 900123', consent: true, groupClassId: id } })).rejects.toMatchObject({ code: 'failed-precondition' });
    await db.doc('groupClasses/other').set({ id: 'other', trainerId: OTHER, date: '2026-10-05', time: '18:00', capacity: 5, status: 'open', duration: 60 });
    await expect(join('other')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('confirming a place: a client without the app and their own session in the class, outside the pack', async () => {
    const { id } = await put();
    const { requestId } = await join(id);
    const res = await pb.respondToRequest({ db, trainerId: COACH, requestId, action: 'confirm', now: NOW });
    expect((await db.doc(`schedule/${res.schedId}`).get()).data()).toMatchObject({
      clientId: res.clientId, date: CLASS.date, time: CLASS.time, type: pb.GROUP_TYPE, groupClassId: id, trial: true, status: 'confirmed',
    });
    // Still one place taken — now by the session instead of the request.
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).groupClasses[0].spotsLeft).toBe(2);
  });

  test('cancelling: closed, calendar freed, requests deleted, places cancelled — and the coach gets everyone to tell', async () => {
    const { id } = await put();
    const first = await join(id, { name: 'Jo Bloggs' }, '198.51.100.1');
    await pb.respondToRequest({ db, trainerId: COACH, requestId: first.requestId, action: 'confirm', now: NOW });
    const second = await join(id, { name: 'Sam Lee', contact: 'sam@example.test' }, '198.51.100.2');
    await expect(pb.cancelGroupClass({ db, trainerId: OTHER, classId: id })).rejects.toMatchObject({ code: 'not-found' });
    const res = await pb.cancelGroupClass({ db, trainerId: COACH, classId: id });
    expect(res.tell).toEqual(expect.arrayContaining([
      { name: 'Jo Bloggs', contact: '07700 900123' }, { name: 'Sam Lee', contact: 'sam@example.test' },
    ]));
    expect((await db.doc(`groupClasses/${id}`).get()).data().status).toBe('cancelled');
    expect((await db.doc(`schedule/gc-${id}`).get()).exists).toBe(false);
    expect((await db.doc(`trialRequests/${second.requestId}`).get()).exists).toBe(false);
    const sessions = (await db.collection('schedule').get()).docs.map(d => d.data()).filter(x => x.groupClassId === id);
    expect(sessions.every(x => x.status === 'cancelled')).toBe(true);
    expect((await pb.getPage({ db, slug: SLUG, now: NOW })).groupClasses).toEqual([]);
  });

  test('a request for a class cancelled in the meantime cannot be confirmed', async () => {
    const { id } = await put();
    const { requestId } = await join(id);
    await db.doc(`groupClasses/${id}`).update({ status: 'cancelled' });
    await expect(pb.respondToRequest({ db, trainerId: COACH, requestId, action: 'confirm', now: NOW }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('the class\'s hour is not offered as a 1-to-1 trial', async () => {
    await put({ date: '2026-10-02', time: '10:00' });
    const page = await pb.getPage({ db, slug: SLUG, now: NOW });
    expect(page.slots.filter(s => s.date === '2026-10-02').map(s => s.time)).toEqual(['09:00', '11:00']);
  });
});
