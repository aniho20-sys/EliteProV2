import { describe, test, expect } from 'vitest';
import en from '../i18n/en';
import { translate } from '../i18n/t';
import { gcFailureMessage } from './gcErrors';

const t = (key, vars) => translate({ en, zh: {} }, 'en', key, vars);

describe('gcFailureMessage', () => {
  test('a wrong client ID/secret points at the credentials, by name', () => {
    const msg = gcFailureMessage(t, 'token_exchange', 'invalid_client');
    expect(msg).toContain('GC_CLIENT_SECRET');
    expect(msg).toContain('not its label');
  });

  test('a rejected code points at the redirect URL', () => {
    expect(gcFailureMessage(t, 'token_exchange', 'invalid_grant')).toContain('GC_REDIRECT_URI');
  });

  test('an unrecognised OAuth code is still shown, not swallowed', () => {
    expect(gcFailureMessage(t, 'token_exchange', 'unauthorized_client')).toContain('unauthorized_client');
  });

  test('each server-side reason gets its own sentence', () => {
    const reasons = ['state_expired', 'state_already_used', 'not_trainer', 'token_store', 'token_exchange'];
    const messages = reasons.map((r) => gcFailureMessage(t, r));
    expect(new Set(messages).size).toBe(reasons.length);
    for (const m of messages) expect(m).not.toBe('');
  });

  test('no reason (an old redirect, or missing params) falls back to the generic message', () => {
    expect(gcFailureMessage(t, null)).toBe(en['profile.toast_gc_failed']);
    expect(gcFailureMessage(t, 'something_new')).toBe(en['profile.toast_gc_failed']);
  });
});
