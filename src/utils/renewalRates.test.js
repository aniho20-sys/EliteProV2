import { describe, test, expect } from 'vitest';
import { renewalRates, hasRenewalPrice } from './renewalRates';

describe('renewalRates', () => {
  test('one price: the same before and after running out, no lock-in', () => {
    expect(renewalRates({ renewalRate: 50 })).toEqual({ now: 50, next: 50, lockIn: false });
    expect(renewalRates({ renewalRate: 50, renewalRateNext: null })).toEqual({ now: 50, next: 50, lockIn: false });
    expect(renewalRates({ renewalRate: 50, renewalRateNext: 50 })).toEqual({ now: 50, next: 50, lockIn: false });
  });
  test('two prices: lock-in', () => {
    expect(renewalRates({ renewalRate: 50, renewalRateNext: 60 })).toEqual({ now: 50, next: 60, lockIn: true });
  });
  test('no price: nothing to show', () => {
    expect(renewalRates({})).toEqual({ now: null, next: null, lockIn: false });
    expect(renewalRates(undefined)).toEqual({ now: null, next: null, lockIn: false });
    expect(renewalRates({ renewalRate: 0, renewalRateNext: 60 }).now).toBeNull();
    expect(hasRenewalPrice({ renewalRate: '' })).toBe(false);
    expect(hasRenewalPrice({ renewalRate: 45 })).toBe(true);
  });
});
