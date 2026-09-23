// What to tell a trainer when GoCardless sends them back with ?gc=error.
//
// gcOAuthCallback now says WHY in the redirect (functions/gcOAuthErrors.js):
// a fixed `reason` of our own, plus GoCardless's standard OAuth error code as
// `detail` when the token exchange is what failed. Each maps to a sentence
// that points at the thing to fix — before, all five failures produced the
// same "connection failed", and finding out which one meant reading Cloud
// Logging on a phone.
//
// A switch of literal t() calls because t() only accepts a literal key.
export function gcFailureMessage(t, reason, detail) {
  switch (reason) {
    case 'token_exchange':
      if (detail === 'invalid_client') return t('profile.gc_err_invalid_client');
      if (detail === 'invalid_grant') return t('profile.gc_err_invalid_grant');
      return detail
        ? t('profile.gc_err_token_detail', { detail })
        : t('profile.gc_err_token');
    case 'state_expired':
      return t('profile.gc_err_expired');
    case 'state_already_used':
    case 'state_not_found':
      return t('profile.gc_err_stale_link');
    case 'not_trainer':
      return t('profile.gc_err_not_trainer');
    case 'token_store':
      return t('profile.gc_err_store');
    default:
      return t('profile.toast_gc_failed');
  }
}
