/* global require, exports */
// Phase 3 Step 3 — a client subscribes to a monthly plan through GoCardless.
//
// Flow (verified against GoCardless's current API reference, 2026-09-23 —
// reports/phase3-subscription-design.md §10a):
//
//   1. startSubscription   — client picks a tier; we price it SERVER-SIDE from
//      the trainer's own rate, write a `pending` subscriptions doc, create a
//      Billing Request (mandate only) + Billing Request Flow in the TRAINER's
//      GoCardless account, and hand back GoCardless's hosted authorisation_url.
//   2. The client enters bank details on GoCardless's page. They never touch
//      ElitePro — nothing to store, so nothing to leak.
//   3. completeSubscription — on return (and on demand), we ask GoCardless
//      whether the billing request was fulfilled. The redirect itself is never
//      trusted: anyone can type a return URL. Only GoCardless's own answer
//      moves a subscription to `active`, at which point the monthly GoCardless
//      subscription is created against the new mandate.
//
// Sessions are NOT granted here. Credits follow confirmed payments (Step 4,
// payment webhooks) — a mandate is permission to collect, not money received.
//
// Every external dependency is injected (db, token reader, fetch, clock) so
// the rules below are unit-tested without the emulator or GoCardless.

const GC_API_BASE = 'https://api-sandbox.gocardless.com';  // sandbox only — see index.js header
// While we are on sandbox, only clients a trainer has marked `subscriptionTester`
// may start a plan. Real clients must never be shown a GoCardless page that looks
// real and takes nothing. Flip together with GC_API_BASE when going live.
const SANDBOX = true;
const GC_VERSION = '2015-07-06';
const TIERS = [4, 8, 12];
const CLAIM_TTL_MS = 2 * 60 * 1000;

// Statuses that mean "this client already has a plan in motion".
const LIVE_STATUSES = ['active', 'paused', 'past_due', 'completing'];

class SubscriptionError extends Error {
  // code is an HttpsError code: invalid-argument, failed-precondition, …
  constructor(code, message) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
  }
}

class GcApiError extends Error {
  constructor(status, body) {
    super(`GoCardless API ${status}`);
    this.name = 'GcApiError';
    this.status = status;
    this.body = body;
  }
}

// Monthly price in pence. The plans are 52-week annualised (design §1): tier
// 4 means one session a week, 52 a year, billed in 12 equal instalments —
// hence ×13/12, not ×1. £65 → 28167 / 56333 / 84500, the design table's
// £281.67 / £563.33 / £845.00. Integer pence throughout; GoCardless takes the
// amount in the lowest denomination and a float here would be a billing bug.
function monthlyAmountPence(ratePerSession, tier) {
  if (!TIERS.includes(tier)) throw new SubscriptionError('invalid-argument', 'Unknown plan');
  const pence = Math.round(Number(ratePerSession) * 100);
  if (!Number.isFinite(pence) || pence <= 0) {
    throw new SubscriptionError('failed-precondition', 'Trainer has no subscription rate');
  }
  return Math.round((pence * tier * 13) / 12);
}

async function gcRequest({ fetchImpl, token, method, path, body, idempotencyKey }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'GoCardless-Version': GC_VERSION,
    Accept: 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetchImpl(`${GC_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) throw new GcApiError(res.status, json || text);
  return json;
}

// GoCardless answers a repeated Idempotency-Key with 409 and points at the
// resource the first request already created. For subscription creation that
// is success, not failure: it means an earlier attempt got through and only
// our bookkeeping afterwards was lost.
function conflictingResourceId(err) {
  const errors = err?.body?.error?.errors;
  if (err?.status !== 409 || !Array.isArray(errors)) return null;
  for (const e of errors) {
    const id = e?.links?.conflicting_resource_id;
    if (typeof id === 'string') return id;
  }
  return null;
}

async function startSubscription({ db, uid, tier, readToken, fetchImpl, now, returnUrl, exitUrl }) {
  tier = Number(tier);
  if (!TIERS.includes(tier)) throw new SubscriptionError('invalid-argument', 'Unknown plan');

  const clientSnap = await db.doc(`users/${uid}`).get();
  const client = clientSnap.exists ? clientSnap.data() : null;
  if (!client || client.role !== 'client') throw new SubscriptionError('permission-denied', 'Clients only');
  if (!client.trainerId) throw new SubscriptionError('failed-precondition', 'Not connected to a trainer');
  if (SANDBOX && client.subscriptionTester !== true) {
    throw new SubscriptionError('permission-denied', 'Subscriptions are in testing');
  }
  const trainerId = client.trainerId;

  const trainerSnap = await db.doc(`users/${trainerId}`).get();
  const trainer = trainerSnap.exists ? trainerSnap.data() : null;
  if (!trainer || trainer.role !== 'trainer') throw new SubscriptionError('failed-precondition', 'Trainer not found');
  // Bacs is a GBP scheme. A trainer invoicing in another currency cannot be
  // offered a Bacs plan without a currency conversion nobody has decided on.
  if ((trainer.currency || 'GBP') !== 'GBP') {
    throw new SubscriptionError('failed-precondition', 'Subscriptions are GBP only for now');
  }
  const amount = monthlyAmountPence(trainer.subscriptionRate, tier);

  const connSnap = await db.doc(`paymentConnections/${trainerId}`).get();
  if (!connSnap.exists || connSnap.data().status !== 'connected') {
    throw new SubscriptionError('failed-precondition', 'Trainer has not connected GoCardless');
  }

  // One plan at a time. Older `pending` attempts (the client opened
  // GoCardless and walked away) are superseded, not blocking — the hosted
  // flow they point at expires on its own after 7 days.
  const existing = await db.collection('subscriptions').where('clientId', '==', uid).get();
  const stalePending = [];
  for (const d of existing.docs) {
    const s = d.data();
    if (LIVE_STATUSES.includes(s.status)) {
      throw new SubscriptionError('already-exists', 'Already subscribed');
    }
    if (s.status === 'pending') stalePending.push(d.ref);
  }

  let token;
  try {
    token = await readToken(trainerId);
  } catch {
    throw new SubscriptionError('failed-precondition', 'Trainer GoCardless connection unavailable');
  }

  const ts = now().toISOString();
  const ref = db.collection('subscriptions').doc();
  const subscriptionId = ref.id;
  await ref.set({
    id: subscriptionId,
    clientId: uid,
    trainerId,
    tier,
    ratePerSession: Number(trainer.subscriptionRate),
    monthlyAmount: amount / 100,
    currency: 'GBP',
    status: 'pending',
    provider: 'gocardless',
    providerAuthorisationId: null,
    providerSubscriptionId: null,
    rolloverBanked: 0,
    pausedAt: null,
    pauseResumeDate: null,
    pauseHistory: [],
    createdAt: ts,
    updatedAt: ts,
  });
  for (const r of stalePending) await r.update({ status: 'abandoned', updatedAt: ts });

  try {
    const br = await gcRequest({
      fetchImpl, token, method: 'POST', path: '/billing_requests',
      idempotencyKey: `br-${subscriptionId}`,
      body: { billing_requests: {
        mandate_request: { scheme: 'bacs', currency: 'GBP', metadata: { subscription_id: subscriptionId } },
      } },
    });
    const billingRequestId = br.billing_requests.id;

    const [givenName, ...rest] = String(client.name || '').trim().split(/\s+/);
    const flow = await gcRequest({
      fetchImpl, token, method: 'POST', path: '/billing_request_flows',
      body: { billing_request_flows: {
        redirect_uri: returnUrl(subscriptionId),
        exit_uri: exitUrl,
        prefilled_customer: {
          given_name: givenName || undefined,
          family_name: rest.join(' ') || undefined,
          email: client.email || undefined,
        },
        links: { billing_request: billingRequestId },
      } },
    });

    await ref.update({ billingRequestId, updatedAt: now().toISOString() });
    return { subscriptionId, url: flow.billing_request_flows.authorisation_url };
  } catch (err) {
    await ref.update({ status: 'failed', lastError: describeError(err), updatedAt: now().toISOString() });
    throw new SubscriptionError('unavailable', 'GoCardless did not accept the request');
  }
}

async function completeSubscription({ db, subscriptionId, readToken, fetchImpl, now }) {
  if (typeof subscriptionId !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(subscriptionId)) {
    return { status: 'unknown' };
  }
  const ref = db.doc(`subscriptions/${subscriptionId}`);

  // Claim the doc so two returns (a double tap, a reload) cannot both create
  // a GoCardless subscription. Only `pending` can be claimed.
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { status: 'unknown' };
    const s = snap.data();
    // A `completing` claim older than CLAIM_TTL_MS belongs to an attempt that
    // died mid-way (instance recycled, timeout). Without this it would sit in
    // `completing` for ever and — being a live status — block the client from
    // subscribing again.
    const stale = s.status === 'completing'
      && now().getTime() - new Date(s.updatedAt).getTime() > CLAIM_TTL_MS;
    if (s.status !== 'pending' && !stale) return { status: s.status };
    tx.update(ref, { status: 'completing', updatedAt: now().toISOString() });
    return { status: 'claimed', sub: s };
  });
  if (claimed.status !== 'claimed') return { status: claimed.status };
  const sub = claimed.sub;

  const release = (fields) => ref.update({ status: 'pending', ...fields, updatedAt: now().toISOString() });

  let token;
  try {
    token = await readToken(sub.trainerId);
  } catch (err) {
    await release({ lastError: 'trainer token unavailable' });
    return { status: 'pending' };
  }

  let br;
  try {
    br = (await gcRequest({ fetchImpl, token, method: 'GET', path: `/billing_requests/${sub.billingRequestId}` }))
      .billing_requests;
  } catch (err) {
    await release({ lastError: describeError(err) });
    return { status: 'pending' };
  }

  if (br.status === 'cancelled') {
    await ref.update({ status: 'abandoned', updatedAt: now().toISOString() });
    return { status: 'abandoned' };
  }
  const mandateId = br.links && br.links.mandate_request_mandate;
  if (br.status !== 'fulfilled' || !mandateId) {
    // Bacs mandate setup can lag the redirect by a moment. Not an error —
    // the client can check again, and Step 4's webhooks will settle it too.
    await release({});
    return { status: 'pending' };
  }

  let gcSubscriptionId;
  try {
    const created = await gcRequest({
      fetchImpl, token, method: 'POST', path: '/subscriptions',
      idempotencyKey: `sub-${subscriptionId}`,
      body: { subscriptions: {
        amount: Math.round(sub.monthlyAmount * 100),
        currency: 'GBP',
        interval_unit: 'monthly',
        name: `ElitePro — ${sub.tier} sessions a month`,
        metadata: { subscription_id: subscriptionId, client_id: sub.clientId },
        links: { mandate: mandateId },
      } },
    });
    gcSubscriptionId = created.subscriptions.id;
  } catch (err) {
    gcSubscriptionId = conflictingResourceId(err);
    if (!gcSubscriptionId) {
      await release({ providerAuthorisationId: mandateId, lastError: describeError(err) });
      return { status: 'pending' };
    }
  }

  const ts = now().toISOString();
  await ref.update({
    status: 'active',
    providerAuthorisationId: mandateId,
    providerSubscriptionId: gcSubscriptionId,
    startDate: ts.slice(0, 10),
    lastError: null,
    updatedAt: ts,
  });
  return { status: 'active' };
}

// GoCardless refuses to cancel something already cancelled, failed or finished
// with `cancellation_failed`. For our purposes that is the outcome we wanted.
function alreadyInactive(err) {
  const errors = err?.body?.error?.errors;
  return err instanceof GcApiError && Array.isArray(errors)
    && errors.some(e => e?.reason === 'cancellation_failed');
}

// Statuses with nothing left to stop at GoCardless.
const FINISHED_STATUSES = ['cancelled', 'abandoned', 'failed'];

// Stop every plan where `field` (clientId or trainerId) is `uid`, so no bank is
// charged on behalf of an account that no longer exists. Used by onAccountDelete.
//
// Cancelling the MANDATE is what actually guarantees no further collection —
// GoCardless cancels its pending payments with it. The subscription is cancelled
// first anyway so its own record says so. A plan still `pending` may have been
// completed on GoCardless's page without our return ever arriving, so the billing
// request is re-read before deciding there is no mandate to cancel.
//
// A failure is recorded on the doc (status stays as it was, `cancelError` set) and
// returned, never thrown: one trainer's revoked token must not stop the rest of the
// account's data from being deleted, and the caller tells the owner to finish by hand.
async function cancelSubscriptionsFor({ db, uid, field, readToken, fetchImpl, now, reason }) {
  const result = { cancelled: [], failed: [] };
  const snap = await db.collection('subscriptions').where(field, '==', uid).get();

  for (const d of snap.docs) {
    const sub = d.data();
    if (FINISHED_STATUSES.includes(sub.status)) continue;

    const cancel = async (token, path) => {
      try {
        await gcRequest({ fetchImpl, token, method: 'POST', path, body: { data: {} } });
      } catch (err) {
        if (!alreadyInactive(err)) throw err;
      }
    };

    try {
      const token = await readToken(sub.trainerId);
      let mandateId = sub.providerAuthorisationId || null;

      if (sub.providerSubscriptionId) {
        await cancel(token, `/subscriptions/${sub.providerSubscriptionId}/actions/cancel`);
      }
      if (!mandateId && sub.billingRequestId) {
        const br = (await gcRequest({
          fetchImpl, token, method: 'GET', path: `/billing_requests/${sub.billingRequestId}`,
        })).billing_requests;
        mandateId = (br.links && br.links.mandate_request_mandate) || null;
        if (!mandateId && br.status !== 'cancelled' && br.status !== 'fulfilled') {
          await cancel(token, `/billing_requests/${sub.billingRequestId}/actions/cancel`);
        }
      }
      if (mandateId) {
        await cancel(token, `/mandates/${mandateId}/actions/cancel`);
      }

      const ts = now().toISOString();
      await d.ref.update({ status: 'cancelled', cancelledAt: ts, cancelReason: reason, cancelError: null, updatedAt: ts });
      result.cancelled.push(d.ref.id);
    } catch (err) {
      const error = describeError(err);
      await d.ref.update({ cancelError: error, updatedAt: now().toISOString() });
      result.failed.push({ id: d.ref.id, trainerId: sub.trainerId, error });
    }
  }
  return result;
}

// What goes into Firestore about a failure: the status and GoCardless's own
// error type/message — never a token or a request body.
function describeError(err) {
  if (err instanceof GcApiError) {
    const e = err.body && err.body.error;
    return `gc ${err.status}${e && e.type ? ` ${e.type}` : ''}${e && e.message ? `: ${String(e.message).slice(0, 200)}` : ''}`;
  }
  return String(err && err.message || err).slice(0, 200);
}

exports.TIERS = TIERS;
exports.SubscriptionError = SubscriptionError;
exports.GcApiError = GcApiError;
exports.monthlyAmountPence = monthlyAmountPence;
exports.conflictingResourceId = conflictingResourceId;
exports.startSubscription = startSubscription;
exports.completeSubscription = completeSubscription;
exports.cancelSubscriptionsFor = cancelSubscriptionsFor;
