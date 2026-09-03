// Firebase Auth and password-reset messages.
//
// These used to be plain English string maps in utils/authErrors.js and
// utils/passwordReset.js. They could not simply be pointed at t(), because t() refuses a
// variable key — the same rule that stops an exercise name being looked up as a
// translation (CLAUDE.md #39). Handing it `err.code` would be exactly that.
//
// So the map is built by a factory that RECEIVES t and calls it with literal keys, one per
// error. Verbose, and deliberately so: every message a user can see is visible here as a
// key, and the lint rule stays intact. Taking t as an argument also keeps this file pure —
// authMessages.test.js exercises it with a real dictionary and no React.

// The user closed the popup, or a second popup superseded the first. Neither is a failure
// worth a red banner; both are the user doing what they meant to do.
export const SILENT_AUTH_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

export function buildAuthMessages(t) {
  const AUTH_ERRORS = {
    'auth/user-not-found': t('err.user_not_found'),
    'auth/wrong-password': t('err.wrong_password'),
    'auth/invalid-credential': t('err.invalid_credential'),
    'auth/invalid-login-credentials': t('err.invalid_credential'),
    'auth/email-already-in-use': t('err.email_in_use'),
    'auth/weak-password': t('err.weak_password'),
    'auth/invalid-email': t('err.invalid_email'),
    'auth/missing-email': t('err.missing_email'),
    'auth/too-many-requests': t('err.too_many_requests'),
    'auth/network-request-failed': t('err.network'),
    'auth/requires-recent-login': t('err.requires_recent_login'),
    'auth/user-disabled': t('err.user_disabled'),
    'auth/operation-not-allowed': t('err.operation_not_allowed'),
    'auth/unauthorized-domain': t('err.unauthorized_domain'),
    'auth/internal-error': t('err.internal'),
    'auth/popup-blocked': t('err.popup_blocked'),
    'auth/web-storage-unsupported': t('err.web_storage'),
  };

  // Reset-specific failures worth naming separately from the generic auth map above.
  const RESET_ERRORS = {
    // The daily limit on Firebase-sent emails. Distinct from too-many-requests, which is
    // per-caller rate limiting — this one means nobody gets an email until it resets.
    'auth/quota-exceeded': t('reset.err_quota'),
    'auth/too-many-requests': t('reset.err_too_many'),
    'auth/invalid-email': t('reset.err_invalid_email'),
    'auth/missing-email': t('reset.err_missing_email'),
    'auth/network-request-failed': t('reset.err_network'),
    // Only reachable on projects with enumeration protection off; kept so those still say
    // something useful.
    'auth/user-not-found': t('reset.err_user_not_found'),
  };

  return {
    // Returns null for the silent codes, so callers can tell "nothing to say" apart from
    // "no message found". Unrecognised codes keep the raw code appended, which is how a
    // new Firebase error gets diagnosed at all.
    authError(err, fallback) {
      const code = err?.code;
      if (SILENT_AUTH_CODES.includes(code)) return null;
      const mapped = AUTH_ERRORS[code];
      if (mapped) return mapped;
      const base = fallback ?? t('err.generic');
      return code ? `${base} (${code})` : base;
    },

    // What the app is allowed to claim after asking Firebase for a reset email.
    //
    // Firebase enables email enumeration protection by default on every project created on
    // or after 2023-09-15, and elitepro-16718 is one. With it on, sendPasswordResetEmail()
    // RESOLVES for an address with no account and sends nothing — there is no error to
    // catch and no way for the client to tell the two apart. So "sent" is a claim the app
    // cannot support unless it already knows the address exists, which it only does on
    // Profile, where it is the signed-in user's own.
    //
    // Naming what to search for is not decoration. On 2026-08-23 a student did receive the
    // email and never found it, because Firebase sends from a noreply@ address whose
    // display name is the project id rather than ElitePro.
    resetNotice(email, { accountKnown = false } = {}) {
      const where = t('reset.where_to_look');
      return accountKnown
        ? t('reset.sent', { email, where })
        : t('reset.maybe_sent', { email, where });
    },

    resetError(err) {
      return RESET_ERRORS[err?.code] || null;
    },
  };
}
