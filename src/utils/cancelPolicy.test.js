// B82 (Ani 2026-10-29): each coach sets their own cancellation rule.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { cancelPolicy, isLateCancel, cancelRuleText, NOTICE_OPTIONS, FREE_OPTIONS, DEFAULT_CANCEL_POLICY } from './cancelPolicy';
import { translate } from '../i18n/t';
import en from '../i18n/en';

const t = (key, vars) => translate({ en }, 'en', key, vars);
const HOUR = 60 * 60 * 1000;

describe('the coach’s cancellation rule', () => {
  test('until chosen: 24 hours, twice a month — what every coach had before', () => {
    expect(cancelPolicy({})).toEqual({ noticeHours: 24, freePerMonth: 2, note: '' });
    expect(cancelPolicy(null)).toEqual(cancelPolicy({}));
  });
  test('a chosen rule is used; a value the app never offers falls back', () => {
    expect(cancelPolicy({ cancelPolicy: { noticeHours: 12, freePerMonth: null, note: 'Hi' } }))
      .toEqual({ noticeHours: 12, freePerMonth: null, note: 'Hi' });
    expect(cancelPolicy({ cancelPolicy: { noticeHours: 1, freePerMonth: 9 } })).toEqual(DEFAULT_CANCEL_POLICY);
  });
  test('late means inside the coach’s notice, before the session starts', () => {
    const now = Date.UTC(2026, 9, 29, 12);
    const p = { noticeHours: 12 };
    expect(isLateCancel(p, now + 11 * HOUR, now)).toBe(true);
    expect(isLateCancel(p, now + 13 * HOUR, now)).toBe(false);
    expect(isLateCancel(p, now - HOUR, now)).toBe(false); // already started: not this question
  });
  test('the rule in words, for clients and for the coach', () => {
    expect(cancelRuleText(t, { noticeHours: 12, freePerMonth: 3 }, false)).toBe('Cancel at least 12 hours before to get the session back (up to 3 times a month). Later cancellations still use the session.');
    expect(cancelRuleText(t, { noticeHours: 24, freePerMonth: 1 }, false)).toMatch(/\(once a month\)/);
    expect(cancelRuleText(t, { noticeHours: 48, freePerMonth: null }, false)).toBe('Cancel at least 48 hours before to get the session back. Later cancellations still use the session.');
    expect(cancelRuleText(t, { noticeHours: 24, freePerMonth: 0 }, false)).toBe('Cancelled sessions are not given back.');
    expect(cancelRuleText(t, { noticeHours: 24, freePerMonth: 2 }, true)).toMatch(/^If a client cancels 24 hours or more/);
  });
  test('the server applies the same options and default (functions/cancelPolicy.js)', () => {
    const server = readFileSync(join(cwd(), 'functions/cancelPolicy.js'), 'utf8');
    expect(server).toContain(`const NOTICE_OPTIONS = ${JSON.stringify(NOTICE_OPTIONS).replace(/,/g, ', ')};`);
    expect(server).toContain(`const FREE_OPTIONS = ${JSON.stringify(FREE_OPTIONS).replace(/,/g, ', ')};`);
    expect(server).toContain('const DEFAULT_CANCEL_POLICY = { noticeHours: 24, freePerMonth: 2 };');
    const rules = readFileSync(join(cwd(), 'firestore.rules'), 'utf8');
    expect(rules).toContain(`in ${JSON.stringify(NOTICE_OPTIONS).replace(/,/g, ', ')}`);
    expect(rules).toContain(`in ${JSON.stringify(FREE_OPTIONS).replace(/,/g, ', ')}`);
  });
});
