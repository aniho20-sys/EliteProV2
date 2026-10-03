// A trainer connects their OWN GoCardless account (B36, Ani 2026-10-02: "捷徑").
//
// The partner-app route (OAuth, gcOAuthStart/gcOAuthCallback) needs GoCardless to approve
// ElitePro as a live partner first, with no published timeline. A merchant does not need
// anyone's approval to use their own account, so a trainer can instead paste two values
// from their own GoCardless dashboard into ElitePro once:
//   - an access token (Developers → API settings → Create access token, read-write);
//   - the secret of a webhook endpoint they create pointing at gcWebhook/<their uid>.
// Both go straight to Secret Manager. Nothing about either is ever written to Firestore.
//
// Which GoCardless they belong to (live or sandbox) is not taken from the token's look or
// from the trainer's say-so: the token is tried against each API, and only the one that
// accepts it decides. A live token cannot be stored as sandbox, or the reverse.

const { API_BASE, environmentOf } = require('./gcEnv');

class DirectConnectError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const TOKEN_RE = /^[A-Za-z0-9_-]{20,256}$/;
const SECRET_RE = /^\S{16,256}$/;

// Live first: a trainer using this route is almost always going live, and a sandbox
// token is refused by the live API (and the reverse) — never accepted by both.
const ORDER = ['live', 'sandbox'];

async function identifyToken({ fetchImpl, token }) {
  for (const environment of ORDER) {
    const res = await fetchImpl(`${API_BASE[environment]}/creditors`, {
      headers: { Authorization: `Bearer ${token}`, 'GoCardless-Version': '2015-07-06', Accept: 'application/json' },
    });
    if (res.status === 401 || res.status === 403) continue; // not this environment's token
    const text = await res.text();
    if (!res.ok) throw new DirectConnectError('unavailable', `GoCardless ${res.status}`);
    const creditor = (JSON.parse(text).creditors || [])[0];
    if (!creditor) throw new DirectConnectError('failed-precondition', 'No creditor on this account');
    return { environment, creditor };
  }
  throw new DirectConnectError('invalid-argument', 'GoCardless did not accept this access token');
}

async function connectDirect({ db, trainerId, accessToken, webhookSecret, fetchImpl, writeToken, writeWebhookSecret, now }) {
  const trainerSnap = await db.doc(`users/${trainerId}`).get();
  if (!trainerSnap.exists || trainerSnap.data().role !== 'trainer') {
    throw new DirectConnectError('permission-denied', 'Trainers only');
  }
  // Phones paste trailing spaces and newlines nobody can see (gcSecrets.readAppSecret).
  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  const secret = typeof webhookSecret === 'string' ? webhookSecret.trim() : '';
  if (!TOKEN_RE.test(token)) throw new DirectConnectError('invalid-argument', 'That does not look like an access token');
  if (!SECRET_RE.test(secret)) throw new DirectConnectError('invalid-argument', 'That does not look like a webhook secret');

  const { environment, creditor } = await identifyToken({ fetchImpl, token });

  await writeToken(trainerId, token);
  await writeWebhookSecret(trainerId, secret);
  await db.doc(`paymentConnections/${trainerId}`).set({
    trainerId,
    provider: 'gocardless',
    mode: 'direct',
    environment,
    providerAccountId: creditor.id || null,
    creditorName: creditor.name || null,
    // GoCardless will not pay out to an unverified creditor; the app says so.
    verificationStatus: creditor.verification_status || null,
    status: 'connected',
    connectedAt: now().toISOString(),
  });
  // Readable by this trainer's clients (their coach's profile), so the plan card can say
  // "test mode" only when it is — a client must never be told no real money is taken
  // while it is. Written only here and by the OAuth callback; cleared on disconnect.
  await db.doc(`users/${trainerId}`).update({ gcEnvironment: environment });

  // Going live retires the trainer's leftover sandbox plans. They took no money, cannot be
  // reached any more (the sandbox token was just replaced), and left in place one would
  // keep a client's card showing a test plan and refusing a real one ("already subscribed").
  // Only in this direction: connecting a sandbox token never touches a live plan, which
  // may still be collecting real money at GoCardless.
  let retiredSandboxPlans = 0;
  if (environment === 'live') {
    const plans = await db.collection('subscriptions').where('trainerId', '==', trainerId).get();
    const ts = now().toISOString();
    for (const d of plans.docs) {
      const p = d.data();
      if (environmentOf(p) !== 'sandbox' || ['cancelled', 'abandoned', 'failed'].includes(p.status)) continue;
      await d.ref.update({ status: 'abandoned', lastError: 'sandbox plan retired when GoCardless went live', updatedAt: ts });
      retiredSandboxPlans++;
    }
  }
  return {
    environment,
    retiredSandboxPlans,
    creditorName: creditor.name || null,
    verificationStatus: creditor.verification_status || null,
  };
}

// GoCardless verifies a new account some time after it is connected. The status saved at
// connect time would otherwise say "still verifying" for ever, so the Profile page asks
// for a fresh one while it is not yet 'successful'. Reads only; never touches the token
// beyond using it, and a failure leaves the saved status as it was.
async function refreshDirectStatus({ db, trainerId, readToken, fetchImpl }) {
  const ref = db.doc(`paymentConnections/${trainerId}`);
  const snap = await ref.get();
  const conn = snap.exists ? snap.data() : null;
  if (!conn || conn.mode !== 'direct' || conn.status !== 'connected') return { verificationStatus: null };
  if (conn.verificationStatus === 'successful') return { verificationStatus: 'successful' };
  const token = await readToken(trainerId);
  const res = await fetchImpl(`${API_BASE[environmentOf(conn)]}/creditors`, {
    headers: { Authorization: `Bearer ${token}`, 'GoCardless-Version': '2015-07-06', Accept: 'application/json' },
  });
  if (!res.ok) return { verificationStatus: conn.verificationStatus || null };
  const creditor = (JSON.parse(await res.text()).creditors || [])[0];
  const verificationStatus = (creditor && creditor.verification_status) || conn.verificationStatus || null;
  if (verificationStatus !== conn.verificationStatus) await ref.update({ verificationStatus });
  return { verificationStatus };
}

module.exports = { connectDirect, identifyToken, refreshDirectStatus, DirectConnectError };
