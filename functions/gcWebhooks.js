// GoCardless webhooks — Phase 3 Step 4 (reports/phase3-subscription-design.md §3, §4, §8).
//
// GoCardless tells us, by POSTing events to gcWebhook (index.js), when a monthly payment
// has been collected, has failed, or when a subscription or mandate has ended. This file
// decides what each event means for ElitePro:
//
//   payment confirmed      → the month's sessions are added to the client's credit
//   payment failed / charged back → the plan is marked past due; trainer and client told
//   subscription cancelled / finished, mandate cancelled / failed / expired → plan cancelled
//
// Nothing in an event is taken on trust beyond "look this up": the signature proves it
// came from GoCardless, and the payment itself is then fetched from GoCardless with the
// trainer's own token before any session is granted. Events are delivered at least once,
// so every effect is idempotent — a grant is keyed on the payment id and can only be
// written once.

const crypto = require('crypto');
const { apiBase, connectionEnvironment } = require('./gcEnv');

const ALREADY_EXISTS = 6;

// HMAC-SHA256 of the raw body, hex, keyed with the endpoint secret, in Webhook-Signature.
// The raw bytes, never re-serialised JSON: a single re-ordered key breaks the digest.
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature).trim(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 'YYYY-MM-DD' + n months, then the day before: the last day of a monthly period that
// starts on `start`. Month ends are clamped (31 Jan → period ends 27/28 Feb, next starts
// on the payment's own charge date, which GoCardless decides).
function periodEnd(start) {
  const [y, m, d] = start.split('-').map(Number);
  const next = new Date(Date.UTC(y, m, 1)); // first day of the following month
  const lastDayOfNext = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(d, lastDayOfNext));
  next.setUTCDate(next.getUTCDate() - 1);
  return next.toISOString().slice(0, 10);
}

// Roll-over at the end of a period (design §4, Ani's rule: unused sessions carry over, up
// to half the monthly quota; the rest is forfeited).
//
// The design doc wrote this as "grant = tier + rolloverBanked". That double-counts: the
// client's credit is a running balance (totalSessions − sessionOffset), so last month's
// unused sessions are already in it. What the rule actually changes is how much of that
// leftover survives. So each new payment adds the tier, and takes back whatever of last
// period's allowance went unused beyond the cap.
function rollover({ tier, carriedIn, used }) {
  const allowance = tier + carriedIn;
  const unused = Math.max(0, allowance - used);
  const cap = Math.floor(tier / 2);
  const kept = Math.min(unused, cap);
  return { allowance, unused, kept, forfeit: unused - kept };
}

async function trainerForOrganisation(db, organisationId) {
  if (!organisationId) return null;
  const snap = await db.collection('paymentConnections').where('providerAccountId', '==', organisationId).limit(2).get();
  if (snap.size !== 1) return null; // none, or ambiguous — never guess whose money it is
  return snap.docs[0].id;
}

async function subscriptionBy(db, field, value, trainerId) {
  if (!value) return null;
  const snap = await db.collection('subscriptions').where(field, '==', value).limit(5).get();
  // Tenant isolation: an event from trainer A's GoCardless account can only ever touch
  // trainer A's subscriptions, whatever ids it carries.
  const mine = snap.docs.filter(d => d.data().trainerId === trainerId);
  return mine.length === 1 ? mine[0] : null;
}

async function gcGet({ fetchImpl, token, environment, path }) {
  const res = await fetchImpl(`${apiBase(environment)}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'GoCardless-Version': '2015-07-06', Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`GoCardless ${res.status} on ${path}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

const SESSIONS_FORFEIT = 'subscription_rollover_forfeit';

async function grantForPayment({ db, sub, payment, now }) {
  const s = sub.data();
  const subRef = sub.ref;
  const clientRef = db.doc(`users/${s.clientId}`);
  const grantRef = db.doc(`creditLedger/subpay-${payment.id}`);
  const forfeitRef = db.doc(`creditLedger/subforfeit-${payment.id}`);
  const start = payment.charge_date || now().toISOString().slice(0, 10);
  const end = periodEnd(start);

  return db.runTransaction(async (tx) => {
    const [grantSnap, subSnap, clientSnap] = await Promise.all([tx.get(grantRef), tx.get(subRef), tx.get(clientRef)]);
    if (grantSnap.exists) return { outcome: 'duplicate' };
    if (!clientSnap.exists) return { outcome: 'client_missing' };
    const cur = subSnap.data();
    const client = clientSnap.data();

    // What was used in the period that just ended. Sessions booked with this coach, not
    // cancelled — the same thing the credit logic charges for. Single-field query (#34).
    let forfeit = 0;
    let kept = 0;
    if (cur.currentPeriodStart && cur.currentPeriodEnd) {
      const sessions = await tx.get(db.collection('schedule').where('clientId', '==', s.clientId));
      const used = sessions.docs.map(d => d.data()).filter(x => x.trainerId === s.trainerId
        && !x.isBlocked && x.status !== 'cancelled'
        && x.date >= cur.currentPeriodStart && x.date <= cur.currentPeriodEnd).length;
      ({ forfeit, kept } = rollover({ tier: s.tier, carriedIn: cur.rolloverBanked || 0, used }));
      // Never take back more than the client actually holds — pack sessions bought
      // separately are theirs, and a negative balance here would be an invented debt.
      const remaining = (client.totalSessions || 0) - (client.sessionOffset || 0);
      forfeit = Math.max(0, Math.min(forfeit, remaining));
    }

    const at = now().toISOString();
    const base = { clientId: s.clientId, trainerId: s.trainerId, date: start, subscriptionId: subRef.id, paymentId: payment.id, addedBy: 'subscription' };
    tx.create(grantRef, { ...base, type: 'subscription', qty: s.tier, rate: s.ratePerSession ?? null });
    if (forfeit > 0) tx.create(forfeitRef, { ...base, type: SESSIONS_FORFEIT, qty: -forfeit, rate: null });
    tx.update(clientRef, {
      totalSessions: (client.totalSessions || 0) + s.tier - forfeit,
      // Same as a manual top-up (addCreditLedgerEntry): the renewal prompts start over.
      renewalPrompt3Shown: false,
      renewalPrompt1Shown: false,
      renewalPromptSnoozedUntil: null,
    });
    tx.update(subRef, {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      rolloverBanked: kept,
      lastPaymentId: payment.id,
      lastPaymentStatus: 'confirmed',
      paymentFailedAt: null,
      ...(cur.status === 'past_due' ? { status: 'active' } : {}),
      updatedAt: at,
    });
    return { outcome: 'granted', granted: s.tier, forfeit };
  });
}

const FINISHED = ['cancelled', 'abandoned', 'failed'];

// One event. Returns a short outcome for the audit record; throws only for failures worth
// a GoCardless retry (our side unavailable), never for events we simply do not act on.
//
// Whose event it is comes from one of two places, never from both:
//   - the partner app's endpoint: links.organisation, mapped to the one trainer connected
//     to that GoCardless organisation;
//   - a trainer's own endpoint (gcWebhook/<uid>, B36): `trainerId`, already proven by the
//     signature — only that trainer's GoCardless account holds the secret it was signed
//     with. links.organisation is then not consulted at all.
async function processEvent({ db, event, readToken, fetchImpl, now, notify, trainerId: provenTrainerId }) {
  const links = event.links || {};
  const trainerId = provenTrainerId || await trainerForOrganisation(db, links.organisation);
  if (!trainerId) return 'unknown_organisation';
  const kind = `${event.resource_type}.${event.action}`;

  if (event.resource_type === 'payments' && ['confirmed', 'failed', 'charged_back'].includes(event.action)) {
    const token = await readToken(trainerId); // a failure here is retried
    const environment = await connectionEnvironment(db, trainerId);
    const payment = (await gcGet({ fetchImpl, token, environment, path: `/payments/${links.payment}` })).payments;
    const sub = await subscriptionBy(db, 'providerSubscriptionId', payment.links && payment.links.subscription, trainerId);
    if (!sub) return 'not_ours';

    if (event.action === 'confirmed') {
      // The event says confirmed; GoCardless's own record must agree before sessions move.
      if (!['confirmed', 'paid_out'].includes(payment.status)) return 'not_confirmed';
      const res = await grantForPayment({ db, sub, payment, now });
      if (res.outcome === 'granted') {
        await notify({ userId: sub.data().clientId, title: 'Sessions added',
          body: `${res.granted} sessions for this month have been added to your plan.` });
      }
      return res.outcome;
    }

    // failed / charged_back: tell both sides now (design §8). No sessions are clawed
    // back automatically — a charge-back after a grant is for the trainer to settle.
    const cause = (event.details && (event.details.cause || event.details.description)) || event.action;
    await sub.ref.update({
      status: 'past_due',
      lastPaymentId: payment.id,
      lastPaymentStatus: 'failed',
      paymentFailedAt: now().toISOString().slice(0, 10),
      lastError: `payment ${event.action}: ${String(cause).slice(0, 200)}`,
      updatedAt: now().toISOString(),
    });
    const s = sub.data();
    await notify({ userId: s.trainerId, title: 'Monthly plan payment failed',
      body: 'A client’s Direct Debit did not go through. Open ElitePro to see who.' });
    await notify({ userId: s.clientId, title: 'Your payment didn’t go through',
      body: 'Your monthly plan payment failed. Please check your bank or contact your coach.' });
    return `past_due:${event.action}`;
  }

  const ends = {
    'subscriptions.cancelled': ['providerSubscriptionId', links.subscription],
    'subscriptions.finished': ['providerSubscriptionId', links.subscription],
    'mandates.cancelled': ['providerAuthorisationId', links.mandate],
    'mandates.failed': ['providerAuthorisationId', links.mandate],
    'mandates.expired': ['providerAuthorisationId', links.mandate],
  };
  if (ends[kind]) {
    const [field, value] = ends[kind];
    const sub = await subscriptionBy(db, field, value, trainerId);
    if (!sub) return 'not_ours';
    if (FINISHED.includes(sub.data().status)) return 'already_ended';
    const cause = (event.details && event.details.cause) || event.action;
    await sub.ref.update({ status: 'cancelled', lastError: `${kind}: ${String(cause).slice(0, 200)}`, updatedAt: now().toISOString() });
    return 'cancelled';
  }

  return 'ignored';
}

// The whole webhook body. Each event is recorded under its GoCardless id, so a redelivery
// of one already processed is skipped; one that failed is not recorded, and GoCardless
// retries it. Returns { failed } — any failure means "please send this again".
async function handleWebhook({ db, body, readToken, fetchImpl, now, notify, trainerId }) {
  const events = Array.isArray(body && body.events) ? body.events : [];
  let failed = 0;
  for (const event of events) {
    if (!event || typeof event.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(event.id)) continue;
    const seenRef = db.doc(`gcEvents/${event.id}`);
    if ((await seenRef.get()).exists) continue;
    try {
      const outcome = await processEvent({ db, event, readToken, fetchImpl, now, notify, trainerId });
      try {
        await seenRef.create({
          outcome,
          resourceType: String(event.resource_type || ''),
          action: String(event.action || ''),
          organisation: String((event.links && event.links.organisation) || ''),
          processedAt: now().toISOString(),
        });
      } catch (err) {
        if (err.code !== ALREADY_EXISTS) throw err; // a concurrent delivery got there first
      }
    } catch (err) {
      failed++;
      console.error(`[gcWebhook] event ${event.id} ${event.resource_type}.${event.action} failed`, err.message);
    }
  }
  return { processed: events.length - failed, failed };
}

// gcWebhook is reached two ways: at its bare URL by the partner app, and at
// gcWebhook/<trainer uid> by a trainer's own GoCardless account (B36). Returns
// { trainerId: null } for the bare URL, { trainerId } for a well-formed uid, and
// { invalid: true } for anything else — which is refused, not treated as the bare URL.
function webhookRoute(path) {
  const p = String(path || '/').replace(/\/+$/, '');
  if (p === '') return { trainerId: null };
  const m = p.match(/^\/([A-Za-z0-9]{10,128})$/);
  return m ? { trainerId: m[1] } : { invalid: true };
}

module.exports = { webhookRoute, verifyWebhookSignature, periodEnd, rollover, processEvent, handleWebhook, SESSIONS_FORFEIT };
