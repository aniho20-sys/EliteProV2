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
// One-time use: a successful consume deletes the doc in the same
// transaction, so a second attempt with the same nonce hits case 1 (gone)
// rather than case 3 — either way, reuse is rejected.
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
    tx.delete(ref);
    return { ok: true, trainerId: data.trainerId };
  });
}

exports.createNonce = createNonce;
exports.consumeNonce = consumeNonce;
