// Display-side copy of the plan maths. The authoritative price is computed on the
// server (functions/gcSubscriptions.js monthlyAmountPence) from the trainer's own rate —
// the client never sends a price, only a tier. This copy exists so the plan picker can
// show the number before anyone taps, and subscriptionUtils.test.js pins it to the same
// design-table figures the server's test pins, so the two cannot quietly drift.
export const SUBSCRIPTION_TIERS = [4, 8, 12];

// 52-week annualised: tier 4 = one session a week = 52 a year, billed over 12 months.
export function monthlyAmount(ratePerSession, tier) {
  const pence = Math.round(Number(ratePerSession) * 100);
  if (!SUBSCRIPTION_TIERS.includes(tier) || !Number.isFinite(pence) || pence <= 0) return null;
  return Math.round((pence * tier * 13) / 12) / 100;
}

// A subscription the client can act on, or null. Anything superseded or failed is
// history, not current state.
const CURRENT = ['active', 'paused', 'past_due', 'pending', 'completing'];
export function currentSubscription(subscriptions) {
  return (subscriptions || []).find(s => CURRENT.includes(s.status)) || null;
}
