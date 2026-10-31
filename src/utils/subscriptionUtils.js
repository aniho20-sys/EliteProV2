// Monthly plans, app side (B84, Ani 2026-10-31). Twin of functions/plans.js: the server prices
// every plan from the coach's own document and adds each month's sessions — the client sends
// only which plan. This copy is for showing the numbers before anyone taps;
// subscriptionUtils.test.js reads functions/plans.js and fails if the two disagree.

export const PLANS = ['fortnightly', 'weekly', 'twice_weekly'];
export const SESSIONS_PER_YEAR = { fortnightly: 26, weekly: 52, twice_weekly: 104 };
export const MAX_MONTHLY_PRICE = 100000;
// What a coach billing in GBP sees filled in before they first save (Ani 2026-10-31). Only a
// suggestion: nothing is offered until the coach saves, and other currencies start blank.
export const DEFAULT_PLAN_PRICES_GBP = { fortnightly: 150, weekly: 280, twice_weekly: 540 };

// The coach's monthly price for a plan, or null when they do not offer it.
export function planPrice(trainer, plan) {
  if (!PLANS.includes(plan)) return null;
  const v = trainer?.planPrices?.[plan];
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= MAX_MONTHLY_PRICE ? v : null;
}

// The plans this coach offers, in order.
export const offeredPlans = (trainer) => PLANS.filter(p => planPrice(trainer, p) !== null);

// Sessions in a year of a subscription; a plan made before B84 has `tier` (a month) instead.
export function sessionsPerYearOf(sub) {
  const y = Number(sub?.sessionsPerYear);
  if (Number.isInteger(y) && y > 0) return y;
  const tier = Number(sub?.tier);
  return Number.isInteger(tier) && tier > 0 ? tier * 12 : 0;
}

// Sessions the n-th payment adds (n from 1). 52 → 4, 4, 5; 26 → 2, 2, 2, 2, 2, 3; 104 → 8, 9, 9.
export const sessionsForPayment = (perYear, n) => Math.floor((n * perYear) / 12) - Math.floor(((n - 1) * perYear) / 12);

// Most unused sessions kept at the next payment: two weeks of the plan. 26 → 1, 52 → 2, 104 → 4.
export const rolloverCap = (perYear) => Math.floor(perYear / 24);

// A subscription the client can act on, or null. Anything superseded or failed is
// history, not current state.
const CURRENT = ['active', 'paused', 'past_due', 'pending', 'completing'];
export function currentSubscription(subscriptions) {
  return (subscriptions || []).find(s => CURRENT.includes(s.status)) || null;
}

// A plan's name on screen. Each key is written out so t() only ever sees a literal (#28).
// A plan made before B84 is named by its tier.
export function planLabel(t, sub) {
  const plan = typeof sub === 'string' ? sub : sub?.plan;
  if (plan === 'fortnightly') return t('sub.plan_fortnightly');
  if (plan === 'weekly') return t('sub.plan_weekly');
  if (plan === 'twice_weekly') return t('sub.plan_twice_weekly');
  return t('sub.tier_option', { n: sub?.tier });
}
