/* global exports */
// Why a GoCardless connect attempt failed, carried back to the app in the
// redirect URL so the trainer's toast can say what went wrong.
//
// Before this, five different failures in gcOAuthCallback all redirected to
// the same `?gc=error`, and the app showed one generic "connection failed".
// The only way to tell them apart was Cloud Logging — which on 2026-09-23
// meant Ani, on a phone, working through a logs console whose results list
// the mobile layout hides behind its own filter panel.
//
// Nothing secret goes in the URL: the reason is one of our own fixed codes,
// and `detail` is only ever GoCardless's standard OAuth error code
// (invalid_client, invalid_grant, …), never the response body.

const REASONS = new Set([
  'missing_params',
  'state_not_found',
  'state_already_used',
  'state_expired',
  'not_trainer',
  'token_exchange',
  'token_store',
]);

// OAuth error codes are lower_snake_case by spec (RFC 6749 §5.2). Anything
// else is dropped rather than echoed into a URL.
function oauthErrorCode(bodyText) {
  try {
    const code = JSON.parse(bodyText)?.error;
    return typeof code === 'string' && /^[a-z_]{1,40}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

function errorRedirectUrl(base, reason, detail) {
  const params = new URLSearchParams({ gc: 'error' });
  if (REASONS.has(reason)) params.set('reason', reason);
  if (detail && /^[a-z_]{1,40}$/.test(detail)) params.set('detail', detail);
  return `${base}?${params.toString()}`;
}

exports.REASONS = REASONS;
exports.oauthErrorCode = oauthErrorCode;
exports.errorRedirectUrl = errorRedirectUrl;
