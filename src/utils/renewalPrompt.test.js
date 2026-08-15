import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  renewalPromptKind,
  renewalSnoozeUntil,
  isRenewalPromptSnoozed,
  RENEWAL_SNOOZE_DAYS,
  RENEWAL_SNOOZE_FIELD,
} from './renewalPrompt';

const TODAY = '2026-08-15';
const trainer = { renewalRate: 50, renewalRateNext: 60, currency: 'GBP' };
const client = { id: 'c1' };

describe('when the prompt fires', () => {
  test.each([
    [-1, 'overdraft'],
    [0, 'low'],
    [1, 'low'],
    [5, 'low'],
  ])('remainingAfter %i → %s', (remainingAfter, expected) => {
    expect(renewalPromptKind({ remainingAfter, trainer, client, today: TODAY })).toBe(expected);
  });

  test('stays quiet above the threshold', () => {
    expect(renewalPromptKind({ remainingAfter: 6, trainer, client, today: TODAY })).toBeNull();
  });

  test('stays quiet when the trainer has not set rates — there is nothing to offer', () => {
    expect(renewalPromptKind({ remainingAfter: 1, trainer: {}, client, today: TODAY })).toBeNull();
    expect(renewalPromptKind({ remainingAfter: 1, trainer: { renewalRate: 50 }, client, today: TODAY })).toBeNull();
  });

  test('stays quiet on unlimited/unknown balances', () => {
    expect(renewalPromptKind({ remainingAfter: null, trainer, client, today: TODAY })).toBeNull();
    expect(renewalPromptKind({ remainingAfter: undefined, trainer, client, today: TODAY })).toBeNull();
  });
});

describe('"Remind me later"', () => {
  test(`snoozes ${RENEWAL_SNOOZE_DAYS} days from today`, () => {
    expect(renewalSnoozeUntil(TODAY)).toBe('2026-08-18');
  });

  test('crosses a month boundary correctly', () => {
    expect(renewalSnoozeUntil('2026-08-30')).toBe('2026-09-02');
  });

  test('suppresses the prompt for the days in between', () => {
    const snoozed = { ...client, [RENEWAL_SNOOZE_FIELD]: renewalSnoozeUntil(TODAY) };
    for (const day of ['2026-08-15', '2026-08-16', '2026-08-17']) {
      expect(renewalPromptKind({ remainingAfter: 1, trainer, client: snoozed, today: day })).toBeNull();
    }
  });

  test('the prompt comes back on the day the snooze expires', () => {
    const snoozed = { ...client, [RENEWAL_SNOOZE_FIELD]: renewalSnoozeUntil(TODAY) };
    expect(renewalPromptKind({ remainingAfter: 1, trainer, client: snoozed, today: '2026-08-18' })).toBe('low');
    expect(renewalPromptKind({ remainingAfter: 1, trainer, client: snoozed, today: '2026-08-19' })).toBe('low');
  });

  test('a snooze does not silence the overdraft case forever either', () => {
    const snoozed = { ...client, [RENEWAL_SNOOZE_FIELD]: '2026-08-18' };
    expect(renewalPromptKind({ remainingAfter: -1, trainer, client: snoozed, today: '2026-08-16' })).toBeNull();
    expect(renewalPromptKind({ remainingAfter: -1, trainer, client: snoozed, today: '2026-08-18' })).toBe('overdraft');
  });

  test('a client who has never snoozed is not treated as snoozed', () => {
    expect(isRenewalPromptSnoozed(client, TODAY)).toBe(false);
    expect(isRenewalPromptSnoozed({ [RENEWAL_SNOOZE_FIELD]: null }, TODAY)).toBe(false);
    expect(isRenewalPromptSnoozed(undefined, TODAY)).toBe(false);
  });

  test('an expired snooze from long ago does not linger', () => {
    expect(isRenewalPromptSnoozed({ [RENEWAL_SNOOZE_FIELD]: '2026-01-01' }, TODAY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
// The renewal ask shipped as an 8-second toast and clients reported never getting to read
// it — a prompt asking someone to pay cannot expire on its own. These fail if it is ever
// turned back into a self-dismissing message. Verified to bite: restoring the toast() call
// in doBookSession fails the first of them.
const read = (p) => readFileSync(new URL(p, import.meta.url).pathname, 'utf8');

describe('GUARDIAN: the renewal prompt must wait for an answer', () => {
  test('booking does not announce renewal through a toast', () => {
    const src = read('../pages/SchedulePage.jsx');
    const renewalToasts = (src.match(/toast\((?:[^()]|\([^()]*\))*\)/g) || [])
      .filter(call => /renew|rate|run out|on credit/i.test(call))
      // The failure path for saving a snooze is allowed to be a toast: it reports a
      // completed (failed) action rather than asking for a decision.
      .filter(call => !/Could not save that/i.test(call));
    expect(renewalToasts).toEqual([]);
  });

  test('the modal has no dismiss timer', () => {
    const src = read('../components/RenewalPromptModal.jsx');
    expect(src).not.toMatch(/setTimeout|setInterval/);
    // A third numeric argument to toast() is a custom auto-dismiss duration.
    expect(src).not.toMatch(/toast\s*\(/);
  });

  test('the modal offers both answers, not just a way out', () => {
    const src = read('../components/RenewalPromptModal.jsx');
    expect(src).toMatch(/Renew now/);
    expect(src).toMatch(/Remind me later/);
    expect(src).toMatch(/onRenew/);
    expect(src).toMatch(/onLater/);
  });

  test('the snooze is persisted to the profile, not just component state', () => {
    const src = read('../pages/SchedulePage.jsx');
    expect(src).toMatch(/updateClient\(\s*currentUser\.id,\s*\{\s*\[RENEWAL_SNOOZE_FIELD\]/);
  });

  test('the client snooze does not reuse the trainer-side snooze field', () => {
    // TrainerDashboard writes renewalSnoozedUntil for its own Needs Attention row.
    expect(RENEWAL_SNOOZE_FIELD).not.toBe('renewalSnoozedUntil');
    const rules = read('../../firestore.rules');
    expect(rules).toMatch(new RegExp(`'${RENEWAL_SNOOZE_FIELD}'`));
  });
});
