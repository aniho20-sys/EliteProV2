// What the app is allowed to tell someone after asking Firebase for a reset email.
//
// Firebase enables "email enumeration protection" by default on every project created on
// or after 2023-09-15, and elitepro-16718 is one of them. With it on,
// sendPasswordResetEmail() RESOLVES SUCCESSFULLY for an address that has no account, and
// sends nothing — there is no error to catch and no way for the client to tell the two
// cases apart.
//
// So "Password reset email sent to you@example.com", which is what this app used to say,
// is a claim it cannot substantiate. A student who mistypes their address, or who signed
// up with Google under a different one, is told it worked and then waits for an email that
// was never sent. That is the exact report from 2026-08-22.
//
// https://docs.cloud.google.com/identity-platform/docs/admin/email-enumeration-protection

// `accountKnown` is true only where the app already knows the address belongs to a real
// account — Profile, where it is the signed-in user's own. There the promise is safe.
// Naming the sender is not decoration. On 2026-08-23 a student did receive the reset
// email and never found it, because Firebase sends from a noreply@ address whose display
// name is the project id, not "ElitePro" — so it did not look like anything they had
// asked for. Telling people what to search for is the part that actually gets them back
// into their account. Deliberately does not quote the exact address: the sender name is a
// Firebase Console setting and this copy must not go stale the day it changes.
const WHERE_TO_LOOK = 'It can take a few minutes. Check your spam folder, and search for "password reset" — the sender may not say ElitePro.';

export const passwordResetNotice = (email, { accountKnown = false } = {}) => (
  accountKnown
    ? `Password reset email sent to ${email}. ${WHERE_TO_LOOK}`
    : `If an account exists for ${email}, a reset link is on its way. ${WHERE_TO_LOOK} If nothing arrives, the address may be different from the one you signed up with.`
);

// Reset-specific failures worth naming separately. Everything else falls through to the
// shared friendlyAuthError map.
const RESET_ERRORS = {
  // The daily limit on Firebase-sent emails. Distinct from too-many-requests, which is
  // per-caller rate limiting — this one means nobody can get an email until it resets.
  'auth/quota-exceeded': 'Too many reset emails have been sent today. Please try again tomorrow, or ask your coach to reach you another way.',
  'auth/too-many-requests': 'Too many attempts from this device. Please wait a few minutes and try again.',
  'auth/invalid-email': 'That does not look like a valid email address.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/network-request-failed': 'No connection. Check your internet and try again — nothing has been sent yet.',
  // Only reachable on projects with enumeration protection off; kept so those projects
  // still say something useful.
  'auth/user-not-found': 'No account uses that email address. Check the spelling, or try the address you signed up with.',
};

export const passwordResetError = (err) => RESET_ERRORS[err?.code] || null;
