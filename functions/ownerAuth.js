/* global exports */
// Who counts as the platform owner for the owner-only callables (Platform Stats,
// signup exclusions, account audit, test-account cleanup, account lookup).
//
// The email alone is not enough. Firebase Auth puts whatever address an account
// signed up with into the token, verified or not, so without `email_verified` the
// check trusts an address nobody proved they own. The owner signs in with Google,
// whose tokens always carry email_verified: true for a Gmail address (Ani confirmed
// Google sign-in, 2026-09-27) — so this adds the proof without locking her out.
// Same condition as the platformEvents rule in firestore.rules; keep them in step.

const OWNER_EMAIL = 'aniho20@gmail.com';

function isOwnerToken(token) {
  return !!token
    && token.email_verified === true
    && typeof token.email === 'string'
    && token.email.toLowerCase() === OWNER_EMAIL;
}

exports.OWNER_EMAIL = OWNER_EMAIL;
exports.isOwnerToken = isOwnerToken;
