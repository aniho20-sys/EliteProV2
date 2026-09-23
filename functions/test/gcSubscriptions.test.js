/* global describe, test, expect, beforeEach */
const {
  monthlyAmountPence, startSubscription, completeSubscription, conflictingResourceId,
} = require('../gcSubscriptions');

// ── A small in-memory Firestore: just the calls gcSubscriptions makes. ──
function fakeDb(seed = {}) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, { ...v }]));
  let auto = 0;
  const docRef = (path) => ({
    id: path.split('/').pop(),
    path,
    get: async () => ({ exists: store.has(path), data: () => ({ ...store.get(path) }) }),
    set: async (v) => { store.set(path, { ...v }); },
    update: async (v) => { store.set(path, { ...store.get(path), ...v }); },
  });
  return {
    store,
    doc: docRef,
    collection: (name) => ({
      doc: () => docRef(`${name}/SUBAUTO${String(++auto).padStart(6, '0')}`),
      where: (field, op, value) => ({
        get: async () => ({
          docs: [...store.entries()]
            .filter(([k, v]) => k.startsWith(`${name}/`) && v[field] === value)
            .map(([k, v]) => ({ ref: docRef(k), data: () => ({ ...v }) })),
        }),
      }),
    }),
    runTransaction: async (fn) => fn({
      get: (ref) => ref.get(),
      update: (ref, v) => { store.set(ref.path, { ...store.get(ref.path), ...v }); },
    }),
  };
}

// ── A fake GoCardless: records every call, answers from a script. ──
function fakeGc(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = url.replace('https://api-sandbox.gocardless.com', '');
    calls.push({ method: init.method, path, headers: init.headers, body: init.body && JSON.parse(init.body) });
    const handler = routes[`${init.method} ${path}`];
    if (!handler) throw new Error(`unexpected GoCardless call: ${init.method} ${path}`);
    const [status, body] = handler(calls[calls.length - 1]);
    return { ok: status < 300, status, text: async () => JSON.stringify(body) };
  };
  return { calls, fetchImpl };
}

const NOW = new Date('2026-09-23T12:00:00Z');
const seed = () => ({
  'users/c1': { role: 'client', trainerId: 't1', name: 'Chan Tai Man', email: 'c1@example.test', subscriptionTester: true },
  'users/t1': { role: 'trainer', subscriptionRate: 65, currency: 'GBP' },
  'paymentConnections/t1': { status: 'connected' },
});
const baseDeps = (db, gc, extra = {}) => ({
  db,
  readToken: async () => 'tok-t1',
  fetchImpl: gc.fetchImpl,
  now: () => NOW,
  returnUrl: (id) => `https://example.test/return?sub=${id}`,
  exitUrl: 'https://example.test/exit',
  ...extra,
});
const happyStartRoutes = () => ({
  'POST /billing_requests': () => [201, { billing_requests: { id: 'BRQ1' } }],
  'POST /billing_request_flows': () => [201, { billing_request_flows: { authorisation_url: 'https://pay-sandbox.gocardless.com/flow/X' } }],
});

describe('monthlyAmountPence — the design table, to the penny', () => {
  test('£65 → £281.67 / £563.33 / £845.00', () => {
    expect(monthlyAmountPence(65, 4)).toBe(28167);
    expect(monthlyAmountPence(65, 8)).toBe(56333);
    expect(monthlyAmountPence(65, 12)).toBe(84500);
  });
  test('a rate with pence does not drift through float maths', () => {
    expect(monthlyAmountPence(62.5, 4)).toBe(27083);
  });
  test('unknown tier or missing rate is refused', () => {
    expect(() => monthlyAmountPence(65, 5)).toThrow('Unknown plan');
    expect(() => monthlyAmountPence(undefined, 4)).toThrow('no subscription rate');
    expect(() => monthlyAmountPence(0, 4)).toThrow('no subscription rate');
  });
});

describe('startSubscription', () => {
  let db, gc;
  beforeEach(() => { db = fakeDb(seed()); gc = fakeGc(happyStartRoutes()); });

  test('happy path: pending doc, mandate-only Bacs request in the trainer account, hosted URL back', async () => {
    const out = await startSubscription({ ...baseDeps(db, gc), uid: 'c1', tier: 8 });
    expect(out.url).toBe('https://pay-sandbox.gocardless.com/flow/X');
    const sub = db.store.get(`subscriptions/${out.subscriptionId}`);
    expect(sub).toMatchObject({
      clientId: 'c1', trainerId: 't1', tier: 8, ratePerSession: 65, monthlyAmount: 563.33,
      status: 'pending', billingRequestId: 'BRQ1',
    });
    const [br, flow] = gc.calls;
    expect(br.headers.Authorization).toBe('Bearer tok-t1');
    expect(br.headers['GoCardless-Version']).toBe('2015-07-06');
    expect(br.body.billing_requests.mandate_request).toMatchObject({ scheme: 'bacs', currency: 'GBP' });
    expect(br.body.billing_requests.payment_request).toBeUndefined();
    expect(flow.body.billing_request_flows.links.billing_request).toBe('BRQ1');
    expect(flow.body.billing_request_flows.redirect_uri).toBe(`https://example.test/return?sub=${out.subscriptionId}`);
  });

  // GUARDIAN: the price is the server's, never the caller's.
  test('GUARDIAN: a tier outside 4/8/12 is refused before anything is written', async () => {
    await expect(startSubscription({ ...baseDeps(db, gc), uid: 'c1', tier: 1 })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect([...db.store.keys()].some((k) => k.startsWith('subscriptions/'))).toBe(false);
    expect(gc.calls).toEqual([]);
  });

  test.each([
    ['a trainer', { 'users/c1': { role: 'trainer' } }, 'permission-denied'],
    ['a client with no trainer', { 'users/c1': { role: 'client', trainerId: null } }, 'failed-precondition'],
    ['a trainer with no subscription rate', { 'users/t1': { role: 'trainer', currency: 'GBP' } }, 'failed-precondition'],
    ['a trainer billing in HKD', { 'users/t1': { role: 'trainer', subscriptionRate: 65, currency: 'HKD' } }, 'failed-precondition'],
    ['a trainer who never connected GoCardless', { 'paymentConnections/t1': { status: 'disconnected' } }, 'failed-precondition'],
  ])('refuses %s, with no GoCardless call', async (_label, override, code) => {
    db = fakeDb({ ...seed(), ...override });
    await expect(startSubscription({ ...baseDeps(db, gc), uid: 'c1', tier: 4 })).rejects.toMatchObject({ code });
    expect(gc.calls).toEqual([]);
  });

  // GUARDIAN: sandbox is for people who know it is a test.
  test('GUARDIAN: in sandbox, a client the trainer has not marked as a tester is refused', async () => {
    db = fakeDb({ ...seed(), 'users/c1': { role: 'client', trainerId: 't1', name: 'Real Client' } });
    await expect(startSubscription({ ...baseDeps(db, gc), uid: 'c1', tier: 4 })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(gc.calls).toEqual([]);
  });

  test('one plan at a time: an active subscription blocks a second', async () => {
    db = fakeDb({ ...seed(), 'subscriptions/old': { clientId: 'c1', status: 'active' } });
    await expect(startSubscription({ ...baseDeps(db, gc), uid: 'c1', tier: 4 })).rejects.toMatchObject({ code: 'already-exists' });
  });

  test('an abandoned earlier attempt does not block, and is marked superseded', async () => {
    db = fakeDb({ ...seed(), 'subscriptions/old': { clientId: 'c1', status: 'pending' } });
    await startSubscription({ ...baseDeps(db, gc), uid: 'c1', tier: 4 });
    expect(db.store.get('subscriptions/old').status).toBe('abandoned');
  });

  test('GoCardless refusing the request leaves a failed doc, not a pending one', async () => {
    gc = fakeGc({ 'POST /billing_requests': () => [422, { error: { type: 'validation_failed', message: 'nope' } }] });
    await expect(startSubscription({ ...baseDeps(db, gc), uid: 'c1', tier: 4 })).rejects.toMatchObject({ code: 'unavailable' });
    const subs = [...db.store.entries()].filter(([k]) => k.startsWith('subscriptions/'));
    expect(subs).toHaveLength(1);
    expect(subs[0][1]).toMatchObject({ status: 'failed', lastError: 'gc 422 validation_failed: nope' });
  });
});

describe('completeSubscription', () => {
  const pendingSeed = (over = {}) => ({
    'subscriptions/SUB0000000001': {
      id: 'SUB0000000001', clientId: 'c1', trainerId: 't1', tier: 8, monthlyAmount: 563.33,
      status: 'pending', billingRequestId: 'BRQ1', updatedAt: NOW.toISOString(), ...over,
    },
  });
  const run = (db, gc) => completeSubscription({ db, subscriptionId: 'SUB0000000001', readToken: async () => 'tok-t1', fetchImpl: gc.fetchImpl, now: () => NOW });

  // GUARDIAN: nothing is activated on the strength of the redirect alone.
  test('GUARDIAN: an unfulfilled billing request stays pending and no GoCardless subscription is created', async () => {
    const db = fakeDb(pendingSeed());
    const gc = fakeGc({ 'GET /billing_requests/BRQ1': () => [200, { billing_requests: { status: 'pending', links: {} } }] });
    expect(await run(db, gc)).toEqual({ status: 'pending' });
    expect(db.store.get('subscriptions/SUB0000000001').status).toBe('pending');
    expect(gc.calls.map((c) => c.path)).toEqual(['/billing_requests/BRQ1']);
  });

  test('fulfilled → monthly GoCardless subscription in pence on the new mandate → active', async () => {
    const db = fakeDb(pendingSeed());
    const gc = fakeGc({
      'GET /billing_requests/BRQ1': () => [200, { billing_requests: { status: 'fulfilled', links: { mandate_request_mandate: 'MD1' } } }],
      'POST /subscriptions': () => [201, { subscriptions: { id: 'SB1' } }],
    });
    expect(await run(db, gc)).toEqual({ status: 'active' });
    const create = gc.calls[1];
    expect(create.body.subscriptions).toMatchObject({ amount: 56333, currency: 'GBP', interval_unit: 'monthly', links: { mandate: 'MD1' } });
    expect(create.headers['Idempotency-Key']).toBe('sub-SUB0000000001');
    expect(db.store.get('subscriptions/SUB0000000001')).toMatchObject({
      status: 'active', providerAuthorisationId: 'MD1', providerSubscriptionId: 'SB1',
    });
  });

  test('GUARDIAN: a second return (double tap, reload) creates nothing more', async () => {
    const db = fakeDb(pendingSeed({ status: 'active' }));
    const gc = fakeGc({});
    expect(await run(db, gc)).toEqual({ status: 'active' });
    expect(gc.calls).toEqual([]);
  });

  test('a retry after lost bookkeeping adopts the subscription GoCardless already made', async () => {
    const db = fakeDb(pendingSeed());
    const gc = fakeGc({
      'GET /billing_requests/BRQ1': () => [200, { billing_requests: { status: 'fulfilled', links: { mandate_request_mandate: 'MD1' } } }],
      'POST /subscriptions': () => [409, { error: { type: 'invalid_state', errors: [{ reason: 'idempotent_creation_conflict', links: { conflicting_resource_id: 'SB1' } }] } }],
    });
    expect(await run(db, gc)).toEqual({ status: 'active' });
    expect(db.store.get('subscriptions/SUB0000000001').providerSubscriptionId).toBe('SB1');
  });

  test('a cancelled billing request is marked abandoned', async () => {
    const db = fakeDb(pendingSeed());
    const gc = fakeGc({ 'GET /billing_requests/BRQ1': () => [200, { billing_requests: { status: 'cancelled', links: {} } }] });
    expect(await run(db, gc)).toEqual({ status: 'abandoned' });
  });

  test('a claim left by a crashed attempt is recoverable after two minutes, not before', async () => {
    const fresh = fakeDb(pendingSeed({ status: 'completing', updatedAt: new Date(NOW - 30 * 1000).toISOString() }));
    expect(await run(fresh, fakeGc({}))).toEqual({ status: 'completing' });
    const stale = fakeDb(pendingSeed({ status: 'completing', updatedAt: new Date(NOW - 5 * 60 * 1000).toISOString() }));
    const gc = fakeGc({ 'GET /billing_requests/BRQ1': () => [200, { billing_requests: { status: 'pending', links: {} } }] });
    expect(await run(stale, gc)).toEqual({ status: 'pending' });
  });

  test('a malformed or unknown id does nothing', async () => {
    const gc = fakeGc({});
    expect(await completeSubscription({ db: fakeDb({}), subscriptionId: '../users/x', readToken: async () => 't', fetchImpl: gc.fetchImpl, now: () => NOW })).toEqual({ status: 'unknown' });
    expect(await completeSubscription({ db: fakeDb({}), subscriptionId: 'NOPE00000000', readToken: async () => 't', fetchImpl: gc.fetchImpl, now: () => NOW })).toEqual({ status: 'unknown' });
    expect(gc.calls).toEqual([]);
  });
});

describe('conflictingResourceId', () => {
  test('only a 409 with a link counts', () => {
    expect(conflictingResourceId({ status: 422, body: {} })).toBeNull();
    expect(conflictingResourceId({ status: 409, body: { error: { errors: [{}] } } })).toBeNull();
  });
});
