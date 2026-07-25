/* global require, exports */
// CSRF protection for the GoCardless OAuth connect flow (functions/index.js
// gcOAuthStart / gcOAuthCallback). The GoCardless redirect back to
// gcOAuthCallback carries no Firebase ID token, so `state` is the only signal
// tying that request back to a specific trainer's own gcOAuthStart call —
// it must be an unguessable, single-use, short-lived, server-verified value,
// never just the trainerId itself (that would let anyone forge a state for
// any known trainer UID).
const crypto = require('crypto');
const { getFirestore } = require('firebase-admin/firestore');

const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function db() {
  return getFirestore();
}

// Called only by gcOAuthStart, which has verified Firebase Auth context —
// this is the one place a nonce is ever created, always bound to whichever
// trainerId the caller's own auth session belongs to.
async function createNonce(trainerId) {
  const nonce = crypto.randomBytes(32).toString('hex'); // 256 bits, crypto-secure
  const now = Date.now();
  await db().doc(`gcOAuthNonces/${nonce}`).set({
    trainerId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + NONCE_TTL_MS).toISOString(),
    used: false,
  });
  return nonce;
}

// Called only by gcOAuthCallback. Verifies all four conditions before
// trusting the trainerId it returns — missing any one is a rejection:
//   1. a nonce doc with this exact value exists at all (rules out forged/
//      guessed state values — infeasible against a 256-bit random nonce)
//   2. it has not expired (10-minute window)
//   3. it has not already been used (rules out replay of a captured state)
//   4. the trainerId it resolves to is still a real, current trainer (re-
//      checked by the caller against users/{trainerId} — this module only
//      returns what the nonce recorded, callback re-verifies identity)
//
// This CLAIMS the nonce (marks used: true) rather than deleting it — closing
// the replay race window immediately — but does NOT delete it yet. If the
// callback's downstream work (token exchange, Secret Manager write) then
// fails, call releaseNonce() to roll it back to unused so the trainer isn't
// stuck restarting the whole connect flow over an ElitePro-side failure that
// had nothing to do with them. Only finalizeNonce() (called once the whole
// flow actually succeeds) permanently removes it.
const NONCE_FORMAT = /^[0-9a-f]{64}$/;

async function consumeNonce(nonce) {
  // Reject anything that isn't exactly the 64-char hex format we generate
  // BEFORE it ever reaches a Firestore path — cheap, fails fast, and rules
  // out any weirdness from a crafted value containing '/' being interpreted
  // as extra path segments (defense in depth; the fixed 'gcOAuthNonces/'
  // prefix already means such a value can only ever address something
  // nested under this collection, never a sibling top-level collection, but
  // there's no reason to let a malformed value reach db.doc() at all).
  if (typeof nonce !== 'string' || !NONCE_FORMAT.test(nonce)) {
    return { ok: false, reason: 'not_found' };
  }
  const ref = db().doc(`gcOAuthNonces/${nonce}`);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, reason: 'not_found' };
    const data = snap.data();
    if (data.used) return { ok: false, reason: 'already_used' };
    if (new Date(data.expiresAt).getTime() < Date.now()) return { ok: false, reason: 'expired' };
    tx.update(ref, { used: true, claimedAt: new Date().toISOString() });
    return { ok: true, trainerId: data.trainerId };
  });
}

// Rolls a claimed nonce back to unused. Called only when gcOAuthCallback's
// downstream work fails after a successful consumeNonce() — an ElitePro-side
// failure (e.g. a Secret Manager write that fails even after retries) should
// not cost the trainer their whole connect attempt. No-op (silently ignored)
// if the nonce is missing/expired/format-invalid — releasing is best-effort
// cleanup, not something a caller should have to handle failing.
async function releaseNonce(nonce) {
  if (typeof nonce !== 'string' || !NONCE_FORMAT.test(nonce)) return;
  await db().doc(`gcOAuthNonces/${nonce}`)
    .update({ used: false, claimedAt: null })
    .catch(() => {});
}

// Permanently removes a nonce once the full connect flow it authorized has
// actually succeeded — true one-time use, now that it's been fully acted on.
async function finalizeNonce(nonce) {
  if (typeof nonce !== 'string' || !NONCE_FORMAT.test(nonce)) return;
  await db().doc(`gcOAuthNonces/${nonce}`).delete().catch(() => {});
}

exports.createNonce = createNonce;
exports.consumeNonce = consumeNonce;
exports.releaseNonce = releaseNonce;
exports.finalizeNonce = finalizeNonce;
