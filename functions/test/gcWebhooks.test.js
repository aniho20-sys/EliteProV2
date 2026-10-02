/**
 * functions/gcWebhooks.js against the Firestore emulator, with GoCardless faked.
 *
 * Phase 3 Step 4: a confirmed monthly payment adds the month's sessions; unused sessions
 * roll over up to half the quota; failures mark the plan past due; ended mandates and
 * subscriptions cancel it. Events arrive at least once and must never grant twice.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-gcwebhooks';

const crypto = require('crypto');
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-gcwebhooks' });
const db = admin.firestore();
const { verifyWebhookSignature, periodEnd, rollover, handleWebhook } = require('../gcWebhooks');

const COLS = ['users', 'subscriptions', 'paymentConnections', 'creditLedger', 'schedule', 'gcEvents'];
async function clearAll() {
  for (const col of COLS) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}

// ── Fake GoCardless: payments by id ──
let payments;
let fetchCalls;
const fetchImpl = async (url, opts) => {
  fetchCalls.push({ url, auth: opts.headers.Authorization });
  const id = url.split('/payments/')[1];
  const p = payments[id];
  if (!p) return { ok: false, status: 404, text: async () => '{}' };
  return { ok: true, status: 200, text: async () => JSON.stringify({ payments: p }) };
};
let notified;
const notify = async (n) => { notified.push(n); };
const readToken = async (trainerId) => `token-for-${trainerId}`;
const NOW = () => new Date('2026-10-01T09:00:00Z');

const run = (events, over = {}) => handleWebhook({ db, body: { events }, readToken, fetchImpl, now: NOW, notify, ...over });
const ev = (id, resource_type, action, links, details = {}) => ({ id, resource_type, action, links: { organisation: 'OR_A', ...links }, details });
const paymentConfirmed = (id, paymentId) => ev(id, 'payments', 'confirmed', { payment: paymentId });

const client = async () => (await db.doc('users/c1').get()).data();
const sub = async () => (await db.doc('subscriptions/s1').get()).data();
const ledger = async () => (await db.collection('creditLedger').get()).docs.map(d => ({ id: d.id, ...d.data() }));

beforeEach(async () => {
  await clearAll();
  payments = {};
  fetchCalls = [];
  notified = [];
  await db.doc('paymentConnections/coachA').set({ trainerId: 'coachA', providerAccountId: 'OR_A', status: 'connected' });
  await db.doc('paymentConnections/coachB').set({ trainerId: 'coachB', providerAccountId: 'OR_B', status: 'connected' });
  await db.doc('users/coachA').set({ id: 'coachA', role: 'trainer' });
  await db.doc('users/c1').set({ id: 'c1', role: 'client', trainerId: 'coachA', totalSessions: 0, sessionOffset: 0 });
  await db.doc('subscriptions/s1').set({
    clientId: 'c1', trainerId: 'coachA', tier: 8, ratePerSession: 65, status: 'active',
    providerSubscriptionId: 'SB1', providerAuthorisationId: 'MD1', rolloverBanked: 0,
  });
});
afterAll(async () => { await clearAll(); await admin.app().delete(); });

describe('signature', () => {
  const secret = 'whsec_test';
  const body = Buffer.from('{"events":[]}');
  const sign = (b, s = secret) => crypto.createHmac('sha256', s).update(b).digest('hex');

  test('a correctly signed body passes', () => {
    expect(verifyWebhookSignature(body, sign(body), secret)).toBe(true);
  });
  test('a changed body, a wrong secret, or no signature fails', () => {
    expect(verifyWebhookSignature(Buffer.from('{"events":[{}]}'), sign(body), secret)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, 'other'), secret)).toBe(false);
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), '')).toBe(false);
  });
});

describe('periods and roll-over', () => {
  test.each([
    ['2026-10-01', '2026-10-31'],
    ['2026-10-15', '2026-11-14'],
    ['2026-01-31', '2026-02-27'],
    ['2026-12-10', '2027-01-09'],
  ])('a period starting %s ends %s', (start, end) => expect(periodEnd(start)).toBe(end));

  // The design doc's own examples (§4).
  test.each([
    [{ tier: 4, carriedIn: 0, used: 0 }, { kept: 2, forfeit: 2 }],
    [{ tier: 8, carriedIn: 0, used: 5 }, { kept: 3, forfeit: 0 }],
    [{ tier: 12, carriedIn: 0, used: 2 }, { kept: 6, forfeit: 4 }],
    [{ tier: 8, carriedIn: 4, used: 12 }, { kept: 0, forfeit: 0 }],
    [{ tier: 8, carriedIn: 0, used: 10 }, { kept: 0, forfeit: 0 }], // overused: nothing to keep
  ])('%j', (input, expected) => expect(rollover(input)).toMatchObject(expected));
});

describe('payment confirmed', () => {
  test('first payment: the month is added, recorded, and the client told', async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    expect(await run([paymentConfirmed('EV1', 'PM1')])).toEqual({ processed: 1, failed: 0 });

    expect((await client()).totalSessions).toBe(8);
    expect(await ledger()).toEqual([expect.objectContaining({ id: 'subpay-PM1', qty: 8, rate: 65, type: 'subscription', clientId: 'c1', trainerId: 'coachA' })]);
    expect(await sub()).toMatchObject({ currentPeriodStart: '2026-10-01', currentPeriodEnd: '2026-10-31', rolloverBanked: 0, lastPaymentStatus: 'confirmed' });
    expect(notified).toEqual([expect.objectContaining({ userId: 'c1', title: 'Sessions added' })]);
    expect(fetchCalls[0].auth).toBe('Bearer token-for-coachA'); // asked GoCardless as that coach
  });

  test('the same event delivered twice grants once', async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV1', 'PM1')]);
    await run([paymentConfirmed('EV1', 'PM1')]);
    expect((await client()).totalSessions).toBe(8);
  });

  test('two different events about the same payment still grant once', async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV1', 'PM1'), paymentConfirmed('EV2', 'PM1')]);
    expect((await client()).totalSessions).toBe(8);
    expect(notified).toHaveLength(1);
  });

  test('next month: unused sessions within the cap roll over, nothing forfeited', async () => {
    await db.doc('subscriptions/s1').update({ currentPeriodStart: '2026-09-01', currentPeriodEnd: '2026-09-30', rolloverBanked: 0 });
    await db.doc('users/c1').update({ totalSessions: 8, sessionOffset: 5 }); // used 5 of 8
    for (let i = 1; i <= 5; i++) await db.doc(`schedule/x${i}`).set({ clientId: 'c1', trainerId: 'coachA', date: `2026-09-0${i}`, status: 'completed' });
    payments.PM2 = { id: 'PM2', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV2', 'PM2')]);
    expect((await client()).totalSessions).toBe(16); // 3 left + 8 new = 11 remaining
    expect((await sub()).rolloverBanked).toBe(3);
    expect((await ledger()).filter(l => l.qty < 0)).toEqual([]);
  });

  test('next month: unused beyond half the quota is forfeited, and recorded as such', async () => {
    await db.doc('subscriptions/s1').update({ tier: 4, currentPeriodStart: '2026-09-01', currentPeriodEnd: '2026-09-30' });
    await db.doc('users/c1').update({ totalSessions: 4, sessionOffset: 0 }); // used none
    payments.PM2 = { id: 'PM2', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV2', 'PM2')]);
    expect((await client()).totalSessions).toBe(6); // kept 2 + 4 new
    expect(await ledger()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'subpay-PM2', qty: 4 }),
      expect.objectContaining({ id: 'subforfeit-PM2', qty: -2, type: 'subscription_rollover_forfeit' }),
    ]));
  });

  test('cancelled and other coaches’ sessions do not count as used', async () => {
    await db.doc('subscriptions/s1').update({ tier: 4, currentPeriodStart: '2026-09-01', currentPeriodEnd: '2026-09-30' });
    await db.doc('users/c1').update({ totalSessions: 4, sessionOffset: 0 });
    await db.doc('schedule/a').set({ clientId: 'c1', trainerId: 'coachA', date: '2026-09-05', status: 'cancelled' });
    await db.doc('schedule/b').set({ clientId: 'c1', trainerId: 'someoneElse', date: '2026-09-06', status: 'completed' });
    await db.doc('schedule/c').set({ clientId: 'c1', trainerId: 'coachA', date: '2026-10-02', status: 'confirmed' }); // next period
    payments.PM2 = { id: 'PM2', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV2', 'PM2')]);
    expect((await client()).totalSessions).toBe(6); // all 4 unused → keep 2, forfeit 2
  });

  test('never takes back more than the client holds', async () => {
    await db.doc('subscriptions/s1').update({ tier: 12, currentPeriodStart: '2026-09-01', currentPeriodEnd: '2026-09-30' });
    await db.doc('users/c1').update({ totalSessions: 12, sessionOffset: 10 }); // 2 left, but no sessions booked in the period
    payments.PM2 = { id: 'PM2', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV2', 'PM2')]);
    // Rule says forfeit 12-6=6; the client only has 2, so only 2 go.
    expect((await client()).totalSessions).toBe(22);
    expect((await ledger()).find(l => l.id === 'subforfeit-PM2').qty).toBe(-2);
  });

  test('the event says confirmed but GoCardless says otherwise: nothing granted', async () => {
    payments.PM1 = { id: 'PM1', status: 'failed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV1', 'PM1')]);
    expect((await client()).totalSessions).toBe(0);
  });

  test('a payment that is not one of our subscriptions is ignored', async () => {
    payments.PM9 = { id: 'PM9', status: 'confirmed', charge_date: '2026-10-01', links: {} };
    await run([paymentConfirmed('EV9', 'PM9')]);
    expect((await client()).totalSessions).toBe(0);
    expect((await db.doc('gcEvents/EV9').get()).data().outcome).toBe('not_ours');
  });
});

describe('tenant isolation', () => {
  test("an event from another coach's GoCardless account cannot touch this coach's plan", async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([{ ...paymentConfirmed('EV1', 'PM1'), links: { organisation: 'OR_B', payment: 'PM1' } }]);
    expect((await client()).totalSessions).toBe(0);
    expect(fetchCalls[0].auth).toBe('Bearer token-for-coachB');
  });

  test('an unknown GoCardless account is ignored without calling GoCardless', async () => {
    await run([{ ...paymentConfirmed('EV1', 'PM1'), links: { organisation: 'OR_NOBODY', payment: 'PM1' } }]);
    expect(fetchCalls).toEqual([]);
    expect((await db.doc('gcEvents/EV1').get()).data().outcome).toBe('unknown_organisation');
  });
});

describe('failures and endings', () => {
  test('a failed payment marks the plan past due and tells the coach and the client', async () => {
    payments.PM1 = { id: 'PM1', status: 'failed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([ev('EV1', 'payments', 'failed', { payment: 'PM1' }, { cause: 'insufficient_funds' })]);
    expect(await sub()).toMatchObject({ status: 'past_due', lastPaymentStatus: 'failed', paymentFailedAt: '2026-10-01' });
    expect((await sub()).lastError).toContain('insufficient_funds');
    expect(notified.map(n => n.userId).sort()).toEqual(['c1', 'coachA']);
    expect((await client()).totalSessions).toBe(0);
  });

  test('a later successful retry puts it back to active', async () => {
    await db.doc('subscriptions/s1').update({ status: 'past_due', lastPaymentStatus: 'failed' });
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-05', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EV2', 'PM1')]);
    expect(await sub()).toMatchObject({ status: 'active', lastPaymentStatus: 'confirmed', paymentFailedAt: null });
  });

  test.each([
    ['subscriptions', 'cancelled', { subscription: 'SB1' }],
    ['subscriptions', 'finished', { subscription: 'SB1' }],
    ['mandates', 'cancelled', { mandate: 'MD1' }],
    ['mandates', 'expired', { mandate: 'MD1' }],
  ])('%s %s cancels the plan', async (type, action, links) => {
    await run([ev('EV1', type, action, links)]);
    expect((await sub()).status).toBe('cancelled');
  });

  test('events we do not act on are recorded and left alone', async () => {
    await run([ev('EV1', 'payouts', 'paid', { payout: 'PO1' })]);
    expect((await db.doc('gcEvents/EV1').get()).data().outcome).toBe('ignored');
    expect((await sub()).status).toBe('active');
  });
});

describe('retries', () => {
  test('if the coach token cannot be read, the event is not marked done — GoCardless will resend', async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    const res = await run([paymentConfirmed('EV1', 'PM1')], { readToken: async () => { throw new Error('secret unavailable'); } });
    expect(res).toEqual({ processed: 0, failed: 1 });
    expect((await db.doc('gcEvents/EV1').get()).exists).toBe(false);
    // …and when it is resent and works, the month is granted.
    await run([paymentConfirmed('EV1', 'PM1')]);
    expect((await client()).totalSessions).toBe(8);
  });

  test('malformed events are skipped, not fatal', async () => {
    expect(await run([null, { id: '../x' }, { id: 'ok1', resource_type: 'payouts', action: 'paid', links: { organisation: 'OR_A' } }]))
      .toEqual({ processed: 3, failed: 0 });
  });
});

// ── A trainer's own GoCardless account (B36) ──
// Events arrive at gcWebhook/<uid>, signed with that trainer's own secret, so the trainer
// is known before the body is read. Tenant isolation must hold all the same.
describe("a trainer's own GoCardless account", () => {
  const { webhookRoute } = require('../gcWebhooks');

  test('the URL decides the route: bare = partner app, /<uid> = that trainer, anything else refused', () => {
    expect(webhookRoute('/')).toEqual({ trainerId: null });
    expect(webhookRoute('')).toEqual({ trainerId: null });
    expect(webhookRoute('/zY3mbXFAXoaYvGxEQwH15zTZtOF3')).toEqual({ trainerId: 'zY3mbXFAXoaYvGxEQwH15zTZtOF3' });
    expect(webhookRoute('/zY3mbXFAXoaYvGxEQwH15zTZtOF3/')).toEqual({ trainerId: 'zY3mbXFAXoaYvGxEQwH15zTZtOF3' });
    for (const bad of ['/a/b', '/../x', '/short', '/has space here', '/x%2Fy1234567']) {
      expect(webhookRoute(bad)).toEqual({ invalid: true });
    }
  });

  test('a proven trainer is used as-is — the event\'s organisation is not consulted', async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    // No organisation at all (a merchant's own endpoint may not send one).
    const event = { id: 'EVD1', resource_type: 'payments', action: 'confirmed', links: { payment: 'PM1' } };
    const res = await run([event], { trainerId: 'coachA' });
    expect(res).toEqual({ processed: 1, failed: 0 });
    expect((await client()).totalSessions).toBe(8);
  });

  test("a proven trainer still cannot touch another trainer's plan", async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([ev('EVD2', 'payments', 'confirmed', { payment: 'PM1' })], { trainerId: 'coachB' });
    expect((await client()).totalSessions).toBe(0);
    expect((await db.doc('gcEvents/EVD2').get()).data().outcome).toBe('not_ours');
  });

  test('payments are looked up on the GoCardless the trainer is connected to', async () => {
    payments.PM1 = { id: 'PM1', status: 'confirmed', charge_date: '2026-10-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EVS', 'PM1')]);
    expect(fetchCalls[0].url).toBe('https://api-sandbox.gocardless.com/payments/PM1'); // no environment recorded = sandbox

    fetchCalls = [];
    await db.doc('paymentConnections/coachA').update({ environment: 'live' });
    payments.PM2 = { id: 'PM2', status: 'confirmed', charge_date: '2026-11-01', links: { subscription: 'SB1' } };
    await run([paymentConfirmed('EVL', 'PM2')]);
    expect(fetchCalls[0].url).toBe('https://api.gocardless.com/payments/PM2');
  });
});
