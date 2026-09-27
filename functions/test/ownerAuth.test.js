/* global describe, test, expect, require */
// Owner-only callables gate on isOwnerToken. The bug it guards: until 2026-09-27 the check
// compared the token's email only, so an account that merely CLAIMED the owner's address —
// never proving it — would have passed. Pure function, no emulator needed.
const { isOwnerToken, OWNER_EMAIL } = require('../ownerAuth');

describe('isOwnerToken', () => {
  test('the owner signed in with Google (verified Gmail) passes', () => {
    expect(isOwnerToken({ email: OWNER_EMAIL, email_verified: true })).toBe(true);
  });

  test('case in the address does not matter', () => {
    expect(isOwnerToken({ email: 'AniHo20@Gmail.com', email_verified: true })).toBe(true);
  });

  test("the owner's address, unverified, is refused", () => {
    expect(isOwnerToken({ email: OWNER_EMAIL, email_verified: false })).toBe(false);
    expect(isOwnerToken({ email: OWNER_EMAIL })).toBe(false);
  });

  test('anyone else is refused, verified or not', () => {
    expect(isOwnerToken({ email: 'someone@gmail.com', email_verified: true })).toBe(false);
  });

  test('a missing token or email is refused, not thrown', () => {
    expect(isOwnerToken(undefined)).toBe(false);
    expect(isOwnerToken({ email_verified: true })).toBe(false);
  });
});
