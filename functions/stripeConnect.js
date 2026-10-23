// Stripe setup (B49, reports/stripe-subscription-design.md §3):
//
//   saveStripeKeys     — Ani, once: ElitePro's platform secret key + webhook secret.
//   startConnect       — a coach: create (or reuse) their own Stripe account and hand back
//                        Stripe's onboarding page. The coach fills in their details there,
//                        on Stripe, never in ElitePro.
//   refreshConnection  — re-read the coach's account from Stripe: only `charges_enabled`
//                        makes it "connected". Also run by the account.updated webhook.
//
// The coach's account is created with the `controller` settings that mean "their own
// account": the full Stripe dashboard, Stripe fees paid by the account, losses handled by
// Stripe, identity checks collected by Stripe (`type` is deprecated for this).

const { FINISHED_STATUSES } = require('./gcSubscriptions');
const { stripeRequest, StripeApiError, keyEnvironment, describeStripeError } = require('./stripeApi');

// Where a coach can be. Each needs Stripe in that country and a currency the app offers.
// More can be added; Stripe decides what it supports, not this list's absence.
const COUNTRIES = { GB: 'GBP', HK: 'HKD' };

class StripeSetupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StripeSetupError';
    this.code = code;
  }
}

const SECRET_KEY_RE = /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{10,250}$/;
const WEBHOOK_SECRET_RE = /^whsec_[A-Za-z0-9+/=]{10,250}$/;

// Ani pastes these from a phone; copy-paste drags in spaces and newlines nothing shows.
const clean = (v) => String(v || '').trim();

async function saveStripeKeys({ secretKey, webhookSecret, fetchImpl, writeKeys }) {
  secretKey = clean(secretKey);
  webhookSecret = clean(webhookSecret);
  if (!SECRET_KEY_RE.test(secretKey)) throw new StripeSetupError('invalid-argument', 'That does not look like a Stripe secret key');
  if (!WEBHOOK_SECRET_RE.test(webhookSecret)) throw new StripeSetupError('invalid-argument', 'That does not look like a Stripe webhook signing secret');

  // Stripe itself says whether the key works and whether it is live — the name alone is
  // only trusted once it agrees with that answer.
  let balance;
  try {
    balance = await stripeRequest({ fetchImpl, secretKey, path: '/v1/balance' });
  } catch (err) {
    if (err instanceof StripeApiError && (err.status === 401 || err.status === 403)) {
      throw new StripeSetupError('invalid-argument', 'Stripe did not accept that key');
    }
    throw new StripeSetupError('unavailable', 'Could not reach Stripe');
  }
  const environment = balance && balance.livemode === true ? 'live' : 'sandbox';
  if (environment !== keyEnvironment(secretKey)) {
    throw new StripeSetupError('invalid-argument', 'That key is not what its name says');
  }
  await writeKeys({ secretKey, webhookSecret });
  return { environment };
}

async function requireTrainer(db, trainerId) {
  const snap = await db.doc(`users/${trainerId}`).get();
  const trainer = snap.exists ? snap.data() : null;
  if (!trainer || trainer.role !== 'trainer') throw new StripeSetupError('permission-denied', 'Trainers only');
  return trainer;
}

async function startConnect({ db, trainerId, country, keys, fetchImpl, now, returnUrl, refreshUrl }) {
  const trainer = await requireTrainer(db, trainerId);
  if (!keys) throw new StripeSetupError('failed-precondition', 'Stripe is not set up yet');
  const environment = keyEnvironment(keys.secretKey);

  const connRef = db.doc(`paymentConnections/${trainerId}`);
  const connSnap = await connRef.get();
  const existing = (connSnap.exists && connSnap.data().stripe) || null;

  // An account made with the test key does not exist for the live key (and the other way
  // round), so a coach who connected while ElitePro was in test mode starts again.
  let accountId = existing && existing.environment === environment ? existing.accountId : null;
  let accountCountry = existing && existing.environment === environment ? existing.country : null;

  if (!accountId) {
    country = String(country || '').toUpperCase();
    if (!COUNTRIES[country]) throw new StripeSetupError('invalid-argument', 'Unsupported country');
    try {
      const account = await stripeRequest({
        fetchImpl, secretKey: keys.secretKey, method: 'POST', path: '/v1/accounts',
        // One account per coach, country and environment, even if the request is repeated.
        idempotencyKey: `acct-${trainerId}-${country}-${environment}`,
        params: {
          country,
          email: trainer.email || undefined,
          controller: {
            stripe_dashboard: { type: 'full' },
            fees: { payer: 'account' },
            losses: { payments: 'stripe' },
            requirement_collection: 'stripe',
          },
          metadata: { trainer_id: trainerId },
        },
      });
      accountId = account.id;
      accountCountry = account.country || country;
    } catch (err) {
      throw new StripeSetupError('unavailable', `Stripe did not create the account (${describeStripeError(err)})`);
    }
    await connRef.set({
      trainerId,
      stripe: {
        accountId, country: accountCountry, environment, status: 'onboarding',
        chargesEnabled: false, detailsSubmitted: false, createdAt: now().toISOString(),
      },
    }, { merge: true });
  }

  try {
    const link = await stripeRequest({
      fetchImpl, secretKey: keys.secretKey, method: 'POST', path: '/v1/account_links',
      params: { account: accountId, type: 'account_onboarding', return_url: returnUrl, refresh_url: refreshUrl },
    });
    return { url: link.url };
  } catch (err) {
    throw new StripeSetupError('unavailable', `Stripe did not open onboarding (${describeStripeError(err)})`);
  }
}

// Re-reads the account from Stripe and records what it says. `charges_enabled` is the
// only thing that makes a coach able to take plans; everything else is for display.
async function refreshConnection({ db, trainerId, keys, fetchImpl, now }) {
  if (!keys) throw new StripeSetupError('failed-precondition', 'Stripe is not set up yet');
  const userRef = db.doc(`users/${trainerId}`);
  const userSnap = await userRef.get();
  // Trainers only — and never re-create the profile of an account that has been deleted.
  if (!userSnap.exists || userSnap.data().role !== 'trainer') return { status: 'none' };
  const connRef = db.doc(`paymentConnections/${trainerId}`);
  const snap = await connRef.get();
  const stripe = snap.exists ? snap.data().stripe : null;
  if (!stripe || !stripe.accountId) return { status: 'none' };
  if (stripe.environment !== keyEnvironment(keys.secretKey)) {
    // Made with the other mode's key (e.g. a test account after ElitePro went live): it can
    // take no plans now, so the coach's clients must stop being offered one.
    if (userSnap.data().stripeEnvironment) await userRef.update({ stripeEnvironment: null });
    return { status: 'none' };
  }
  if (stripe.status === 'disconnected') return { status: 'disconnected' };

  const account = await stripeRequest({ fetchImpl, secretKey: keys.secretKey, path: `/v1/accounts/${stripe.accountId}` });
  const chargesEnabled = account.charges_enabled === true;
  const status = chargesEnabled ? 'connected' : 'onboarding';
  const caps = account.capabilities || {};
  await connRef.set({
    stripe: {
      ...stripe,
      status,
      chargesEnabled,
      detailsSubmitted: account.details_submitted === true,
      country: account.country || stripe.country,
      defaultCurrency: account.default_currency ? String(account.default_currency).toUpperCase() : null,
      // Bacs Direct Debit is offered only once Stripe has switched it on for this account.
      bacsEnabled: caps.bacs_debit_payments === 'active',
      checkedAt: now().toISOString(),
    },
  }, { merge: true });
  // Read by the coach's clients (they cannot read paymentConnections) to show the plan card
  // and say "test mode" only when it is. Set once the coach can take payments, and kept if
  // Stripe later pauses them: clients with a plan must still see it, and a new plan is
  // refused server-side anyway (connectionFor). Server-written; not in the self-update allowlist.
  if (chargesEnabled && userSnap.data().stripeEnvironment !== stripe.environment) {
    await userRef.update({ stripeEnvironment: stripe.environment });
  }
  return { status, chargesEnabled };
}

// The coach disconnected their account from ElitePro in their own Stripe dashboard
// (account.application.deauthorized). ElitePro can no longer act on it: new plans stop, and
// the coach's clients are no longer offered one.
//
// ElitePro can no longer reach the coach's Stripe account, so it cannot cancel their clients'
// plans there — those go on charging until the coach cancels them in their own dashboard.
// Here they are marked ended (no more sessions would arrive anyway: the events stop) and
// returned, so the coach can be told how many to cancel (audit 2026-10-23).
async function markDisconnected({ db, trainerId, now }) {
  const ts = now().toISOString();
  await db.doc(`paymentConnections/${trainerId}`).set({
    stripe: { status: 'disconnected', chargesEnabled: false, disconnectedAt: ts },
  }, { merge: true });
  const userRef = db.doc(`users/${trainerId}`);
  const userSnap = await userRef.get();
  if (userSnap.exists && userSnap.data().stripeEnvironment) await userRef.update({ stripeEnvironment: null });
  const plans = await db.collection('subscriptions').where('trainerId', '==', trainerId).get();
  const stillCharging = plans.docs.filter(d => d.data().provider === 'stripe' && !FINISHED_STATUSES.includes(d.data().status));
  for (const d of stillCharging) {
    await d.ref.update({ status: 'cancelled', cancelReason: 'coach_disconnected', cancelledAt: ts, updatedAt: ts });
  }
  return { endedPlans: stillCharging.map(d => d.data()) };
}

// The one coach whose Stripe account this is, or null — never a guess when it is ambiguous.
async function trainerForAccount(db, accountId) {
  if (typeof accountId !== 'string' || !/^acct_[A-Za-z0-9]{6,64}$/.test(accountId)) return null;
  const snap = await db.collection('paymentConnections').where('stripe.accountId', '==', accountId).limit(2).get();
  return snap.size === 1 ? snap.docs[0].id : null;
}

module.exports = { COUNTRIES, StripeSetupError, saveStripeKeys, startConnect, refreshConnection, markDisconnected, trainerForAccount };
