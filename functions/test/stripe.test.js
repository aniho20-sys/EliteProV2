/**
 * B49 — Stripe monthly plans (functions/stripe*.js) against the Firestore emulator, with
 * Stripe faked. Nothing here talks to Stripe or to production (#38).
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-stripe';

const crypto = require('crypto');
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-stripe' });
const db = admin.firestore();

const { formEncode, verifyStripeSignature, keyEnvironment } = require('../stripeApi');
const { saveStripeKeys, startConnect, refreshConnection, trainerForAccount } = require('../stripeConnect');
const stripeSubs = require('../stripeSubscriptions');
const { handleStripeWebhook } = require('../stripeWebhooks');
const gcSubs = require('../gcSubscriptions');

const COLS = ['users', 'subscriptions', 'paymentConnections', 'creditLedger', 'schedule', 'stripeEvents'];
async function clearAll() {
  for (const col of COLS) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
}

const KEYS = { secretKey: 'sk_test_abcdefghijklmnop', webhookSecret: 'whsec_abcdefghijklmnop' };
const NOW = () => new Date('2026-10-15T09:00:00Z');

// ── Fake Stripe: a route table, every call recorded with its account and form body. ──
function fakeStripe(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    const call = {
      method: init.method, path: u.pathname,
      account: init.headers['Stripe-Account'] || null,
      idempotencyKey: init.headers['Idempotency-Key'] || null,
      auth: init.headers.Authorization,
      body: init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null,
    };
    calls.push(call);
    const handler = routes[`${call.method} ${call.path}`];
    if (!handler) throw new Error(`unexpected Stripe call: ${call.method} ${call.path}`);
    const [status, body] = handler(call);
    return { ok: status < 300, status, text: async () => JSON.stringify(body) };
  };
  return { calls, fetchImpl };
}

const coachConn = (id, accountId, extra = {}) => db.doc(`paymentConnections/${id}`).set({
  trainerId: id, stripe: { accountId, country: 'GB', environment: 'sandbox', status: 'connected', bacsEnabled: true, ...extra },
});

let notified;
const notify = async (n) => { notified.push(n); };

beforeEach(async () => {
  await clearAll();
  notified = [];
  await db.doc('users/coachA').set({ id: 'coachA', role: 'trainer', email: 'a@coach.test', subscriptionRate: 65, currency: 'GBP' });
  await db.doc('users/coachB').set({ id: 'coachB', role: 'trainer', subscriptionRate: 400, currency: 'HKD' });
  await db.doc('users/c1').set({ id: 'c1', role: 'client', trainerId: 'coachA', email: 'c1@x.test', subscriptionTester: true, totalSessions: 0, sessionOffset: 0 });
  await db.doc('users/c2').set({ id: 'c2', role: 'client', trainerId: 'coachB', subscriptionTester: true, totalSessions: 0, sessionOffset: 0 });
  await coachConn('coachA', 'acct_AAAAAAAA');
});
afterAll(async () => { await clearAll(); await admin.app().delete(); });

// ─────────────────────────────────────────────────────────────────────────────
describe('Stripe basics', () => {
  test('form encoding: nested objects and arrays, nulls left out', () => {
    const s = formEncode({ a: 1, b: { c: 'x y' }, d: ['p', 'q'], e: [{ f: 2 }], g: null, h: undefined });
    expect(decodeURIComponent(s)).toBe('a=1&b[c]=x y&d[0]=p&d[1]=q&e[0][f]=2');
  });

  const sign = (body, t, secret = 'whsec_s') => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
  test('a correctly signed, fresh body passes', () => {
    expect(verifyStripeSignature(Buffer.from('{"a":1}'), sign('{"a":1}', 1000), 'whsec_s', 1010)).toBe(true);
  });
  test('a changed body, a wrong secret, an old timestamp or no v1 fails', () => {
    expect(verifyStripeSignature(Buffer.from('{"a":2}'), sign('{"a":1}', 1000), 'whsec_s', 1010)).toBe(false);
    expect(verifyStripeSignature(Buffer.from('{"a":1}'), sign('{"a":1}', 1000, 'whsec_x'), 'whsec_s', 1010)).toBe(false);
    expect(verifyStripeSignature(Buffer.from('{"a":1}'), sign('{"a":1}', 1000), 'whsec_s', 1000 + 301)).toBe(false);
    expect(verifyStripeSignature(Buffer.from('{"a":1}'), 't=1000', 'whsec_s', 1010)).toBe(false);
  });
  test('one good signature among several is enough (Stripe rolls secrets)', () => {
    const good = sign('{"a":1}', 1000).split(',')[1];
    expect(verifyStripeSignature(Buffer.from('{"a":1}'), `t=1000,v1=deadbeef,${good}`, 'whsec_s', 1010)).toBe(true);
  });
  test('test vs live is read from the key', () => {
    expect(keyEnvironment('sk_test_x')).toBe('sandbox');
    expect(keyEnvironment('rk_live_x')).toBe('live');
    expect(keyEnvironment('pk_live_x')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Ani saves the platform keys', () => {
  const balance = (livemode) => fakeStripe({ 'GET /v1/balance': () => [200, { object: 'balance', livemode }] });

  test('a test key Stripe accepts is stored, trimmed, as sandbox', async () => {
    const written = [];
    const res = await saveStripeKeys({ secretKey: `  ${KEYS.secretKey}\n`, webhookSecret: `${KEYS.webhookSecret} `,
      fetchImpl: balance(false).fetchImpl, writeKeys: async (k) => written.push(k) });
    expect(res).toEqual({ environment: 'sandbox' });
    expect(written).toEqual([KEYS]);
  });
  test('not a key, or a publishable key: refused before Stripe is asked', async () => {
    const st = balance(false);
    await expect(saveStripeKeys({ secretKey: 'pk_test_abcdefghijk', webhookSecret: KEYS.webhookSecret, fetchImpl: st.fetchImpl, writeKeys: async () => {} }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(saveStripeKeys({ secretKey: KEYS.secretKey, webhookSecret: 'nope', fetchImpl: st.fetchImpl, writeKeys: async () => {} }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(st.calls).toHaveLength(0);
  });
  test('a key whose name says live but Stripe says test is refused and not stored', async () => {
    const written = [];
    await expect(saveStripeKeys({ secretKey: 'sk_live_abcdefghijklmnop', webhookSecret: KEYS.webhookSecret,
      fetchImpl: balance(false).fetchImpl, writeKeys: async (k) => written.push(k) })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(written).toHaveLength(0);
  });
  test('a key Stripe rejects is reported as such', async () => {
    const st = fakeStripe({ 'GET /v1/balance': () => [401, { error: { type: 'invalid_request_error' } }] });
    await expect(saveStripeKeys({ ...KEYS, fetchImpl: st.fetchImpl, writeKeys: async () => {} }))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'Stripe did not accept that key' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('a coach connects their own Stripe account', () => {
  const routes = () => ({
    'POST /v1/accounts': (c) => [200, { id: 'acct_NEWHKACCT', country: c.body.country }],
    'POST /v1/account_links': () => [200, { url: 'https://connect.stripe.com/setup/x' }],
  });
  const start = (over) => startConnect({ db, keys: KEYS, now: NOW, returnUrl: 'https://r', refreshUrl: 'https://f', ...over });

  test('a Hong Kong coach gets their own full-dashboard account in HK, and the onboarding link', async () => {
    const st = fakeStripe(routes());
    const res = await start({ trainerId: 'coachB', country: 'hk', fetchImpl: st.fetchImpl });
    expect(res).toEqual({ url: 'https://connect.stripe.com/setup/x' });
    const create = st.calls[0];
    expect(create.body).toMatchObject({
      country: 'HK',
      'controller[stripe_dashboard][type]': 'full',
      'controller[fees][payer]': 'account',
      'controller[losses][payments]': 'stripe',
      'controller[requirement_collection]': 'stripe',
      'metadata[trainer_id]': 'coachB',
    });
    expect(create.idempotencyKey).toBe('acct-coachB-HK-sandbox');
    expect(st.calls[1].body).toMatchObject({ account: 'acct_NEWHKACCT', type: 'account_onboarding' });
    const conn = (await db.doc('paymentConnections/coachB').get()).data().stripe;
    expect(conn).toMatchObject({ accountId: 'acct_NEWHKACCT', country: 'HK', environment: 'sandbox', status: 'onboarding' });
  });
  test('coming back to it reuses the same account — no second one', async () => {
    const st = fakeStripe(routes());
    await start({ trainerId: 'coachA', fetchImpl: st.fetchImpl });
    expect(st.calls.map(c => c.path)).toEqual(['/v1/account_links']);
    expect(st.calls[0].body.account).toBe('acct_AAAAAAAA');
  });
  test('an account made with the other mode’s key is not reused', async () => {
    const st = fakeStripe(routes());
    await start({ trainerId: 'coachA', country: 'GB', fetchImpl: st.fetchImpl, keys: { ...KEYS, secretKey: 'sk_live_abcdefghijklmnop' } });
    expect(st.calls[0].path).toBe('/v1/accounts');
  });
  test('an unsupported country, a client, or no Stripe set up: refused', async () => {
    const st = fakeStripe(routes());
    await expect(start({ trainerId: 'coachB', country: 'ZZ', fetchImpl: st.fetchImpl })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(start({ trainerId: 'c1', country: 'GB', fetchImpl: st.fetchImpl })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(start({ trainerId: 'coachB', country: 'GB', fetchImpl: st.fetchImpl, keys: null })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(st.calls).toHaveLength(0);
  });

  test('refresh: Stripe enabling charges makes it connected, and tells the clients which mode', async () => {
    await coachConn('coachA', 'acct_AAAAAAAA', { status: 'onboarding' });
    const st = fakeStripe({ 'GET /v1/accounts/acct_AAAAAAAA': () => [200, {
      id: 'acct_AAAAAAAA', charges_enabled: true, details_submitted: true, country: 'GB', default_currency: 'gbp',
      capabilities: { bacs_debit_payments: 'active', card_payments: 'active' } }] });
    expect(await refreshConnection({ db, trainerId: 'coachA', keys: KEYS, fetchImpl: st.fetchImpl, now: NOW }))
      .toEqual({ status: 'connected', chargesEnabled: true });
    expect((await db.doc('paymentConnections/coachA').get()).data().stripe).toMatchObject({ status: 'connected', bacsEnabled: true, defaultCurrency: 'GBP' });
    expect((await db.doc('users/coachA').get()).data().stripeEnvironment).toBe('sandbox');
  });
  test('refresh: not yet able to take payments stays onboarding, and clients are not offered plans', async () => {
    const st = fakeStripe({ 'GET /v1/accounts/acct_AAAAAAAA': () => [200, { id: 'acct_AAAAAAAA', charges_enabled: false, capabilities: {} }] });
    expect((await refreshConnection({ db, trainerId: 'coachA', keys: KEYS, fetchImpl: st.fetchImpl, now: NOW })).status).toBe('onboarding');
    expect((await db.doc('users/coachA').get()).data().stripeEnvironment).toBeNull();
  });
  test('whose account an event is about: the one coach, never a guess', async () => {
    expect(await trainerForAccount(db, 'acct_AAAAAAAA')).toBe('coachA');
    await coachConn('coachB', 'acct_AAAAAAAA');
    expect(await trainerForAccount(db, 'acct_AAAAAAAA')).toBeNull();
    expect(await trainerForAccount(db, 'not-an-account')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
const checkoutRoutes = (over = {}) => ({
  'POST /v1/checkout/sessions': () => [200, { id: 'cs_test_NEW', url: 'https://checkout.stripe.com/c/pay/cs_test_NEW' }],
  ...over,
});
const startPlan = (uid, tier, st, over = {}) => stripeSubs.startSubscription({
  db, uid, tier, keys: KEYS, fetchImpl: st.fetchImpl, now: NOW,
  returnUrl: (id) => `https://fn/return?sub=${id}`, exitUrl: 'https://app/exit', ...over,
});
const plans = async (uid) => (await db.collection('subscriptions').where('clientId', '==', uid).get()).docs.map(d => d.data());

describe('a client starts a plan', () => {
  test('UK coach: priced on the server, card or Bacs, on the coach’s own account', async () => {
    const st = fakeStripe(checkoutRoutes());
    const res = await startPlan('c1', 8, st);
    expect(res.url).toBe('https://checkout.stripe.com/c/pay/cs_test_NEW');
    const call = st.calls[0];
    expect(call.account).toBe('acct_AAAAAAAA');
    expect(call.idempotencyKey).toBe(`cs-${res.subscriptionId}`);
    expect(call.body).toMatchObject({
      mode: 'subscription',
      client_reference_id: res.subscriptionId,
      'payment_method_types[0]': 'card',
      'payment_method_types[1]': 'bacs_debit',
      'line_items[0][price_data][currency]': 'gbp',
      'line_items[0][price_data][unit_amount]': '56333', // £65 × 8 × 13 / 12
      'line_items[0][price_data][recurring][interval]': 'month',
      'subscription_data[metadata][subscription_id]': res.subscriptionId,
    });
    const [plan] = await plans('c1');
    expect(plan).toMatchObject({ status: 'pending', provider: 'stripe', currency: 'GBP', providerAccountId: 'acct_AAAAAAAA',
      checkoutSessionId: 'cs_test_NEW', monthlyAmount: 563.33, tier: 8 });
  });
  test('Hong Kong coach: HKD, card only', async () => {
    await coachConn('coachB', 'acct_BBBBBBBB', { country: 'HK', bacsEnabled: false });
    const st = fakeStripe(checkoutRoutes());
    await startPlan('c2', 4, st);
    expect(st.calls[0].body['line_items[0][price_data][currency]']).toBe('hkd');
    expect(st.calls[0].body['line_items[0][price_data][unit_amount]']).toBe('173333'); // HK$400 × 4 × 13 / 12
    expect(st.calls[0].body['payment_method_types[1]']).toBeUndefined();
  });
  test('a UK coach Stripe has not switched Bacs on for: card only', async () => {
    await coachConn('coachA', 'acct_AAAAAAAA', { bacsEnabled: false });
    const st = fakeStripe(checkoutRoutes());
    await startPlan('c1', 4, st);
    expect(st.calls[0].body['payment_method_types[1]']).toBeUndefined();
  });
  test('refused: not a pilot client, coach not connected, already on a plan (any processor)', async () => {
    const st = fakeStripe(checkoutRoutes());
    await db.doc('users/c1').update({ subscriptionTester: false });
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'permission-denied' });
    await db.doc('users/c1').update({ subscriptionTester: true });
    await expect(startPlan('c2', 4, st)).rejects.toMatchObject({ code: 'failed-precondition' });
    await db.doc('subscriptions/gcplan0001').set({ clientId: 'c1', trainerId: 'coachA', status: 'active', provider: 'gocardless' });
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'already-exists' });
    expect(st.calls).toHaveLength(0);
  });
  test('an earlier unfinished Stripe checkout is closed at Stripe and marked abandoned', async () => {
    await db.doc('subscriptions/oldplan001').set({ clientId: 'c1', trainerId: 'coachA', status: 'pending', provider: 'stripe',
      providerAccountId: 'acct_AAAAAAAA', checkoutSessionId: 'cs_test_OLD' });
    const st = fakeStripe(checkoutRoutes({ 'POST /v1/checkout/sessions/cs_test_OLD/expire': () => [200, { id: 'cs_test_OLD', status: 'expired' }] }));
    await startPlan('c1', 4, st);
    expect(st.calls.map(c => c.path)).toContain('/v1/checkout/sessions/cs_test_OLD/expire');
    expect((await db.doc('subscriptions/oldplan001').get()).data().status).toBe('abandoned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
const seedPlan = (id, fields) => db.doc(`subscriptions/${id}`).set({
  id, clientId: 'c1', trainerId: 'coachA', tier: 8, ratePerSession: 65, currency: 'GBP', provider: 'stripe',
  providerAccountId: 'acct_AAAAAAAA', checkoutSessionId: 'cs_test_1', status: 'pending', rolloverBanked: 0,
  updatedAt: NOW().toISOString(), ...fields,
});
const complete = (id, st) => stripeSubs.completeSubscription({ db, subscriptionId: id, keys: KEYS, fetchImpl: st.fetchImpl, now: NOW });

describe('back from Stripe — only Stripe’s answer counts', () => {
  test('complete with a subscription: active', async () => {
    await seedPlan('plan000001', {});
    const st = fakeStripe({ 'GET /v1/checkout/sessions/cs_test_1': () => [200, { id: 'cs_test_1', status: 'complete', subscription: 'sub_1', customer: 'cus_1' }] });
    expect(await complete('plan000001', st)).toEqual({ status: 'active' });
    expect((await db.doc('subscriptions/plan000001').get()).data()).toMatchObject({ status: 'active', providerSubscriptionId: 'sub_1', providerCustomerId: 'cus_1' });
    expect(st.calls[0].account).toBe('acct_AAAAAAAA');
    // A second return (reload, webhook) does not ask Stripe again or change anything.
    expect(await complete('plan000001', st)).toEqual({ status: 'active' });
    expect(st.calls).toHaveLength(1);
  });
  test('still open: stays pending; expired: abandoned', async () => {
    await seedPlan('plan000002', { checkoutSessionId: 'cs_test_2' });
    await seedPlan('plan000003', { checkoutSessionId: 'cs_test_3' });
    const st = fakeStripe({
      'GET /v1/checkout/sessions/cs_test_2': () => [200, { id: 'cs_test_2', status: 'open', subscription: null }],
      'GET /v1/checkout/sessions/cs_test_3': () => [200, { id: 'cs_test_3', status: 'expired' }],
    });
    expect(await complete('plan000002', st)).toEqual({ status: 'pending' });
    expect(await complete('plan000003', st)).toEqual({ status: 'abandoned' });
  });
  test('a subscription id on a session Stripe does not call complete is not enough', async () => {
    await seedPlan('plan000004', { checkoutSessionId: 'cs_test_4' });
    const st = fakeStripe({ 'GET /v1/checkout/sessions/cs_test_4': () => [200, { id: 'cs_test_4', status: 'open', subscription: 'sub_4' }] });
    expect(await complete('plan000004', st)).toEqual({ status: 'pending' });
  });
  test('a made-up id in the URL does nothing', async () => {
    const st = fakeStripe({});
    expect(await complete('../../x', st)).toEqual({ status: 'unknown' });
    expect(await complete('nosuchplan01', st)).toEqual({ status: 'unknown' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('cancelling', () => {
  const cancel = (uid, id, st) => stripeSubs.cancelSubscription({ db, uid, subscriptionId: id, keys: KEYS, fetchImpl: st.fetchImpl, now: NOW });

  test('an active plan: cancelled at Stripe first, then marked', async () => {
    await seedPlan('plan000010', { status: 'active', providerSubscriptionId: 'sub_10' });
    const st = fakeStripe({
      'GET /v1/subscriptions/sub_10': () => [200, { id: 'sub_10', status: 'active' }],
      'DELETE /v1/subscriptions/sub_10': () => [200, { id: 'sub_10', status: 'canceled' }],
    });
    expect(await cancel('c1', 'plan000010', st)).toEqual({ status: 'cancelled' });
    expect(st.calls.map(c => `${c.method} ${c.account}`)).toEqual(['GET acct_AAAAAAAA', 'DELETE acct_AAAAAAAA']);
    expect((await db.doc('subscriptions/plan000010').get()).data()).toMatchObject({ status: 'cancelled', cancelReason: 'cancelled_by_client' });
  });
  test('a pending plan whose checkout is still open: the checkout is closed', async () => {
    await seedPlan('plan000011', {});
    const st = fakeStripe({
      'GET /v1/checkout/sessions/cs_test_1': () => [200, { id: 'cs_test_1', status: 'open', subscription: null }],
      'POST /v1/checkout/sessions/cs_test_1/expire': () => [200, { status: 'expired' }],
    });
    await cancel('coachA', 'plan000011', st);
    expect(st.calls.map(c => c.path)).toContain('/v1/checkout/sessions/cs_test_1/expire');
    expect((await db.doc('subscriptions/plan000011').get()).data().cancelReason).toBe('cancelled_by_trainer');
  });
  test('Stripe refusing: the plan is NOT marked cancelled', async () => {
    await seedPlan('plan000012', { status: 'active', providerSubscriptionId: 'sub_12' });
    const st = fakeStripe({ 'GET /v1/subscriptions/sub_12': () => [500, { error: { type: 'api_error' } }] });
    await expect(cancel('c1', 'plan000012', st)).rejects.toMatchObject({ code: 'unavailable' });
    expect((await db.doc('subscriptions/plan000012').get()).data().status).toBe('active');
  });
  test('someone else’s plan: refused, Stripe never called', async () => {
    await seedPlan('plan000013', { status: 'active', providerSubscriptionId: 'sub_13' });
    const st = fakeStripe({});
    await expect(cancel('c2', 'plan000013', st)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(st.calls).toHaveLength(0);
  });
  test('deleting an account: GoCardless leaves Stripe plans to Stripe, and Stripe cancels them', async () => {
    await seedPlan('plan000014', { status: 'active', providerSubscriptionId: 'sub_14' });
    const gc = await gcSubs.cancelSubscriptionsFor({ db, uid: 'c1', field: 'clientId',
      readToken: async () => { throw new Error('GoCardless must not be asked about a Stripe plan'); },
      fetchImpl: async () => { throw new Error('no GoCardless call'); }, now: NOW, reason: 'account_deleted' });
    expect(gc).toEqual({ cancelled: [], failed: [] });
    const st = fakeStripe({
      'GET /v1/subscriptions/sub_14': () => [200, { id: 'sub_14', status: 'active' }],
      'DELETE /v1/subscriptions/sub_14': () => [200, { id: 'sub_14', status: 'canceled' }],
    });
    const res = await stripeSubs.cancelSubscriptionsFor({ db, uid: 'c1', field: 'clientId', keys: KEYS, fetchImpl: st.fetchImpl, now: NOW, reason: 'account_deleted' });
    expect(res.cancelled).toEqual(['plan000014']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('webhook events', () => {
  let n = 0;
  const event = (type, object, over = {}) => ({ id: `evt_test${String(++n).padStart(6, '0')}`, type, account: 'acct_AAAAAAAA', livemode: false, data: { object }, ...over });
  const run = (ev, st) => handleStripeWebhook({ db, event: ev, keys: KEYS, fetchImpl: st.fetchImpl, now: NOW, notify });
  const paidInvoice = (id, sub, extra = {}) => ({ id, status: 'paid', amount_paid: 56333,
    status_transitions: { paid_at: Date.UTC(2026, 9, 15) / 1000 },
    parent: { subscription_details: { subscription: sub, metadata: { subscription_id: 'plan000020' } } }, ...extra });
  const client = async () => (await db.doc('users/c1').get()).data();
  const ledger = async () => (await db.collection('creditLedger').get()).docs.map(d => d.id).sort();

  beforeEach(async () => { await seedPlan('plan000020', { status: 'active', providerSubscriptionId: 'sub_20' }); });

  test('invoice.paid: Stripe is asked again, the month is added once, the client told', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_1': () => [200, paidInvoice('in_1', 'sub_20')] });
    expect(await run(event('invoice.paid', { id: 'in_1' }), st)).toEqual({ outcome: 'granted' });
    expect(st.calls[0].account).toBe('acct_AAAAAAAA');
    expect((await client()).totalSessions).toBe(8);
    expect(await ledger()).toEqual(['subpay-in_1']);
    expect(notified.map(x => x.userId)).toEqual(['c1']);
    // The same delivery again, and a different event about the same invoice: still 8.
    const again = event('invoice.paid', { id: 'in_1' });
    await run(again, st);
    expect(await run(again, st)).toEqual({ outcome: 'duplicate' });
    expect((await client()).totalSessions).toBe(8);
  });
  test('the event says paid but Stripe says otherwise: nothing granted', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_2': () => [200, paidInvoice('in_2', 'sub_20', { status: 'open', amount_paid: 0 })] });
    expect(await run(event('invoice.paid', { id: 'in_2' }), st)).toEqual({ outcome: 'not_paid' });
    expect((await client()).totalSessions).toBe(0);
  });
  test('the first invoice arriving before the checkout was processed: plan activated, then granted', async () => {
    await seedPlan('plan000020', { status: 'pending', providerSubscriptionId: null, checkoutSessionId: 'cs_test_20' });
    const st = fakeStripe({
      'GET /v1/invoices/in_3': () => [200, paidInvoice('in_3', 'sub_20')],
      'GET /v1/checkout/sessions/cs_test_20': () => [200, { id: 'cs_test_20', status: 'complete', subscription: 'sub_20' }],
    });
    expect(await run(event('invoice.paid', { id: 'in_3' }), st)).toEqual({ outcome: 'granted' });
    expect((await db.doc('subscriptions/plan000020').get()).data().status).toBe('active');
  });
  test('tenant isolation: another coach’s account cannot touch this coach’s plan', async () => {
    await coachConn('coachB', 'acct_BBBBBBBB', { country: 'HK' });
    const st = fakeStripe({ 'GET /v1/invoices/in_4': () => [200, paidInvoice('in_4', 'sub_20')] });
    expect(await run(event('invoice.paid', { id: 'in_4' }, { account: 'acct_BBBBBBBB' }), st)).toEqual({ outcome: 'not_ours' });
    expect((await client()).totalSessions).toBe(0);
  });
  test('tenant isolation by plan id: another coach’s account naming this coach’s plan changes nothing', async () => {
    await coachConn('coachB', 'acct_BBBBBBBB', { country: 'HK' });
    await seedPlan('plan000022', { status: 'pending', providerSubscriptionId: null, checkoutSessionId: 'cs_test_22' });
    const st = fakeStripe({
      'GET /v1/invoices/in_9': () => [200, paidInvoice('in_9', 'sub_99', { parent: { subscription_details: { subscription: 'sub_99', metadata: { subscription_id: 'plan000022' } } } })],
      'GET /v1/checkout/sessions/cs_test_22': () => [200, { id: 'cs_test_22', status: 'complete', subscription: 'sub_99' }],
    });
    const fromB = { account: 'acct_BBBBBBBB' };
    expect(await run(event('checkout.session.completed', { id: 'cs_test_22', client_reference_id: 'plan000022' }, fromB), st)).toEqual({ outcome: 'not_ours' });
    expect(await run(event('invoice.paid', { id: 'in_9' }, fromB), st)).toEqual({ outcome: 'not_ours' });
    expect((await db.doc('subscriptions/plan000022').get()).data().status).toBe('pending');
    expect((await client()).totalSessions).toBe(0);
  });
  test('an unknown account, or a live event while ElitePro is in test mode: ignored without calling Stripe', async () => {
    const st = fakeStripe({});
    expect(await run(event('invoice.paid', { id: 'in_5' }, { account: 'acct_UNKNOWN1' }), st)).toEqual({ outcome: 'unknown_account' });
    expect(await run(event('invoice.paid', { id: 'in_5' }, { livemode: true }), st)).toEqual({ outcome: 'wrong_environment' });
    expect(st.calls).toHaveLength(0);
  });
  test('payment failed: past due, coach and client told; the next paid month puts it back', async () => {
    const st = fakeStripe({
      'GET /v1/invoices/in_6': () => [200, paidInvoice('in_6', 'sub_20', { status: 'open', amount_paid: 0 })],
      'GET /v1/invoices/in_7': () => [200, paidInvoice('in_7', 'sub_20')],
    });
    expect(await run(event('invoice.payment_failed', { id: 'in_6' }), st)).toEqual({ outcome: 'past_due' });
    expect((await db.doc('subscriptions/plan000020').get()).data()).toMatchObject({ status: 'past_due', lastPaymentStatus: 'failed' });
    expect(notified.map(x => x.userId).sort()).toEqual(['c1', 'coachA']);
    await run(event('invoice.paid', { id: 'in_7' }), st);
    expect((await db.doc('subscriptions/plan000020').get()).data().status).toBe('active');
  });
  test('subscription deleted at Stripe (confirmed by Stripe): plan cancelled', async () => {
    const st = fakeStripe({ 'GET /v1/subscriptions/sub_20': () => [200, { id: 'sub_20', status: 'canceled' }] });
    expect(await run(event('customer.subscription.deleted', { id: 'sub_20' }), st)).toEqual({ outcome: 'cancelled' });
    expect((await db.doc('subscriptions/plan000020').get()).data().status).toBe('cancelled');
  });
  test('a plan the client had already replaced was paid after all: Stripe subscription stopped at once', async () => {
    await seedPlan('plan000021', { status: 'abandoned', checkoutSessionId: 'cs_test_21' });
    const st = fakeStripe({
      'GET /v1/checkout/sessions/cs_test_21': () => [200, { id: 'cs_test_21', status: 'complete', subscription: 'sub_21' }],
      'GET /v1/subscriptions/sub_21': () => [200, { id: 'sub_21', status: 'active' }],
      'DELETE /v1/subscriptions/sub_21': () => [200, { id: 'sub_21', status: 'canceled' }],
    });
    expect(await run(event('checkout.session.completed', { id: 'cs_test_21', client_reference_id: 'plan000021' }), st))
      .toEqual({ outcome: 'superseded_cancelled' });
    expect(st.calls.map(c => c.method)).toContain('DELETE');
  });
  test('account.updated re-reads the coach’s account', async () => {
    const st = fakeStripe({ 'GET /v1/accounts/acct_AAAAAAAA': () => [200, { id: 'acct_AAAAAAAA', charges_enabled: false }] });
    expect(await run(event('account.updated', { id: 'acct_AAAAAAAA' }), st)).toEqual({ outcome: 'account:onboarding' });
  });
  test('Stripe unreachable: the event throws and is NOT recorded, so Stripe sends it again', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_8': () => [500, { error: { type: 'api_error' } }] });
    const ev = event('invoice.paid', { id: 'in_8' });
    await expect(run(ev, st)).rejects.toThrow();
    expect((await db.doc(`stripeEvents/${ev.id}`).get()).exists).toBe(false);
  });
});
