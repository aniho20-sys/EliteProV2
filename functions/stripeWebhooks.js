// B49 — what Stripe's events mean for ElitePro (reports/stripe-subscription-design.md §4).
//
// One endpoint (stripeWebhook in index.js) receives the events of every coach's connected
// account; `event.account` says whose. Its signature proves Stripe sent it — nothing
// inside it is otherwise taken on trust: every object that moves sessions or a plan's
// status is fetched again from Stripe first.
//
//   invoice.paid                     → the month's sessions are added (same rule as GoCardless)
//   invoice.payment_failed           → plan past due; coach and client told
//   customer.subscription.updated    → ended at Stripe: cancelled · retries exhausted: past due
//   customer.subscription.deleted    → plan cancelled
//   charge.dispute.created           → plan past due; coach told (B52)
//   checkout.session.completed       → plan activated (the same check as the return page)
//   account.updated                  → the coach's connection status re-read
//   account.application.deauthorized → the coach cut ElitePro off: connection marked disconnected
//
// Events arrive at least once and in any order; every effect is idempotent.

const { stripeRequest, StripeApiError, keyEnvironment } = require('./stripeApi');
const { grantForPayment, subscriptionBy, notifyClientMoved } = require('./gcWebhooks');
const { trainerForAccount, refreshConnection, markDisconnected } = require('./stripeConnect');
const { completeSubscription, cancelStripeSubscription } = require('./stripeSubscriptions');
const { FINISHED_STATUSES, CLAIM_TTL_MS } = require('./gcSubscriptions');
const { localDateHour } = require('./zonedTime');

const idOf = (v) => (v && typeof v === 'object' ? v.id : v) || null;

// Newer API versions put the subscription under invoice.parent; older ones on the invoice.
const invoiceSubscriptionId = (inv) =>
  idOf(inv && inv.parent && inv.parent.subscription_details && inv.parent.subscription_details.subscription)
  || idOf(inv && inv.subscription);

// Only these invoices are "a month of the plan". Anything else on a plan's subscription —
// a proration, an invoice the coach made by hand in their own dashboard — is money we
// cannot price in sessions, so the coach is asked to look instead (B52).
const MONTHLY_REASONS = ['subscription_create', 'subscription_cycle'];

// Stripe's subscription states that mean it will never charge again.
const ENDED_AT_STRIPE = ['canceled', 'incomplete_expired'];

// Our subscriptions doc for a client_reference_id / metadata id — only if it is this
// coach's, on this coach's Stripe account. Tenant isolation, same as GoCardless.
async function ourPlan(db, subscriptionId, trainerId, accountId) {
  if (typeof subscriptionId !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(subscriptionId)) return null;
  const snap = await db.doc(`subscriptions/${subscriptionId}`).get();
  if (!snap.exists) return null;
  const s = snap.data();
  if (s.provider !== 'stripe' || s.trainerId !== trainerId || s.providerAccountId !== accountId) return null;
  return snap;
}

// The plan a Stripe subscription belongs to. Usually found by its id; but the first
// invoice (or its failure) can arrive before the checkout was processed, and then the
// plan is found through the subscription's own metadata — read from Stripe, never from
// the event — and linked to it here (B52: the old path went through the checkout claim,
// which a return page holding that claim made fail, and the paid month was lost).
async function planForStripeSubscription({ db, stripeSubId, trainerId, account, get, now }) {
  if (!stripeSubId) return null;
  const found = await subscriptionBy(db, 'providerSubscriptionId', stripeSubId, trainerId);
  if (found) return found;
  const current = await get(`/v1/subscriptions/${stripeSubId}`);
  const plan = await ourPlan(db, current.metadata && current.metadata.subscription_id, trainerId, account);
  if (!plan) return null;

  const ref = plan.ref;
  const linked = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const s = snap.data();
    if (s.providerSubscriptionId) return s.providerSubscriptionId === stripeSubId;
    const ts = now().toISOString();
    const link = { providerSubscriptionId: stripeSubId, providerCustomerId: idOf(current.customer), updatedAt: ts };
    // A plan still being set up becomes active; a finished one stays finished, but is
    // linked so a payment Stripe took for it anyway is still found and accounted for.
    tx.update(ref, FINISHED_STATUSES.includes(s.status) ? link
      : { ...link, status: 'active', startDate: ts.slice(0, 10), lastError: null });
    return true;
  });
  return linked ? ref.get() : null;
}

// The day a paid month starts, in the coach's own calendar. From the subscription line's
// period — on a renewal the invoice's own period_start is the month that just ended.
function periodStartDate(invoice, timeZone, now) {
  const starts = ((invoice.lines && invoice.lines.data) || [])
    .map(l => l && l.period && l.period.start).filter(Number.isFinite);
  const paidAt = invoice.status_transitions && invoice.status_transitions.paid_at;
  const sec = starts.length ? Math.min(...starts) : paidAt;
  return localDateHour(Number.isFinite(sec) ? sec * 1000 : now().getTime(), timeZone).date;
}

async function markPastDue(sub, now, fields) {
  await sub.ref.update({
    status: 'past_due',
    lastPaymentStatus: 'failed',
    paymentFailedAt: now().toISOString().slice(0, 10),
    updatedAt: now().toISOString(),
    ...fields,
  });
}

async function processStripeEvent({ db, event, keys, fetchImpl, now, notify }) {
  // A test event must never move a live plan, nor the other way round.
  // Only possible while the stored key and webhook secret are from different modes (a
  // half-finished key change): answered "retry" rather than recorded, so the event is
  // handled once both match instead of being lost (B52).
  if ((event.livemode === true ? 'live' : 'sandbox') !== keyEnvironment(keys.secretKey)) {
    throw new Error('event mode differs from the stored Stripe key');
  }
  const account = event.account;
  const trainerId = await trainerForAccount(db, account);
  if (!trainerId) return 'unknown_account';
  const object = (event.data && event.data.object) || {};
  const get = (path) => stripeRequest({ fetchImpl, secretKey: keys.secretKey, account, path });

  try {
    return await processFor({ db, event, object, trainerId, account, get, keys, fetchImpl, now, notify });
  } catch (err) {
    // The object no longer exists at Stripe (deleted in the coach's dashboard): nothing will
    // ever make this event actionable, so retrying it for three days helps nobody.
    if (err instanceof StripeApiError && err.status === 404) return 'gone';
    throw err;
  }
}

async function processFor({ db, event, object, trainerId, account, get, keys, fetchImpl, now, notify }) {
  switch (event.type) {
    case 'account.updated': {
      const res = await refreshConnection({ db, trainerId, keys, fetchImpl, now });
      return `account:${res.status}`;
    }

    case 'account.application.deauthorized': {
      // ElitePro can no longer read the account to confirm this — but the event is signed
      // by Stripe and can only make things safer: no new plans, clients stop being offered one.
      const { endedPlans } = await markDisconnected({ db, trainerId, now });
      if (endedPlans.length > 0) {
        await notify({ userId: trainerId, title: 'Cancel your clients’ plans in Stripe',
          body: `${endedPlans.length} monthly plan(s) will keep charging in your Stripe account until you cancel them there. ElitePro can no longer add their sessions.` });
        for (const p of endedPlans) {
          await notify({ userId: p.clientId, title: 'Your monthly plan has stopped',
            body: 'Your coach disconnected their payments from ElitePro. Please contact your coach.' });
        }
      }
      return 'disconnected';
    }

    case 'checkout.session.completed': {
      const plan = await ourPlan(db, object.client_reference_id, trainerId, account);
      if (!plan) return 'not_ours';
      if (FINISHED_STATUSES.includes(plan.data().status)) {
        // A plan the client had already replaced or cancelled was paid for after all —
        // stop it at once, or they would be charged for two.
        const session = await get(`/v1/checkout/sessions/${object.id}`);
        const stripeSubId = idOf(session.subscription);
        if (!stripeSubId) return 'superseded';
        // Linked first, so its first invoice — already paid — still finds this plan.
        if (!plan.data().providerSubscriptionId) {
          await plan.ref.update({ providerSubscriptionId: stripeSubId, providerCustomerId: idOf(session.customer), updatedAt: now().toISOString() });
        }
        await cancelStripeSubscription({ keys, fetchImpl, account, id: stripeSubId });
        return 'superseded_cancelled';
      }
      const { status } = await completeSubscription({ db, subscriptionId: plan.id, keys, fetchImpl, now });
      return `checkout:${status}`;
    }

    case 'invoice.paid': {
      const invoice = await get(`/v1/invoices/${object.id}`);
      if (invoice.status !== 'paid') return 'not_paid';
      const sub = await planForStripeSubscription({ db, stripeSubId: invoiceSubscriptionId(invoice), trainerId, account, get, now });
      if (!sub) return 'not_ours';
      const s = sub.data();
      // Whatever the amount: a month paid with a 100% discount is still a month.
      if (!MONTHLY_REASONS.includes(invoice.billing_reason)) {
        await notify({ userId: s.trainerId, title: 'A payment needs a look',
          body: 'A client paid a Stripe invoice that is not their monthly charge, so no sessions were added. Check it in your Stripe dashboard.' });
        return 'needs_review';
      }
      const trainerSnap = await db.doc(`users/${trainerId}`).get();
      const timeZone = trainerSnap.exists ? trainerSnap.data().timeZone : undefined;
      const res = await grantForPayment({ db, sub, payment: { id: invoice.id, charge_date: periodStartDate(invoice, timeZone, now) }, now });
      if (res.outcome === 'granted') {
        await notify({ userId: s.clientId, title: 'Sessions added',
          body: `${res.granted} sessions for this month have been added to your plan.` });
        if (FINISHED_STATUSES.includes(s.status)) {
          await notify({ userId: s.trainerId, title: 'Payment for a stopped plan',
            body: 'A client paid for a monthly plan that had already been stopped. The sessions were added to their balance.' });
        }
      }
      if (res.outcome === 'client_moved') await notifyClientMoved(notify, s);
      return res.outcome;
    }

    case 'invoice.payment_failed': {
      const invoice = await get(`/v1/invoices/${object.id}`);
      // Only an invoice still waiting for money is a failure now — one since paid, voided or
      // written off has moved on, and its own event says so.
      if (invoice.status !== 'open') return 'not_open';
      const sub = await planForStripeSubscription({ db, stripeSubId: invoiceSubscriptionId(invoice), trainerId, account, get, now });
      if (!sub) return 'not_ours';
      const s = sub.data();
      if (FINISHED_STATUSES.includes(s.status)) return 'already_ended';
      await markPastDue(sub, now, { lastPaymentId: invoice.id, lastError: 'invoice.payment_failed' });
      await notify({ userId: s.trainerId, title: 'Monthly plan payment failed',
        body: 'A client’s monthly payment did not go through. Open ElitePro to see who.' });
      await notify({ userId: s.clientId, title: 'Your payment didn’t go through',
        body: 'Your monthly plan payment failed. Please check your card or bank, or contact your coach.' });
      return 'past_due';
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const current = await get(`/v1/subscriptions/${object.id}`);
      const sub = await planForStripeSubscription({ db, stripeSubId: current.id, trainerId, account, get, now });
      if (!sub) return 'not_ours';
      const s = sub.data();
      if (FINISHED_STATUSES.includes(s.status)) return 'already_ended';
      if (ENDED_AT_STRIPE.includes(current.status)) {
        await sub.ref.update({ status: 'cancelled', lastError: `stripe:${current.status}`, updatedAt: now().toISOString() });
        return 'cancelled';
      }
      // Stripe gave up retrying and stopped charging, but kept the subscription.
      if (current.status === 'unpaid' && s.status !== 'past_due') {
        await markPastDue(sub, now, { lastError: 'stripe:unpaid' });
        return 'past_due';
      }
      return 'unchanged';
    }

    case 'charge.dispute.created': {
      // The client asked their bank for a payment back. Stripe takes the money from the
      // coach until it is settled, so no more sessions go out on this plan for now.
      const dispute = await get(`/v1/disputes/${object.id}`);
      const charge = await get(`/v1/charges/${idOf(dispute.charge)}`);
      const customerId = idOf(charge.customer);
      if (!customerId) return 'not_ours';
      // One customer per checkout, so normally one plan; if there are more, the one still running.
      const plans = (await db.collection('subscriptions').where('providerCustomerId', '==', customerId).limit(10).get())
        .docs.filter(d => d.data().trainerId === trainerId && d.data().provider === 'stripe');
      const sub = plans.find(d => !FINISHED_STATUSES.includes(d.data().status)) || plans[0];
      if (!sub) return 'not_ours';
      const s = sub.data();
      if (!FINISHED_STATUSES.includes(s.status)) await markPastDue(sub, now, { lastError: 'charge.dispute.created' });
      await notify({ userId: s.trainerId, title: 'A client disputed a payment',
        body: 'A client has asked their bank to reverse a monthly plan payment. Check it in your Stripe dashboard.' });
      return 'disputed';
    }

    default:
      return 'ignored';
  }
}

// One delivery = one event. Claimed before it is handled, so two deliveries arriving
// together cannot both act on it (B52); a failure removes the claim and the caller
// answers 500, so Stripe sends it again. A claim left by a crash expires after two minutes.
async function handleStripeWebhook({ db, event, keys, fetchImpl, now, notify }) {
  if (!event || typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]{6,64}$/.test(event.id)) return { outcome: 'malformed' };
  const seenRef = db.doc(`stripeEvents/${event.id}`);
  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(seenRef);
    if (snap.exists) {
      const d = snap.data();
      if (d.outcome !== 'processing') return 'duplicate';
      if (now().getTime() - new Date(d.claimedAt).getTime() < CLAIM_TTL_MS) return 'in_progress';
    }
    tx.set(seenRef, {
      outcome: 'processing',
      type: String(event.type || ''),
      account: String(event.account || ''),
      claimedAt: now().toISOString(),
    });
    return 'claimed';
  });
  if (claim === 'duplicate') return { outcome: 'duplicate' };
  // Another delivery is handling it right now; if that one fails, this retry is the one
  // that must succeed — so ask Stripe to send it again rather than answer "done".
  if (claim === 'in_progress') throw new Error('event already being processed');

  let outcome;
  try {
    outcome = await processStripeEvent({ db, event, keys, fetchImpl, now, notify });
  } catch (err) {
    await seenRef.delete().catch(() => {});
    throw err;
  }
  await seenRef.update({ outcome, processedAt: now().toISOString() });
  return { outcome };
}

module.exports = { processStripeEvent, handleStripeWebhook, invoiceSubscriptionId };
