/* global describe, test, expect */
const { errorRedirectUrl, oauthErrorCode } = require('../gcOAuthErrors');

const BASE = 'https://elitepro-16718.web.app/#/profile';

describe('errorRedirectUrl', () => {
  test('carries a known reason and an OAuth error code', () => {
    expect(errorRedirectUrl(BASE, 'token_exchange', 'invalid_client'))
      .toBe(`${BASE}?gc=error&reason=token_exchange&detail=invalid_client`);
  });

  test('every nonce rejection the store can return maps to a known reason', () => {
    for (const r of ['not_found', 'already_used', 'expired']) {
      expect(errorRedirectUrl(BASE, `state_${r}`)).toBe(`${BASE}?gc=error&reason=state_${r}`);
    }
  });

  test('an unknown reason is dropped, not echoed', () => {
    expect(errorRedirectUrl(BASE, 'whatever')).toBe(`${BASE}?gc=error`);
  });

  test('detail that is not an OAuth-shaped code never reaches the URL', () => {
    expect(errorRedirectUrl(BASE, 'token_exchange', 'secret=abc&x=1'))
      .toBe(`${BASE}?gc=error&reason=token_exchange`);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: only GoCardless's error CODE leaves the server, never its body.
// ---------------------------------------------------------------------------
describe('GUARDIAN: oauthErrorCode', () => {
  test('extracts the standard code', () => {
    expect(oauthErrorCode('{"error":"invalid_client","error_description":"Client authentication failed"}'))
      .toBe('invalid_client');
  });

  test('non-JSON, missing field, or non-code values give null', () => {
    expect(oauthErrorCode('<html>502</html>')).toBeNull();
    expect(oauthErrorCode('{"message":"x"}')).toBeNull();
    expect(oauthErrorCode('{"error":"Client authentication failed"}')).toBeNull();
  });
});
