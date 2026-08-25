import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { passwordResetNotice, passwordResetError } from './passwordReset';

const read = (p) => readFileSync(new URL(p, import.meta.url).pathname, 'utf8');

describe('what the app promises after asking for a reset', () => {
  test('a typed address is never described as sent', () => {
    const msg = passwordResetNotice('someone@example.com');
    // Firebase resolves for an address with no account and sends nothing, so the app
    // cannot know. Anything stating it was sent would be a claim it cannot support.
    expect(msg).toMatch(/if an account exists/i);
    expect(msg).not.toMatch(/\bsent\b/i);
  });

  test('the signed-in user’s own address is described as sent, because it exists', () => {
    const msg = passwordResetNotice('me@example.com', { accountKnown: true });
    expect(msg).toMatch(/sent to me@example.com/i);
  });

  test('both name the spam folder, which is the commonest real cause', () => {
    expect(passwordResetNotice('a@b.com')).toMatch(/spam/i);
    expect(passwordResetNotice('a@b.com', { accountKnown: true })).toMatch(/spam/i);
  });

  test('both tell the reader what to search for', () => {
    // The 2026-08-23 case: the email arrived and was never found, because the sender name
    // is the Firebase project id rather than ElitePro.
    for (const msg of [passwordResetNotice('a@b.com'), passwordResetNotice('a@b.com', { accountKnown: true })]) {
      expect(msg).toMatch(/password reset/i);
      expect(msg).toMatch(/sender may not say ElitePro/i);
    }
  });

  test('the typed-address version also covers a wrong address', () => {
    expect(passwordResetNotice('a@b.com')).toMatch(/different from the one you signed up with/i);
  });
});

describe('failures are told apart', () => {
  test.each([
    ['auth/quota-exceeded', /today/i],
    ['auth/too-many-requests', /wait a few minutes/i],
    ['auth/invalid-email', /valid email/i],
    ['auth/network-request-failed', /connection/i],
    ['auth/user-not-found', /no account uses that email/i],
  ])('%s produces its own message', (code, pattern) => {
    expect(passwordResetError({ code })).toMatch(pattern);
  });

  test('the daily send limit and per-device rate limiting are different messages', () => {
    // Conflating them tells a student to "wait a few minutes" when the real answer is
    // "nobody can get an email until tomorrow".
    expect(passwordResetError({ code: 'auth/quota-exceeded' }))
      .not.toBe(passwordResetError({ code: 'auth/too-many-requests' }));
  });

  test('a network failure says nothing was sent, so retrying is safe', () => {
    expect(passwordResetError({ code: 'auth/network-request-failed' })).toMatch(/nothing has been sent/i);
  });

  test('an unrecognised code falls through so the shared map can handle it', () => {
    expect(passwordResetError({ code: 'auth/some-new-thing' })).toBeNull();
    expect(passwordResetError(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
// Three dead or silently-failing controls shipped this month, so the reset path gets the
// same treatment as the renewal prompt: the wiring is asserted, not assumed.
describe('GUARDIAN: the reset button is wired and cannot fail silently', () => {
  test('both callers await sendPasswordReset inside a try/catch', () => {
    for (const file of ['../pages/LoginPage.jsx', '../pages/ProfilePage.jsx']) {
      const src = read(file);
      expect(src).toMatch(/await sendPasswordReset\(/);
      const idx = src.indexOf('await sendPasswordReset(');
      // A catch clause has to exist after the call within the same handler.
      expect(src.slice(idx, idx + 700)).toMatch(/catch\s*\(/);
    }
  });

  test('neither caller claims an email was sent to an unverified address', () => {
    const src = read('../pages/LoginPage.jsx');
    expect(src).not.toMatch(/Password reset email sent to \$\{forgotEmail/);
    expect(src).toMatch(/passwordResetNotice\(/);
  });

  test('the Profile button is guarded against double submission', () => {
    const src = read('../pages/ProfilePage.jsx');
    expect(src).toMatch(/if \(resettingPassword\) return;/);
    expect(src).toMatch(/disabled=\{resettingPassword\}/);
  });

  test('the owner has a server-side way to tell why nothing arrived', () => {
    const src = read('../../functions/index.js');
    expect(src).toMatch(/exports\.lookupAccountByEmail/);
    expect(src).toMatch(/canResetPassword/);
    // Owner-gated: an open version of this is exactly the enumeration oracle that
    // Firebase's protection exists to prevent.
    const idx = src.indexOf('exports.lookupAccountByEmail');
    expect(src.slice(idx, idx + 500)).toMatch(/OWNER_EMAIL/);
  });
});
