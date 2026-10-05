// A coach's session price, and the optional higher price once a client's sessions have run
// out (the "renew early to keep your rate" lock-in). B39 (2026-10-05): the second price is
// optional — a new coach sets one price and everything works. Before, both had to be set
// or the renewal prompt and the pay-me sheet never appeared at all.
//
//   now    — the price per session, or null if the coach has not set one
//   next   — the price once sessions run out; the same as `now` when no second price is set
//   lockIn — true only when there really are two different prices, so copy that says
//            "renew now to keep your rate" is shown only when it is true
const positive = (n) => (Number(n) > 0 ? Number(n) : null);

export function renewalRates(trainer) {
  const now = positive(trainer?.renewalRate);
  const next = positive(trainer?.renewalRateNext) ?? now;
  return { now, next, lockIn: !!(now && next && next !== now) };
}

export const hasRenewalPrice = (trainer) => renewalRates(trainer).now !== null;
