// B49 — what Stripe's events mean for ElitePro (reports/stripe-subscription-design.md §4).
//
// One endpoint (stripeWebhook in index.js) receives the events of every coach's connected
// account; `event.account` says whose. Its signature proves Stripe sent it — nothing
// inside it is otherwise taken on trust: every object that moves sessions or a plan's
// status is fetched again from Stripe first.
//
//   invoice.paid                 → the month's sessions are added (same rule as GoCardless)
//   invoice.payment_failed       → plan past due; coach and client told
//   customer.subscription.deleted→ plan cancelled
//   checkout.session.completed   → plan activated (the same check as the return page)
//   account.updated              → the coach's connection status re-read
//
// Events arrive at least once and in any order; every effect is idempotent.

const { stripeRequest, keyEnvironment } = require('./stripeApi');
const { grantForPayment, subscriptionBy } = require('./gcWebhooks');
const { trainerForAccount, refreshConnection } = require('./stripeConnect');
const { completeSubscription, cancelStripeSubscription } = require('./stripeSubscriptions');
const { FINISHED_STATUSES } = require('./gcSubscriptions');

const ALREADY_EXISTS = 6;

const idOf = (v) => (v && typeof v === 'object' ? v.id : v) || null;

// Newer API versions put the subscription under invoice.parent; older ones on the invoice.
const invoiceSubscriptionId = (inv) =>
  idOf(inv && inv.parent && inv.parent.subscription_details && inv.parent.subscription_details.subscription)
  || idOf(inv && inv.subscription);
const invoiceSubscriptionMeta = (inv) =>
  (inv && inv.parent && inv.parent.subscription_details && inv.parent.subscription_details.metadata)
  || (inv && inv.subscription_details && inv.subscription_details.metadata) || {};

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

// The plan an invoice belongs to. The first invoice can arrive before the checkout was
// processed, so a still-pending plan named in the invoice's metadata is activated first.
async function planForInvoice({ db, invoice, trainerId, account, keys, fetchImpl, now }) {
  const stripeSubId = invoiceSubscriptionId(invoice);
  if (!stripeSubId) return null;
  const found = await subscriptionBy(db, 'providerSubscriptionId', stripeSubId, trainerId);
  if (found) return found;
  const plan = await ourPlan(db, invoiceSubscriptionMeta(invoice).subscription_id, trainerId, account);
  if (!plan) return null;
  await completeSubscription({ db, subscriptionId: plan.id, keys, fetchImpl, now });
  return subscriptionBy(db, 'providerSubscriptionId', stripeSubId, trainerId);
}

const dateOf = (unixSec, fallback) => (Number.isFinite(unixSec) ? new Date(unixSec * 1000) : fallback).toISOString().slice(0, 10);

async function processStripeEvent({ db, event, keys, fetchImpl, now, notify }) {
  // A test event must never move a live plan, nor the other way round.
  if ((event.livemode === true ? 'live' : 'sandbox') !== keyEnvironment(keys.secretKey)) return 'wrong_environment';
  const account = event.account;
  const trainerId = await trainerForAccount(db, account);
  if (!trainerId) return 'unknown_account';
  const object = (event.data && event.data.object) || {};
  const get = (path) => stripeRequest({ fetchImpl, secretKey: keys.secretKey, account, path });

  switch (event.type) {
    case 'account.updated': {
      const res = await refreshConnection({ db, trainerId, keys, fetchImpl, now });
      return `account:${res.status}`;
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
        await cancelStripeSubscription({ keys, fetchImpl, account, id: stripeSubId });
        return 'superseded_cancelled';
      }
      const { status } = await completeSubscription({ db, subscriptionId: plan.id, keys, fetchImpl, now });
      return `checkout:${status}`;
    }

    case 'invoice.paid': {
      const invoice = await get(`/v1/invoices/${object.id}`);
      if (invoice.status !== 'paid' || !(invoice.amount_paid > 0)) return 'not_paid';
      const sub = await planForInvoice({ db, invoice, trainerId, account, keys, fetchImpl, now });
      if (!sub) return 'not_ours';
      const paidAt = invoice.status_transitions && invoice.status_transitions.paid_at;
      const res = await grantForPayment({ db, sub, payment: { id: invoice.id, charge_date: dateOf(paidAt, now()) }, now });
      if (res.outcome === 'granted') {
        await notify({ userId: sub.data().clientId, title: 'Sessions added',
          body: `${res.granted} sessions for this month have been added to your plan.` });
      }
      return res.outcome;
    }

    case 'invoice.payment_failed': {
      const invoice = await get(`/v1/invoices/${object.id}`);
      if (invoice.status === 'paid') return 'already_paid';
      const sub = await subscriptionBy(db, 'providerSubscriptionId', invoiceSubscriptionId(invoice), trainerId);
      if (!sub) return 'not_ours';
      const s = sub.data();
      if (FINISHED_STATUSES.includes(s.status)) return 'already_ended';
      await sub.ref.update({
        status: 'past_due',
        lastPaymentId: invoice.id,
        lastPaymentStatus: 'failed',
        paymentFailedAt: now().toISOString().slice(0, 10),
        lastError: 'invoice.payment_failed',
        updatedAt: now().toISOString(),
      });
      await notify({ userId: s.trainerId, title: 'Monthly plan payment failed',
        body: 'A client’s monthly payment did not go through. Open ElitePro to see who.' });
      await notify({ userId: s.clientId, title: 'Your payment didn’t go through',
        body: 'Your monthly plan payment failed. Please check your card or bank, or contact your coach.' });
      return 'past_due';
    }

    case 'customer.subscription.deleted': {
      const current = await get(`/v1/subscriptions/${object.id}`);
      if (current.status !== 'canceled') return 'not_cancelled';
      const sub = await subscriptionBy(db, 'providerSubscriptionId', current.id, trainerId);
      if (!sub) return 'not_ours';
      if (FINISHED_STATUSES.includes(sub.data().status)) return 'already_ended';
      await sub.ref.update({ status: 'cancelled', lastError: 'customer.subscription.deleted', updatedAt: now().toISOString() });
      return 'cancelled';
    }

    default:
      return 'ignored';
  }
}

// One delivery = one event. Recorded under its id once handled, so a redelivery is skipped;
// a failure is not recorded and the caller answers 500, so Stripe sends it again.
async function handleStripeWebhook({ db, event, keys, fetchImpl, now, notify }) {
  if (!event || typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]{6,64}$/.test(event.id)) return { outcome: 'malformed' };
  const seenRef = db.doc(`stripeEvents/${event.id}`);
  if ((await seenRef.get()).exists) return { outcome: 'duplicate' };
  const outcome = await processStripeEvent({ db, event, keys, fetchImpl, now, notify });
  try {
    await seenRef.create({
      outcome,
      type: String(event.type || ''),
      account: String(event.account || ''),
      processedAt: now().toISOString(),
    });
  } catch (err) {
    if (err.code !== ALREADY_EXISTS) throw err;
  }
  return { outcome };
}

module.exports = { processStripeEvent, handleStripeWebhook, invoiceSubscriptionId };
