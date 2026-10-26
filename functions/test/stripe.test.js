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
const { saveStripeKeys, startConnect, refreshConnection, markDisconnected, trainerForAccount } = require('../stripeConnect');
const stripeSubs = require('../stripeSubscriptions');
const { handleStripeWebhook } = require('../stripeWebhooks');
const gcSubs = require('../gcSubscriptions');

const COLS = ['users', 'subscriptions', 'paymentConnections', 'creditLedger', 'schedule', 'stripeEvents'];
const LIVE_KEYS = { secretKey: 'sk_live_abcdefghijklmnop', webhookSecret: 'whsec_abcdefghijklmnop' };
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
    expect((await db.doc('users/coachA').get()).data().stripeEnvironment).toBeUndefined();
  });
  test('refresh: Stripe pausing a connected coach keeps their clients’ plan card (B52)', async () => {
    await db.doc('users/coachA').update({ stripeEnvironment: 'sandbox' });
    const st = fakeStripe({ 'GET /v1/accounts/acct_AAAAAAAA': () => [200, { id: 'acct_AAAAAAAA', charges_enabled: false, capabilities: {} }] });
    await refreshConnection({ db, trainerId: 'coachA', keys: KEYS, fetchImpl: st.fetchImpl, now: NOW });
    expect((await db.doc('users/coachA').get()).data().stripeEnvironment).toBe('sandbox');
  });
  test('refresh: an account made in test mode, once ElitePro is live, stops offering plans (B52)', async () => {
    await db.doc('users/coachA').update({ stripeEnvironment: 'sandbox' });
    const st = fakeStripe({});
    expect(await refreshConnection({ db, trainerId: 'coachA', keys: LIVE_KEYS, fetchImpl: st.fetchImpl, now: NOW })).toEqual({ status: 'none' });
    expect((await db.doc('users/coachA').get()).data().stripeEnvironment).toBeNull();
  });
  test('refresh: a deleted account is not brought back, a client gets nothing (B52)', async () => {
    await db.doc('users/coachA').delete();
    const st = fakeStripe({ 'GET /v1/accounts/acct_AAAAAAAA': () => [200, { id: 'acct_AAAAAAAA', charges_enabled: true, capabilities: {} }] });
    expect(await refreshConnection({ db, trainerId: 'coachA', keys: KEYS, fetchImpl: st.fetchImpl, now: NOW })).toEqual({ status: 'none' });
    expect((await db.doc('users/coachA').get()).exists).toBe(false);
    expect(await refreshConnection({ db, trainerId: 'c1', keys: KEYS, fetchImpl: st.fetchImpl, now: NOW })).toEqual({ status: 'none' });
    expect(st.calls).toHaveLength(0);
  });
  test('disconnected from the coach’s side: no plans, no plan card, and a refresh does not undo it', async () => {
    await db.doc('users/coachA').update({ stripeEnvironment: 'sandbox' });
    await markDisconnected({ db, trainerId: 'coachA', now: NOW });
    expect((await db.doc('paymentConnections/coachA').get()).data().stripe).toMatchObject({ status: 'disconnected', accountId: 'acct_AAAAAAAA' });
    expect((await db.doc('users/coachA').get()).data().stripeEnvironment).toBeNull();
    const st = fakeStripe({});
    expect(await refreshConnection({ db, trainerId: 'coachA', keys: KEYS, fetchImpl: st.fetchImpl, now: NOW })).toEqual({ status: 'disconnected' });
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'failed-precondition' });
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
  test('B79: a coach whose currency is not their Stripe country\'s is refused, nothing sent to Stripe', async () => {
    await db.doc('users/coachA').update({ currency: 'HKD' }); // UK account
    const st = fakeStripe(checkoutRoutes());
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'failed-precondition' });
    await coachConn('coachB', 'acct_BBBBBBBB', { country: 'HK', bacsEnabled: false });
    await db.doc('users/coachB').update({ currency: 'GBP' }); // Hong Kong account
    await expect(startPlan('c2', 4, st)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(st.calls).toHaveLength(0);
    expect(await plans('c1')).toEqual([]);
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
  const oldPending = (fields = {}) => db.doc('subscriptions/oldplan001').set({ id: 'oldplan001', clientId: 'c1', trainerId: 'coachA',
    status: 'pending', provider: 'stripe', environment: 'sandbox', providerAccountId: 'acct_AAAAAAAA', checkoutSessionId: 'cs_test_OLD',
    tier: 4, createdAt: '2026-10-15T08:00:00.000Z', updatedAt: '2026-10-15T08:00:00.000Z', ...fields });
  test('an earlier unfinished Stripe checkout is closed at Stripe and marked abandoned', async () => {
    await oldPending();
    const st = fakeStripe(checkoutRoutes({
      'GET /v1/checkout/sessions/cs_test_OLD': () => [200, { id: 'cs_test_OLD', status: 'open' }],
      'POST /v1/checkout/sessions/cs_test_OLD/expire': () => [200, { id: 'cs_test_OLD', status: 'expired' }],
    }));
    await startPlan('c1', 4, st);
    expect(st.calls.map(c => c.path)).toContain('/v1/checkout/sessions/cs_test_OLD/expire');
    expect((await db.doc('subscriptions/oldplan001').get()).data().status).toBe('abandoned');
  });
  test('the earlier checkout was paid after all: that plan is activated, no second one opened (B52)', async () => {
    await oldPending();
    const st = fakeStripe(checkoutRoutes({
      'GET /v1/checkout/sessions/cs_test_OLD': () => [200, { id: 'cs_test_OLD', status: 'complete', subscription: 'sub_OLD', customer: 'cus_OLD' }],
    }));
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'already-exists' });
    expect(st.calls.map(c => `${c.method} ${c.path}`)).not.toContain('POST /v1/checkout/sessions');
    expect(await plans('c1')).toEqual([expect.objectContaining({ id: 'oldplan001', status: 'active', providerSubscriptionId: 'sub_OLD' })]);
  });
  test('the earlier checkout cannot be closed: no second one opened, so the client cannot pay twice (B52)', async () => {
    await oldPending();
    const st = fakeStripe(checkoutRoutes({
      'GET /v1/checkout/sessions/cs_test_OLD': () => [200, { id: 'cs_test_OLD', status: 'open' }],
      'POST /v1/checkout/sessions/cs_test_OLD/expire': () => [500, { error: { type: 'api_error' } }],
    }));
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'unavailable' });
    expect(await plans('c1')).toEqual([expect.objectContaining({ id: 'oldplan001', status: 'pending' })]);
  });
  test('a double tap: the first checkout is still being made, so the second is refused (B52)', async () => {
    await oldPending({ checkoutSessionId: null, createdAt: '2026-10-15T08:59:30.000Z' });
    const st = fakeStripe(checkoutRoutes());
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'already-exists' });
    expect(st.calls).toHaveLength(0);
  });
  test('ElitePro gone live: a test-mode plan left over does not block a real one, and is retired (B52)', async () => {
    await oldPending({ status: 'active', providerSubscriptionId: 'sub_TEST' });
    await coachConn('coachA', 'acct_LIVEAAAA', { environment: 'live' });
    const st = fakeStripe(checkoutRoutes());
    const res = await startPlan('c1', 4, st, { keys: LIVE_KEYS });
    expect((await db.doc('subscriptions/oldplan001').get()).data()).toMatchObject({ status: 'abandoned', cancelReason: 'sandbox_retired' });
    expect((await db.doc(`subscriptions/${res.subscriptionId}`).get()).data()).toMatchObject({ status: 'pending', environment: 'live' });
  });
  test('Bacs only for a UK account in pounds (B52) — and since B79 a UK account cannot price in euros at all', async () => {
    await db.doc('users/coachA').update({ currency: 'EUR' });
    const st = fakeStripe(checkoutRoutes());
    await expect(startPlan('c1', 4, st)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(st.calls).toHaveLength(0);
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
  test('with the other mode’s key: left pending, Stripe not asked (B52)', async () => {
    await seedPlan('plan000005', { environment: 'sandbox' });
    const st = fakeStripe({});
    expect(await stripeSubs.completeSubscription({ db, subscriptionId: 'plan000005', keys: LIVE_KEYS, fetchImpl: st.fetchImpl, now: NOW }))
      .toEqual({ status: 'pending' });
    expect(st.calls).toHaveLength(0);
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
  test('with the other mode’s key every object is "not found" — never read as already cancelled (B52)', async () => {
    await seedPlan('plan000015', { status: 'active', environment: 'sandbox', providerSubscriptionId: 'sub_15' });
    // What the live key really answers about a test-mode subscription.
    const st = fakeStripe({ 'GET /v1/subscriptions/sub_15': () => [404, { error: { code: 'resource_missing' } }] });
    await expect(stripeSubs.cancelSubscription({ db, uid: 'c1', subscriptionId: 'plan000015', keys: LIVE_KEYS, fetchImpl: st.fetchImpl, now: NOW }))
      .rejects.toMatchObject({ code: 'unavailable' });
    expect((await db.doc('subscriptions/plan000015').get()).data().status).toBe('active');
  });
  test('a client leaving their coach: only the plan with that coach is stopped (B52)', async () => {
    await seedPlan('plan000016', { status: 'active', providerSubscriptionId: 'sub_16' });
    await seedPlan('plan000017', { status: 'active', providerSubscriptionId: 'sub_17', trainerId: 'coachB' });
    const st = fakeStripe({
      'GET /v1/subscriptions/sub_16': () => [200, { id: 'sub_16', status: 'active' }],
      'DELETE /v1/subscriptions/sub_16': () => [200, { id: 'sub_16', status: 'canceled' }],
      // Reachable, so only the rule — not a failed call — can keep the other plan running.
      'GET /v1/subscriptions/sub_17': () => [200, { id: 'sub_17', status: 'active' }],
      'DELETE /v1/subscriptions/sub_17': () => [200, { id: 'sub_17', status: 'canceled' }],
    });
    const res = await stripeSubs.cancelSubscriptionsFor({ db, uid: 'c1', field: 'clientId', keys: KEYS, fetchImpl: st.fetchImpl,
      now: NOW, reason: 'client_left', onlyTrainerId: 'coachA' });
    expect(res).toEqual({ cancelled: ['plan000016'], failed: [] });
    expect((await db.doc('subscriptions/plan000017').get()).data().status).toBe('active');
    expect(st.calls.map(c => c.path)).not.toContain('/v1/subscriptions/sub_17');
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
  const OCT15 = Date.UTC(2026, 9, 15) / 1000;
  const paidInvoice = (id, sub, extra = {}) => ({ id, status: 'paid', amount_paid: 56333, billing_reason: 'subscription_cycle',
    status_transitions: { paid_at: OCT15 },
    lines: { data: [{ period: { start: OCT15, end: OCT15 + 31 * 86400 } }] },
    parent: { subscription_details: { subscription: sub, metadata: { subscription_id: 'plan000020' } } }, ...extra });
  // Stripe's own subscription object — where a not-yet-linked plan is found (never the event's word).
  const stripeSub = (id, planId = 'plan000020', extra = {}) => [200, { id, status: 'active', customer: 'cus_20', metadata: { subscription_id: planId }, ...extra }];
  const client = async () => (await db.doc('users/c1').get()).data();
  const plan = async (id = 'plan000020') => (await db.doc(`subscriptions/${id}`).get()).data();
  const ledger = async () => (await db.collection('creditLedger').get()).docs.map(d => d.id).sort();

  beforeEach(async () => { await seedPlan('plan000020', { status: 'active', providerSubscriptionId: 'sub_20', providerCustomerId: 'cus_20' }); });

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
  test('a month paid with a 100% discount is still a month (B52)', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_10': () => [200, paidInvoice('in_10', 'sub_20', { amount_paid: 0, billing_reason: 'subscription_create' })] });
    expect(await run(event('invoice.paid', { id: 'in_10' }), st)).toEqual({ outcome: 'granted' });
    expect((await client()).totalSessions).toBe(8);
  });
  test('a paid invoice that is not the monthly charge: no sessions, the coach asked to look (B52)', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_11': () => [200, paidInvoice('in_11', 'sub_20', { billing_reason: 'manual' })] });
    expect(await run(event('invoice.paid', { id: 'in_11' }), st)).toEqual({ outcome: 'needs_review' });
    expect((await client()).totalSessions).toBe(0);
    expect(notified).toEqual([expect.objectContaining({ userId: 'coachA', title: 'A payment needs a look' })]);
  });
  test('the month starts on the coach’s own date, from the line’s period — not the invoice’s or UTC’s (B52)', async () => {
    await db.doc('users/coachA').update({ timeZone: 'Asia/Hong_Kong' });
    const start = Date.UTC(2026, 9, 31, 17, 0) / 1000; // 1 Nov 01:00 in Hong Kong, still 31 Oct in UTC
    const st = fakeStripe({ 'GET /v1/invoices/in_12': () => [200, paidInvoice('in_12', 'sub_20', {
      period_start: start - 31 * 86400, lines: { data: [{ period: { start, end: start + 30 * 86400 } }] } })] });
    await run(event('invoice.paid', { id: 'in_12' }), st);
    expect((await plan()).currentPeriodStart).toBe('2026-11-01');
    expect((await db.doc('creditLedger/subpay-in_12').get()).data().date).toBe('2026-11-01');
  });
  test('a late payment for an earlier month: granted, but the period never moves backwards (B52)', async () => {
    await seedPlan('plan000020', { status: 'active', providerSubscriptionId: 'sub_20', currentPeriodStart: '2026-11-15', currentPeriodEnd: '2026-12-14' });
    const st = fakeStripe({ 'GET /v1/invoices/in_13': () => [200, paidInvoice('in_13', 'sub_20')] });
    expect(await run(event('invoice.paid', { id: 'in_13' }), st)).toEqual({ outcome: 'granted' });
    expect(await plan()).toMatchObject({ currentPeriodStart: '2026-11-15', currentPeriodEnd: '2026-12-14' });
  });
  test('the client has since left this coach: no sessions land in their new balance, the old coach told (B52)', async () => {
    await db.doc('users/c1').update({ trainerId: 'coachB' });
    const st = fakeStripe({ 'GET /v1/invoices/in_14': () => [200, paidInvoice('in_14', 'sub_20')] });
    expect(await run(event('invoice.paid', { id: 'in_14' }), st)).toEqual({ outcome: 'client_moved' });
    expect((await client()).totalSessions).toBe(0);
    expect(notified).toEqual([expect.objectContaining({ userId: 'coachA', title: 'Payment from a former client' })]);
  });
  test('the first invoice arriving before the checkout was processed: plan linked through Stripe’s own record, then granted', async () => {
    await seedPlan('plan000020', { status: 'pending', providerSubscriptionId: null, checkoutSessionId: 'cs_test_20' });
    const st = fakeStripe({
      'GET /v1/invoices/in_3': () => [200, paidInvoice('in_3', 'sub_20')],
      'GET /v1/subscriptions/sub_20': () => stripeSub('sub_20'),
    });
    expect(await run(event('invoice.paid', { id: 'in_3' }), st)).toEqual({ outcome: 'granted' });
    expect(await plan()).toMatchObject({ status: 'active', providerSubscriptionId: 'sub_20', providerCustomerId: 'cus_20' });
    expect((await client()).totalSessions).toBe(8);
  });
  test('…even while the return page holds the plan’s claim — the paid month is not lost (B52)', async () => {
    await seedPlan('plan000020', { status: 'completing', providerSubscriptionId: null, checkoutSessionId: 'cs_test_20' });
    const st = fakeStripe({
      'GET /v1/invoices/in_15': () => [200, paidInvoice('in_15', 'sub_20')],
      'GET /v1/subscriptions/sub_20': () => stripeSub('sub_20'),
    });
    expect(await run(event('invoice.paid', { id: 'in_15' }), st)).toEqual({ outcome: 'granted' });
    expect((await client()).totalSessions).toBe(8);
  });
  test('a plan already stopped was paid anyway: the sessions are the client’s, the coach told (B52)', async () => {
    await seedPlan('plan000020', { status: 'abandoned', providerSubscriptionId: null });
    const st = fakeStripe({
      'GET /v1/invoices/in_16': () => [200, paidInvoice('in_16', 'sub_20')],
      'GET /v1/subscriptions/sub_20': () => stripeSub('sub_20'),
    });
    expect(await run(event('invoice.paid', { id: 'in_16' }), st)).toEqual({ outcome: 'granted' });
    expect(await plan()).toMatchObject({ status: 'abandoned', providerSubscriptionId: 'sub_20' });
    expect((await client()).totalSessions).toBe(8);
    expect(notified.map(x => x.title)).toEqual(['Sessions added', 'Payment for a stopped plan']);
  });
  test('Stripe’s subscription names a different plan than the invoice: nothing (B52)', async () => {
    await seedPlan('plan000020', { status: 'pending', providerSubscriptionId: null });
    const st = fakeStripe({
      'GET /v1/invoices/in_17': () => [200, paidInvoice('in_17', 'sub_20')],
      'GET /v1/subscriptions/sub_20': () => stripeSub('sub_20', 'plan000099'),
    });
    expect(await run(event('invoice.paid', { id: 'in_17' }), st)).toEqual({ outcome: 'not_ours' });
    expect((await plan()).status).toBe('pending');
  });
  test('a plan already linked to another Stripe subscription is never re-linked to this one (B52)', async () => {
    await seedPlan('plan000020', { status: 'active', providerSubscriptionId: 'sub_OTHER' });
    const st = fakeStripe({
      'GET /v1/invoices/in_23': () => [200, paidInvoice('in_23', 'sub_20')],
      'GET /v1/subscriptions/sub_20': () => stripeSub('sub_20'),
    });
    expect(await run(event('invoice.paid', { id: 'in_23' }), st)).toEqual({ outcome: 'not_ours' });
    expect((await plan()).providerSubscriptionId).toBe('sub_OTHER');
    expect((await client()).totalSessions).toBe(0);
  });
  test('tenant isolation: another coach’s account cannot touch this coach’s plan', async () => {
    await coachConn('coachB', 'acct_BBBBBBBB', { country: 'HK' });
    const st = fakeStripe({
      'GET /v1/invoices/in_4': () => [200, paidInvoice('in_4', 'sub_20')],
      'GET /v1/subscriptions/sub_20': () => stripeSub('sub_20'),
    });
    expect(await run(event('invoice.paid', { id: 'in_4' }, { account: 'acct_BBBBBBBB' }), st)).toEqual({ outcome: 'not_ours' });
    expect((await client()).totalSessions).toBe(0);
  });
  test('tenant isolation by plan id: another coach’s account naming this coach’s plan changes nothing', async () => {
    await coachConn('coachB', 'acct_BBBBBBBB', { country: 'HK' });
    await seedPlan('plan000022', { status: 'pending', providerSubscriptionId: null, checkoutSessionId: 'cs_test_22' });
    const st = fakeStripe({
      'GET /v1/invoices/in_9': () => [200, paidInvoice('in_9', 'sub_99', { parent: { subscription_details: { subscription: 'sub_99', metadata: { subscription_id: 'plan000022' } } } })],
      'GET /v1/subscriptions/sub_99': () => stripeSub('sub_99', 'plan000022'),
      'GET /v1/checkout/sessions/cs_test_22': () => [200, { id: 'cs_test_22', status: 'complete', subscription: 'sub_99' }],
    });
    const fromB = { account: 'acct_BBBBBBBB' };
    expect(await run(event('checkout.session.completed', { id: 'cs_test_22', client_reference_id: 'plan000022' }, fromB), st)).toEqual({ outcome: 'not_ours' });
    expect(await run(event('invoice.paid', { id: 'in_9' }, fromB), st)).toEqual({ outcome: 'not_ours' });
    expect((await plan('plan000022')).status).toBe('pending');
    expect((await client()).totalSessions).toBe(0);
  });
  test('an unknown account: ignored without calling Stripe', async () => {
    const st = fakeStripe({});
    expect(await run(event('invoice.paid', { id: 'in_5' }, { account: 'acct_UNKNOWN1' }), st)).toEqual({ outcome: 'unknown_account' });
    expect(st.calls).toHaveLength(0);
  });
  test('a live event while the stored key is a test key: sent back for retry, not recorded as handled (B52)', async () => {
    const st = fakeStripe({});
    const ev = event('invoice.paid', { id: 'in_5' }, { livemode: true });
    await expect(run(ev, st)).rejects.toThrow();
    expect(st.calls).toHaveLength(0);
    expect((await db.doc(`stripeEvents/${ev.id}`).get()).exists).toBe(false);
  });
  test('payment failed: past due, coach and client told; the next paid month puts it back', async () => {
    const st = fakeStripe({
      'GET /v1/invoices/in_6': () => [200, paidInvoice('in_6', 'sub_20', { status: 'open', amount_paid: 0 })],
      'GET /v1/invoices/in_7': () => [200, paidInvoice('in_7', 'sub_20')],
    });
    expect(await run(event('invoice.payment_failed', { id: 'in_6' }), st)).toEqual({ outcome: 'past_due' });
    expect(await plan()).toMatchObject({ status: 'past_due', lastPaymentStatus: 'failed' });
    expect(notified.map(x => x.userId).sort()).toEqual(['c1', 'coachA']);
    await run(event('invoice.paid', { id: 'in_7' }), st);
    expect((await plan()).status).toBe('active');
  });
  test('a failure event for an invoice since voided or written off changes nothing (B52)', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_18': () => [200, paidInvoice('in_18', 'sub_20', { status: 'void', amount_paid: 0 })] });
    expect(await run(event('invoice.payment_failed', { id: 'in_18' }), st)).toEqual({ outcome: 'not_open' });
    expect((await plan()).status).toBe('active');
    expect(notified).toEqual([]);
  });
  test('the first payment failing before the checkout was processed still reaches the plan (B52)', async () => {
    await seedPlan('plan000020', { status: 'pending', providerSubscriptionId: null });
    const st = fakeStripe({
      'GET /v1/invoices/in_19': () => [200, paidInvoice('in_19', 'sub_20', { status: 'open', amount_paid: 0, billing_reason: 'subscription_create' })],
      'GET /v1/subscriptions/sub_20': () => stripeSub('sub_20', 'plan000020', { status: 'incomplete' }),
    });
    expect(await run(event('invoice.payment_failed', { id: 'in_19' }), st)).toEqual({ outcome: 'past_due' });
    expect(await plan()).toMatchObject({ status: 'past_due', providerSubscriptionId: 'sub_20' });
  });
  test('the same failure delivered twice at once: one claim, one pair of messages (B52)', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_20': () => [200, paidInvoice('in_20', 'sub_20', { status: 'open', amount_paid: 0 })] });
    const ev = event('invoice.payment_failed', { id: 'in_20' });
    const results = await Promise.allSettled([run(ev, st), run(ev, st), run(ev, st)]);
    expect(results.filter(r => r.status === 'fulfilled' && r.value.outcome === 'past_due')).toHaveLength(1);
    expect(notified).toHaveLength(2);
    // The one that went through is recorded; a later redelivery is a duplicate.
    expect(await run(ev, st)).toEqual({ outcome: 'duplicate' });
  });
  test('a delivery arriving while another is mid-way: sent back for retry, does nothing itself (B52)', async () => {
    const ev = event('invoice.payment_failed', { id: 'in_24' });
    await db.doc(`stripeEvents/${ev.id}`).set({ outcome: 'processing', claimedAt: '2026-10-15T08:59:30.000Z' });
    const st = fakeStripe({ 'GET /v1/invoices/in_24': () => [200, paidInvoice('in_24', 'sub_20', { status: 'open', amount_paid: 0 })] });
    await expect(run(ev, st)).rejects.toThrow();
    expect(st.calls).toHaveLength(0);
    expect((await plan()).status).toBe('active');
  });
  test('a claim left by a crashed delivery expires, so the event is not stuck (B52)', async () => {
    const ev = event('invoice.payment_failed', { id: 'in_21' });
    await db.doc(`stripeEvents/${ev.id}`).set({ outcome: 'processing', claimedAt: '2026-10-15T08:50:00.000Z' });
    const st = fakeStripe({ 'GET /v1/invoices/in_21': () => [200, paidInvoice('in_21', 'sub_20', { status: 'open', amount_paid: 0 })] });
    expect(await run(ev, st)).toEqual({ outcome: 'past_due' });
  });
  test('subscription deleted at Stripe (confirmed by Stripe): plan cancelled', async () => {
    const st = fakeStripe({ 'GET /v1/subscriptions/sub_20': () => [200, { id: 'sub_20', status: 'canceled' }] });
    expect(await run(event('customer.subscription.deleted', { id: 'sub_20' }), st)).toEqual({ outcome: 'cancelled' });
    expect((await plan()).status).toBe('cancelled');
  });
  test('subscription updated at Stripe: retries exhausted → past due; first payment never made → cancelled; otherwise nothing (B52)', async () => {
    let status = 'unpaid';
    const st = fakeStripe({ 'GET /v1/subscriptions/sub_20': () => [200, { id: 'sub_20', status }] });
    expect(await run(event('customer.subscription.updated', { id: 'sub_20' }), st)).toEqual({ outcome: 'past_due' });
    expect((await plan()).status).toBe('past_due');
    status = 'active';
    expect(await run(event('customer.subscription.updated', { id: 'sub_20' }), st)).toEqual({ outcome: 'unchanged' });
    status = 'incomplete_expired';
    expect(await run(event('customer.subscription.updated', { id: 'sub_20' }), st)).toEqual({ outcome: 'cancelled' });
    expect((await plan()).status).toBe('cancelled');
  });
  test('a client disputes a payment with their bank: plan past due, coach told (B52)', async () => {
    const st = fakeStripe({
      'GET /v1/disputes/dp_1': () => [200, { id: 'dp_1', charge: 'ch_1' }],
      'GET /v1/charges/ch_1': () => [200, { id: 'ch_1', customer: 'cus_20' }],
    });
    expect(await run(event('charge.dispute.created', { id: 'dp_1' }), st)).toEqual({ outcome: 'disputed' });
    expect(await plan()).toMatchObject({ status: 'past_due', lastError: 'charge.dispute.created' });
    expect(notified).toEqual([expect.objectContaining({ userId: 'coachA', title: 'A client disputed a payment' })]);
  });
  test('a dispute on a charge that is not a plan of ours: nothing (B52)', async () => {
    const st = fakeStripe({
      'GET /v1/disputes/dp_2': () => [200, { id: 'dp_2', charge: 'ch_2' }],
      'GET /v1/charges/ch_2': () => [200, { id: 'ch_2', customer: 'cus_SOMEONEELSE' }],
    });
    expect(await run(event('charge.dispute.created', { id: 'dp_2' }), st)).toEqual({ outcome: 'not_ours' });
    expect((await plan()).status).toBe('active');
  });
  // Ani 2026-10-24: a refund tells the coach and moves nothing — sessions stay, the plan runs on.
  test('the coach refunds a client: coach told the amount and whom; sessions and plan untouched (Grok review)', async () => {
    await db.doc('users/c1').update({ name: 'Amy', totalSessions: 8, sessionOffset: 2 });
    const st = fakeStripe({ 'GET /v1/charges/ch_3': () => [200, { id: 'ch_3', customer: 'cus_20', amount_refunded: 4000, refunded: false, currency: 'gbp' }] });
    expect(await run(event('charge.refunded', { id: 'ch_3' }), st)).toEqual({ outcome: 'refunded' });
    expect(notified).toEqual([expect.objectContaining({ userId: 'coachA', title: 'Refund sent' })]);
    expect(notified[0].body).toMatch(/^£40\.00 refunded to Amy\. /);
    expect(notified[0].body).not.toContain('whole payment');
    expect(await client()).toMatchObject({ totalSessions: 8, sessionOffset: 2 });
    expect((await plan()).status).toBe('active');
    expect(await ledger()).toEqual([]);
  });
  test('a whole payment refunded says so', async () => {
    const st = fakeStripe({ 'GET /v1/charges/ch_4': () => [200, { id: 'ch_4', customer: 'cus_20', amount_refunded: 56333, refunded: true, currency: 'gbp' }] });
    expect(await run(event('charge.refunded', { id: 'ch_4' }), st)).toEqual({ outcome: 'refunded' });
    expect(notified[0].body).toMatch(/^£563\.33 refunded to your client \(the whole payment\)\. /);
  });
  test('Stripe says nothing was refunded, or the charge is not a plan of ours: nobody told', async () => {
    const st = fakeStripe({
      'GET /v1/charges/ch_5': () => [200, { id: 'ch_5', customer: 'cus_20', amount_refunded: 0, refunded: false, currency: 'gbp' }],
      'GET /v1/charges/ch_6': () => [200, { id: 'ch_6', customer: 'cus_SOMEONEELSE', amount_refunded: 1000, refunded: false, currency: 'gbp' }],
    });
    expect(await run(event('charge.refunded', { id: 'ch_5' }), st)).toEqual({ outcome: 'not_refunded' });
    expect(await run(event('charge.refunded', { id: 'ch_6' }), st)).toEqual({ outcome: 'not_ours' });
    expect(notified).toEqual([]);
  });
  // The coach's key card lists the events to tick in Stripe; one handled here but missing
  // there would never be sent, and its handler would never run.
  test('every event handled here is on the list the coach is shown', () => {
    const fs = require('fs');
    const path = require('path');
    const handled = [...fs.readFileSync(path.join(__dirname, '../stripeWebhooks.js'), 'utf8').matchAll(/^\s+case '([a-z._]+)':/gm)].map(m => m[1]);
    const card = fs.readFileSync(path.join(__dirname, '../../src/components/StripeKeysCard.jsx'), 'utf8');
    const listed = [...card.match(/const STRIPE_EVENTS = \[([^\]]+)\]/)[1].matchAll(/'([a-z._]+)'/g)].map(m => m[1]);
    expect(handled).toContain('charge.refunded');
    expect(listed.sort()).toEqual(handled.sort());
  });
  test('the coach disconnects ElitePro in their Stripe dashboard: marked disconnected (B52)', async () => {
    await db.doc('users/coachA').update({ stripeEnvironment: 'sandbox' });
    const st = fakeStripe({});
    expect(await run(event('account.application.deauthorized', { id: 'ca_platform' }), st)).toEqual({ outcome: 'disconnected' });
    expect((await db.doc('paymentConnections/coachA').get()).data().stripe.status).toBe('disconnected');
    expect((await db.doc('users/coachA').get()).data().stripeEnvironment).toBeNull();
    // The running plan (plan000020, beforeEach) can no longer be reached: marked ended, and
    // the coach is told to cancel it in Stripe, the client that it stopped (audit 2026-10-23).
    expect(await plan()).toMatchObject({ status: 'cancelled', cancelReason: 'coach_disconnected' });
    expect(notified.map(x => x.userId).sort()).toEqual(['c1', 'coachA']);
    expect(notified.find(x => x.userId === 'coachA').body).toMatch(/^1 monthly plan/);
  });
  test('an object since deleted at Stripe: recorded as gone, not retried for days (B52)', async () => {
    const st = fakeStripe({ 'GET /v1/invoices/in_22': () => [404, { error: { type: 'invalid_request_error', code: 'resource_missing' } }] });
    const ev = event('invoice.paid', { id: 'in_22' });
    expect(await run(ev, st)).toEqual({ outcome: 'gone' });
    expect((await db.doc(`stripeEvents/${ev.id}`).get()).data().outcome).toBe('gone');
  });
  test('a plan the client had already replaced was paid after all: Stripe subscription stopped at once, and linked', async () => {
    await seedPlan('plan000021', { status: 'abandoned', checkoutSessionId: 'cs_test_21' });
    const st = fakeStripe({
      'GET /v1/checkout/sessions/cs_test_21': () => [200, { id: 'cs_test_21', status: 'complete', subscription: 'sub_21', customer: 'cus_21' }],
      'GET /v1/subscriptions/sub_21': () => [200, { id: 'sub_21', status: 'active' }],
      'DELETE /v1/subscriptions/sub_21': () => [200, { id: 'sub_21', status: 'canceled' }],
    });
    expect(await run(event('checkout.session.completed', { id: 'cs_test_21', client_reference_id: 'plan000021' }), st))
      .toEqual({ outcome: 'superseded_cancelled' });
    expect(st.calls.map(c => c.method)).toContain('DELETE');
    // Its first invoice, already paid, must still find this plan (B52).
    expect(await plan('plan000021')).toMatchObject({ status: 'abandoned', providerSubscriptionId: 'sub_21' });
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
