// B49 — a client subscribes to a monthly plan through their coach's own Stripe account
// (reports/stripe-subscription-design.md §3). The Stripe twin of gcSubscriptions.js, and
// deliberately the same shape: same tiers, same server-side price, same one-plan rule,
// same "the redirect proves nothing, ask the processor" rule, same claim on return.
//
//   1. startSubscription — price from the coach's own rate, a `pending` subscriptions
//      doc, then a Checkout Session (mode=subscription) on the COACH's Stripe account.
//   2. The client pays on Stripe's page — card, or Bacs Direct Debit for a UK coach.
//   3. completeSubscription — on return, on demand and on the checkout.session.completed
//      webhook: only Stripe saying the session is complete moves the plan to `active`.
//
// Sessions are NOT granted here: they follow paid invoices (stripeWebhooks.js), exactly as
// GoCardless sessions follow confirmed payments. A card on file is not money received.

const { stripeRequest, StripeApiError, describeStripeError, keyEnvironment } = require('./stripeApi');
const { COUNTRIES } = require('./stripeConnect');
const {
  TIERS, LIVE_STATUSES, FINISHED_STATUSES, CLAIM_TTL_MS, SubscriptionError, monthlyAmountPence,
} = require('./gcSubscriptions');

// Same pilot rule as GoCardless: only clients the coach has marked `subscriptionTester`.
const PILOT = true;
// Every currency the app offers has two decimal places, so "pence" maths holds for all.
const CURRENCIES = ['GBP', 'HKD', 'USD', 'EUR', 'SGD', 'AUD'];
// Stripe's minimum. A link left unused is dead within the hour instead of a day, so a
// plan the client walked away from cannot be paid for long after it was replaced.
const CHECKOUT_TTL_SEC = 60 * 60;

const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9]{10,40}$/.test(id);
const idOf = (v) => (v && typeof v === 'object' ? v.id : v) || null;

async function connectionFor(db, trainerId, keys) {
  const snap = await db.doc(`paymentConnections/${trainerId}`).get();
  const stripe = snap.exists ? snap.data().stripe : null;
  if (!stripe || stripe.status !== 'connected' || !stripe.accountId) return null;
  if (stripe.environment !== keyEnvironment(keys.secretKey)) return null;
  return stripe;
}

async function startSubscription({ db, uid, tier, keys, fetchImpl, now, returnUrl, exitUrl }) {
  tier = Number(tier);
  if (!TIERS.includes(tier)) throw new SubscriptionError('invalid-argument', 'Unknown plan');

  const clientSnap = await db.doc(`users/${uid}`).get();
  const client = clientSnap.exists ? clientSnap.data() : null;
  if (!client || client.role !== 'client') throw new SubscriptionError('permission-denied', 'Clients only');
  if (!client.trainerId) throw new SubscriptionError('failed-precondition', 'Not connected to a trainer');
  if (PILOT && client.subscriptionTester !== true) {
    throw new SubscriptionError('permission-denied', 'Subscriptions are in testing');
  }
  const trainerId = client.trainerId;

  const trainerSnap = await db.doc(`users/${trainerId}`).get();
  const trainer = trainerSnap.exists ? trainerSnap.data() : null;
  if (!trainer || trainer.role !== 'trainer') throw new SubscriptionError('failed-precondition', 'Trainer not found');
  const currency = trainer.currency || 'GBP';
  if (!CURRENCIES.includes(currency)) throw new SubscriptionError('failed-precondition', 'Unsupported currency');
  const amount = monthlyAmountPence(trainer.subscriptionRate, tier);

  if (!keys) throw new SubscriptionError('failed-precondition', 'Stripe is not set up yet');
  const conn = await connectionFor(db, trainerId, keys);
  if (!conn) throw new SubscriptionError('failed-precondition', 'Trainer has not connected Stripe');
  // The coach's Stripe account charges in its country's currency (Grok #29, B79): a UK
  // account pricing in HKD would have every payment converted. Refused, never converted.
  const accountCurrency = COUNTRIES[conn.country];
  if (accountCurrency && currency !== accountCurrency) {
    throw new SubscriptionError('failed-precondition', 'Currency does not match the Stripe account');
  }

  // One plan at a time, whichever processor holds it.
  const existing = await db.collection('subscriptions').where('clientId', '==', uid).get();
  const stalePending = [];
  const sandboxLeftovers = [];
  for (const d of existing.docs) {
    const s = d.data();
    // A test-mode Stripe plan left over once ElitePro is live is not a real plan and must not
    // block a real one (B52) — it is retired below. Never the reverse: a live plan is real.
    if (s.provider === 'stripe' && conn.environment === 'live' && (s.environment || 'sandbox') !== 'live'
      && !FINISHED_STATUSES.includes(s.status)) {
      sandboxLeftovers.push(d);
      continue;
    }
    if (LIVE_STATUSES.includes(s.status)) throw new SubscriptionError('already-exists', 'Already subscribed');
    if (s.status === 'pending') stalePending.push(d);
  }

  // Settle every earlier unfinished Stripe checkout BEFORE opening a new one (B52). Marking it
  // abandoned without knowing let a client pay for both: a checkout still being created by a
  // double tap, one that failed to expire, or one already paid whose return never arrived.
  for (const d of stalePending) {
    const s = d.data();
    if (s.provider !== 'stripe') continue;
    if (!s.checkoutSessionId) {
      if (now().getTime() - new Date(s.createdAt).getTime() < CLAIM_TTL_MS) {
        throw new SubscriptionError('already-exists', 'Already being set up');
      }
      continue; // its creation failed long ago; nothing at Stripe to close
    }
    let session;
    try {
      session = await stripeRequest({
        fetchImpl, secretKey: keys.secretKey, account: s.providerAccountId,
        path: `/v1/checkout/sessions/${s.checkoutSessionId}`,
      });
      if (session.status === 'open') {
        await stripeRequest({
          fetchImpl, secretKey: keys.secretKey, method: 'POST', account: s.providerAccountId,
          path: `/v1/checkout/sessions/${s.checkoutSessionId}/expire`,
        });
      }
    } catch {
      throw new SubscriptionError('unavailable', 'Could not close the earlier checkout');
    }
    if (session.status === 'complete') {
      // Paid already: that is the client's plan. Activate it rather than open a second.
      await completeSubscription({ db, subscriptionId: d.id, keys, fetchImpl, now });
      throw new SubscriptionError('already-exists', 'Already subscribed');
    }
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
    currency,
    status: 'pending',
    provider: 'stripe',
    environment: conn.environment,
    providerAccountId: conn.accountId,
    providerAuthorisationId: null,
    providerSubscriptionId: null,
    checkoutSessionId: null,
    rolloverBanked: 0,
    pausedAt: null,
    pauseResumeDate: null,
    pauseHistory: [],
    createdAt: ts,
    updatedAt: ts,
  });
  for (const d of stalePending) await d.ref.update({ status: 'abandoned', updatedAt: ts });
  for (const d of sandboxLeftovers) await d.ref.update({ status: 'abandoned', cancelReason: 'sandbox_retired', updatedAt: ts });

  // Bacs is a UK scheme: GBP, a UK account, and only once Stripe has switched it on for it.
  const paymentMethods = currency === 'GBP' && conn.country === 'GB' && conn.bacsEnabled ? ['card', 'bacs_debit'] : ['card'];
  try {
    const session = await stripeRequest({
      fetchImpl, secretKey: keys.secretKey, method: 'POST', path: '/v1/checkout/sessions',
      account: conn.accountId,
      idempotencyKey: `cs-${subscriptionId}`,
      params: {
        mode: 'subscription',
        client_reference_id: subscriptionId,
        customer_email: client.email || undefined,
        payment_method_types: paymentMethods,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: amount,
            recurring: { interval: 'month' },
            product_data: { name: `${tier} sessions a month` },
          },
        }],
        metadata: { subscription_id: subscriptionId },
        subscription_data: { metadata: { subscription_id: subscriptionId, client_id: uid } },
        expires_at: Math.floor(now().getTime() / 1000) + CHECKOUT_TTL_SEC,
        success_url: returnUrl(subscriptionId),
        cancel_url: exitUrl,
      },
    });
    await ref.update({ checkoutSessionId: session.id, updatedAt: now().toISOString() });
    return { subscriptionId, url: session.url };
  } catch (err) {
    await ref.update({ status: 'failed', lastError: describeStripeError(err), updatedAt: now().toISOString() });
    throw new SubscriptionError('unavailable', 'Stripe did not accept the request');
  }
}

async function completeSubscription({ db, subscriptionId, keys, fetchImpl, now }) {
  if (!validId(subscriptionId)) return { status: 'unknown' };
  const ref = db.doc(`subscriptions/${subscriptionId}`);

  // Claim it, so a double tap or a reload racing the webhook cannot activate it twice.
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { status: 'unknown' };
    const s = snap.data();
    if (s.provider !== 'stripe') return { status: s.status };
    const stale = s.status === 'completing'
      && now().getTime() - new Date(s.updatedAt).getTime() > CLAIM_TTL_MS;
    if (s.status !== 'pending' && !stale) return { status: s.status };
    tx.update(ref, { status: 'completing', updatedAt: now().toISOString() });
    return { status: 'claimed', sub: s };
  });
  if (claimed.status !== 'claimed') return { status: claimed.status };
  const sub = claimed.sub;
  const release = (fields) => ref.update({ status: 'pending', ...fields, updatedAt: now().toISOString() });

  if (!keys || !sub.checkoutSessionId) {
    await release({ lastError: keys ? 'no checkout session' : 'stripe not configured' });
    return { status: 'pending' };
  }
  // The other mode's key cannot see this plan's objects; a 404 from it means nothing.
  if ((sub.environment || 'sandbox') !== keyEnvironment(keys.secretKey)) {
    await release({ lastError: 'stripe key is in the other mode' });
    return { status: 'pending' };
  }

  let session;
  try {
    session = await stripeRequest({
      fetchImpl, secretKey: keys.secretKey, account: sub.providerAccountId,
      path: `/v1/checkout/sessions/${sub.checkoutSessionId}`,
    });
  } catch (err) {
    await release({ lastError: describeStripeError(err) });
    return { status: 'pending' };
  }

  if (session.status === 'expired') {
    await ref.update({ status: 'abandoned', updatedAt: now().toISOString() });
    return { status: 'abandoned' };
  }
  const stripeSubscriptionId = idOf(session.subscription);
  if (session.status !== 'complete' || !stripeSubscriptionId) {
    await release({});
    return { status: 'pending' };
  }

  const ts = now().toISOString();
  await ref.update({
    status: 'active',
    providerSubscriptionId: stripeSubscriptionId,
    providerCustomerId: idOf(session.customer),
    startDate: ts.slice(0, 10),
    lastError: null,
    updatedAt: ts,
  });
  return { status: 'active' };
}

// Cancel one Stripe subscription; "already gone" is the outcome we wanted.
async function cancelStripeSubscription({ keys, fetchImpl, account, id }) {
  try {
    const current = await stripeRequest({ fetchImpl, secretKey: keys.secretKey, account, path: `/v1/subscriptions/${id}` });
    if (current.status === 'canceled' || current.status === 'incomplete_expired') return;
    await stripeRequest({ fetchImpl, secretKey: keys.secretKey, method: 'DELETE', account, path: `/v1/subscriptions/${id}` });
  } catch (err) {
    if (err instanceof StripeApiError && err.status === 404) return;
    throw err;
  }
}

// Stop one plan at Stripe. A plan still `pending` may have been paid on Stripe's page
// without our return ever arriving, so its Checkout Session is read again first. Throws on
// failure; the doc says `cancelled` only once Stripe has agreed.
async function cancelAtStripe({ ref, sub, keys, fetchImpl, now, reason }) {
  if (!keys) throw new Error('stripe not configured');
  // With the other mode's key every object is a 404, which would read as "already gone"
  // while the real subscription kept charging (B52).
  if ((sub.environment || 'sandbox') !== keyEnvironment(keys.secretKey)) throw new Error('stripe key is in the other mode');
  const account = sub.providerAccountId;
  let stripeSubscriptionId = sub.providerSubscriptionId || null;

  if (!stripeSubscriptionId && sub.checkoutSessionId) {
    const session = await stripeRequest({
      fetchImpl, secretKey: keys.secretKey, account, path: `/v1/checkout/sessions/${sub.checkoutSessionId}`,
    });
    stripeSubscriptionId = idOf(session.subscription);
    if (!stripeSubscriptionId && session.status === 'open') {
      await stripeRequest({
        fetchImpl, secretKey: keys.secretKey, method: 'POST', account,
        path: `/v1/checkout/sessions/${sub.checkoutSessionId}/expire`,
      });
    }
  }
  if (stripeSubscriptionId) await cancelStripeSubscription({ keys, fetchImpl, account, id: stripeSubscriptionId });

  const ts = now().toISOString();
  // Recorded even when cancelling: a first invoice already paid must still find its plan.
  await ref.update({
    status: 'cancelled', cancelledAt: ts, cancelReason: reason, cancelError: null, updatedAt: ts,
    ...(stripeSubscriptionId ? { providerSubscriptionId: stripeSubscriptionId } : {}),
  });
}

// Every Stripe plan where `field` (clientId / trainerId) is `uid` — for onAccountDelete.
// Failures are recorded and returned, never thrown (same reasons as gcSubscriptions).
async function cancelSubscriptionsFor({ db, uid, field, keys, fetchImpl, now, reason, onlyTrainerId }) {
  const result = { cancelled: [], failed: [] };
  const snap = await db.collection('subscriptions').where(field, '==', uid).get();
  for (const d of snap.docs) {
    const sub = d.data();
    if (sub.provider !== 'stripe' || FINISHED_STATUSES.includes(sub.status)) continue;
    if (onlyTrainerId && sub.trainerId !== onlyTrainerId) continue;
    try {
      await cancelAtStripe({ ref: d.ref, sub, keys, fetchImpl, now, reason });
      result.cancelled.push(d.ref.id);
    } catch (err) {
      const error = describeStripeError(err);
      await d.ref.update({ cancelError: error, updatedAt: now().toISOString() });
      result.failed.push({ id: d.ref.id, trainerId: sub.trainerId, error });
    }
  }
  return result;
}

// A client — or their coach — cancels from the app.
async function cancelSubscription({ db, uid, subscriptionId, keys, fetchImpl, now }) {
  if (!validId(subscriptionId)) throw new SubscriptionError('invalid-argument', 'Bad subscription id');
  const ref = db.doc(`subscriptions/${subscriptionId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new SubscriptionError('not-found', 'No such subscription');
  const sub = snap.data();
  const by = uid === sub.clientId ? 'client' : uid === sub.trainerId ? 'trainer' : null;
  if (!by) throw new SubscriptionError('permission-denied', 'Not your subscription');
  if (sub.provider !== 'stripe') throw new SubscriptionError('failed-precondition', 'Not a Stripe plan');
  if (FINISHED_STATUSES.includes(sub.status)) return { status: sub.status };
  const activating = sub.status === 'completing'
    && now().getTime() - new Date(sub.updatedAt).getTime() <= CLAIM_TTL_MS;
  if (activating) throw new SubscriptionError('failed-precondition', 'Still being set up — try again in a minute');

  try {
    await cancelAtStripe({ ref, sub, keys, fetchImpl, now, reason: `cancelled_by_${by}` });
  } catch (err) {
    await ref.update({ cancelError: describeStripeError(err), updatedAt: now().toISOString() });
    throw new SubscriptionError('unavailable', 'Stripe did not confirm the cancellation');
  }
  return { status: 'cancelled' };
}

module.exports = {
  CURRENCIES, startSubscription, completeSubscription, cancelSubscription, cancelSubscriptionsFor,
  cancelStripeSubscription,
};
