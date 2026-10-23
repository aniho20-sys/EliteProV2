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

// The owner's profile, for sending the owner alerts (new trainer signups, error reports).
// Found through Firebase Auth, which holds exactly one account per address and knows
// whether it is verified — never through users.email, which an account writes itself: that
// used to let any account that put the owner's address on its profile, and whose id sorted
// first, receive the owner's alerts (audit 2026-10-23).
async function findOwnerProfile({ db, auth }) {
  let user;
  try {
    user = await auth.getUserByEmail(OWNER_EMAIL);
  } catch {
    return null; // no such account (yet)
  }
  if (!user || user.emailVerified !== true) return null;
  const snap = await db.doc(`users/${user.uid}`).get();
  return snap.exists ? snap : null;
}

exports.OWNER_EMAIL = OWNER_EMAIL;
exports.findOwnerProfile = findOwnerProfile;
exports.isOwnerToken = isOwnerToken;
