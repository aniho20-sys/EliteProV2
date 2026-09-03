import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildAuthMessages, SILENT_AUTH_CODES } from './authMessages';
import { translate } from './t';
import en from './en';
import zh from './zh-HK';

const read = (p) => readFileSync(new URL(p, import.meta.url).pathname, 'utf8');

// Built with a real dictionary rather than a stub, so these assert the actual strings a
// user sees. Replaces src/utils/passwordReset.test.js, which tested the two plain-string
// modules these replaced on 2026-09-02.
const forLang = (lang) => buildAuthMessages(
  (key, vars) => translate({ en, zh }, lang, key, vars),
);
const m = forLang('en');
const mzh = forLang('zh-HK');

describe('auth errors', () => {
  test.each([
    ['auth/user-not-found', /no account found/i],
    ['auth/wrong-password', /incorrect password/i],
    ['auth/email-already-in-use', /already registered/i],
    ['auth/too-many-requests', /too many attempts/i],
    ['auth/network-request-failed', /network error/i],
  ])('%s has its own message', (code, pattern) => {
    expect(m.authError({ code })).toMatch(pattern);
  });

  test('the two aliases for bad credentials say the same thing', () => {
    // Firebase renamed this code mid-flight and still emits both.
    expect(m.authError({ code: 'auth/invalid-credential' }))
      .toBe(m.authError({ code: 'auth/invalid-login-credentials' }));
  });

  test('a cancelled popup says nothing at all', () => {
    // The user closed it themselves. A red banner would be the app arguing with them.
    for (const code of SILENT_AUTH_CODES) {
      expect(m.authError({ code })).toBeNull();
    }
  });

  test('an unrecognised code keeps the raw code for diagnosis', () => {
    expect(m.authError({ code: 'auth/brand-new-thing' })).toBe(
      'Something went wrong. Please try again. (auth/brand-new-thing)',
    );
  });

  test('a caller-supplied fallback is used instead of the generic one', () => {
    expect(m.authError({ code: 'auth/unknown' }, 'Could not sign you in.'))
      .toBe('Could not sign you in. (auth/unknown)');
  });

  test('no error at all still returns something sayable', () => {
    expect(m.authError(undefined)).toBe('Something went wrong. Please try again.');
    expect(m.authError(null)).toBe('Something went wrong. Please try again.');
  });

  test('Chinese resolves through the same map', () => {
    expect(mzh.authError({ code: 'auth/wrong-password' })).toBe('密碼不正確，請再試一次。');
  });
});

describe('what the app promises after asking for a reset', () => {
  test('a typed address is never described as sent', () => {
    // Firebase resolves for an address with no account and sends nothing, so the app
    // cannot know. Anything stating it was sent would be a claim it cannot support.
    const msg = m.resetNotice('someone@example.com');
    expect(msg).toMatch(/if an account exists/i);
    expect(msg).not.toMatch(/\bsent to\b/i);
  });

  test('the signed-in user’s own address is described as sent, because it exists', () => {
    expect(m.resetNotice('me@example.com', { accountKnown: true }))
      .toMatch(/sent to me@example\.com/i);
  });

  test('both name the spam folder and what to search for', () => {
    // The 2026-08-23 case: the email arrived and was never found, because the sender name
    // is the Firebase project id rather than ElitePro.
    for (const msg of [m.resetNotice('a@b.com'), m.resetNotice('a@b.com', { accountKnown: true })]) {
      expect(msg).toMatch(/spam/i);
      expect(msg).toMatch(/password reset/i);
      expect(msg).toMatch(/sender may not say ElitePro/i);
    }
  });

  test('the typed-address version also covers a wrong address', () => {
    expect(m.resetNotice('a@b.com')).toMatch(/different from the one you signed up with/i);
  });

  test('Chinese keeps the search term in English, because the email is in English', () => {
    const msg = mzh.resetNotice('a@b.com', { accountKnown: true });
    expect(msg).toContain('password reset');
    expect(msg).toContain('ElitePro');
    expect(msg).toContain('垃圾郵件');
  });
});

describe('reset failures are told apart', () => {
  test.each([
    ['auth/quota-exceeded', /tomorrow/i],
    ['auth/too-many-requests', /wait a few minutes/i],
    ['auth/invalid-email', /valid email/i],
    ['auth/network-request-failed', /connection/i],
    ['auth/user-not-found', /no account uses that email/i],
  ])('%s produces its own message', (code, pattern) => {
    expect(m.resetError({ code })).toMatch(pattern);
  });

  test('the daily send limit and per-device rate limiting are different messages', () => {
    // Conflating them tells a student to "wait a few minutes" when the real answer is
    // "nobody can get an email until tomorrow".
    expect(m.resetError({ code: 'auth/quota-exceeded' }))
      .not.toBe(m.resetError({ code: 'auth/too-many-requests' }));
  });

  test('a network failure says nothing was sent, so retrying is safe', () => {
    expect(m.resetError({ code: 'auth/network-request-failed' })).toMatch(/nothing has been sent/i);
  });

  test('an unrecognised code falls through so the caller can chain a fallback', () => {
    expect(m.resetError({ code: 'auth/some-new-thing' })).toBeNull();
    expect(m.resetError(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
// Three dead or silently-failing controls shipped in August, so the reset path keeps the
// wiring asserted rather than assumed.
describe('GUARDIAN: the reset button is wired and cannot fail silently', () => {
  test('both callers await sendPasswordReset inside a try/catch', () => {
    for (const file of ['../pages/LoginPage.jsx', '../pages/ProfilePage.jsx']) {
      const src = read(file);
      expect(src).toMatch(/await sendPasswordReset\(/);
      const idx = src.indexOf('await sendPasswordReset(');
      expect(src.slice(idx, idx + 700)).toMatch(/catch\s*\(/);
    }
  });

  test('neither caller claims an email was sent to an unverified address', () => {
    const src = read('../pages/LoginPage.jsx');
    expect(src).not.toMatch(/Password reset email sent to \$\{forgotEmail/);
    expect(src).toMatch(/authMsg\.resetNotice\(/);
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
