import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { createRequire } from 'module';
import {
  PLANS, SESSIONS_PER_YEAR, MAX_MONTHLY_PRICE, planPrice, offeredPlans, sessionsPerYearOf,
  sessionsForPayment, rolloverCap, currentSubscription,
} from './subscriptionUtils';

const server = createRequire(import.meta.url)('../../functions/plans.js');

describe('the three plans (B84) — same as the server', () => {
  test('plans, sessions a year and the price limit match functions/plans.js', () => {
    expect(PLANS).toEqual(server.PLANS);
    expect(SESSIONS_PER_YEAR).toEqual(server.SESSIONS_PER_YEAR);
    expect(MAX_MONTHLY_PRICE).toBe(server.MAX_MONTHLY_PRICE);
  });
  test('every payment of a year, every plan, agrees with the server — and adds up to the year', () => {
    for (const perYear of [26, 52, 104, 48, 96, 144]) {
      let total = 0;
      for (let n = 1; n <= 24; n++) {
        expect(sessionsForPayment(perYear, n)).toBe(server.sessionsForPayment(perYear, n));
        if (n <= 12) total += sessionsForPayment(perYear, n);
      }
      expect(total).toBe(perYear);
      expect(rolloverCap(perYear)).toBe(server.rolloverCap(perYear));
    }
  });
  test('one a week is 4, 4, 5; carry-over is two weeks of the plan', () => {
    expect([1, 2, 3, 4, 5, 6].map(n => sessionsForPayment(52, n))).toEqual([4, 4, 5, 4, 4, 5]);
    expect([26, 52, 104].map(rolloverCap)).toEqual([1, 2, 4]);
  });
  test('a coach’s price: only a number above 0 counts, and the same as the server', () => {
    const coaches = [
      { planPrices: { fortnightly: 150, weekly: 280, twice_weekly: 540 } },
      { planPrices: { weekly: 0, fortnightly: '150', twice_weekly: null } },
      { planPrices: { weekly: 100001 } },
      { subscriptionRate: 65 },
      null,
    ];
    for (const c of coaches) for (const p of [...PLANS, 'monthly']) expect(planPrice(c, p)).toBe(server.planPrice(c, p));
    expect(offeredPlans(coaches[0])).toEqual(PLANS);
    expect(offeredPlans({ planPrices: { twice_weekly: 540, weekly: 280 } })).toEqual(['weekly', 'twice_weekly']);
    expect(offeredPlans(coaches[1])).toEqual([]);
  });
  test('a plan made before B84 keeps its tier: 8 a month is 96 a year, 8 every month', () => {
    expect(sessionsPerYearOf({ tier: 8 })).toBe(server.sessionsPerYearOf({ tier: 8 }));
    expect(sessionsPerYearOf({ plan: 'weekly', sessionsPerYear: 52 })).toBe(52);
    expect([1, 2, 3].map(n => sessionsForPayment(sessionsPerYearOf({ tier: 8 }), n))).toEqual([8, 8, 8]);
  });
  test('the server file is the one priced from: no per-session formula left in it', () => {
    const src = readFileSync(join(cwd(), 'functions/gcSubscriptions.js'), 'utf8');
    expect(src).not.toMatch(/13\s*\)\s*\/\s*12/);
  });
});

describe('currentSubscription', () => {
  test('abandoned and failed attempts are history, not the current plan', () => {
    const subs = [{ status: 'abandoned' }, { status: 'failed' }, { status: 'active', id: 'a' }];
    expect(currentSubscription(subs)).toEqual({ status: 'active', id: 'a' });
    expect(currentSubscription([{ status: 'abandoned' }])).toBeNull();
    expect(currentSubscription([])).toBeNull();
  });
});
