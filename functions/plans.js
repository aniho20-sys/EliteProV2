// Monthly plans (B84, Ani 2026-10-31). Three plans by how often the client trains; each coach
// sets a fixed monthly price for each one they offer (users.planPrices — blank = not offered).
// A year of a plan holds exactly its sessions: one a week is 52, so the monthly payments add
// 4, 4, 5, 4, 4, 5… — never 48 for 52 weeks' money (the old tier × 13/12 pricing, B73).
//
// Twin of src/utils/subscriptionUtils.js; src/utils/subscriptionUtils.test.js reads this file
// and fails if the two disagree.

const PLANS = ['fortnightly', 'weekly', 'twice_weekly'];
const SESSIONS_PER_YEAR = { fortnightly: 26, weekly: 52, twice_weekly: 104 };
const MAX_MONTHLY_PRICE = 100000;

// The coach's monthly price for a plan, or null when they do not offer it.
function planPrice(trainer, plan) {
  if (!PLANS.includes(plan)) return null;
  const v = trainer && trainer.planPrices ? trainer.planPrices[plan] : null;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= MAX_MONTHLY_PRICE ? v : null;
}

// Sessions in a year of this subscription. Plans made before B84 carry `tier` (sessions a
// month) instead: tier × 12 gives them exactly what they always had — tier every payment,
// up to floor(tier / 2) carried over.
function sessionsPerYearOf(sub) {
  const y = Number(sub && sub.sessionsPerYear);
  if (Number.isInteger(y) && y > 0) return y;
  const tier = Number(sub && sub.tier);
  return Number.isInteger(tier) && tier > 0 ? tier * 12 : 0;
}

// Sessions the n-th confirmed payment adds (n from 1): that month's share of the year,
// rounded so twelve payments add up to the year exactly. 52 → 4, 4, 5; 26 → 2, 2, 2, 2, 2, 3;
// 104 → 8, 9, 9.
function sessionsForPayment(perYear, n) {
  return Math.floor((n * perYear) / 12) - Math.floor(((n - 1) * perYear) / 12);
}

// Most unused sessions kept when the next payment goes through: half a month's worth, i.e.
// two weeks of the plan (Ani 2026-10-31: "照舊"). 26 → 1, 52 → 2, 104 → 4.
function rolloverCap(perYear) {
  return Math.floor(perYear / 24);
}

// The plan's name on GoCardless and Stripe (what the client sees on their bank statement
// page and receipts). English: processors show it as given.
const PLAN_NAMES = {
  fortnightly: 'One session every two weeks',
  weekly: 'One session a week',
  twice_weekly: 'Two sessions a week',
};
function planName(sub) {
  if (sub && PLAN_NAMES[sub.plan]) return PLAN_NAMES[sub.plan];
  return `${sub && sub.tier} sessions a month`;
}

module.exports = {
  PLANS, SESSIONS_PER_YEAR, MAX_MONTHLY_PRICE,
  planPrice, sessionsPerYearOf, sessionsForPayment, rolloverCap, planName,
};
