import { describe, test, expect } from 'vitest';
import { monthlyAmount, currentSubscription } from './subscriptionUtils';

describe('monthlyAmount — same figures the server test pins', () => {
  test('£65 → £281.67 / £563.33 / £845.00', () => {
    expect(monthlyAmount(65, 4)).toBe(281.67);
    expect(monthlyAmount(65, 8)).toBe(563.33);
    expect(monthlyAmount(65, 12)).toBe(845);
  });
  test('no rate or an unknown tier shows nothing rather than £0', () => {
    expect(monthlyAmount(undefined, 4)).toBeNull();
    expect(monthlyAmount(65, 5)).toBeNull();
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
