/* global module */
// Turning trainer_signup events into a queue: who is number what, who holds a founding
// place, and how many places are left.
//
// Split out of index.js to be testable, because this arithmetic has been wrong in
// production before. Founding places were first derived from the number of trainer
// DOCUMENTS, so old test accounts consumed them and the card read "0 places left" before a
// single real trainer had arrived. Counting signup events fixed that, and then Ani's own
// test signup took founding place #1 — a real event, but not a customer.
//
// Excluded events are kept, never deleted (CLAUDE.md #27). Only what they count towards
// changes.
function summariseSignups(events, foundingPlaces) {
  const ordered = [...(events || [])]
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  const counted = ordered.filter(e => !e.excluded);
  // Numbered over the counted ones only, so excluding an event renumbers everyone behind
  // it — which is what actually happened to the queue.
  const numberOf = new Map(counted.map((e, i) => [e.id, i + 1]));

  const rows = ordered.map(e => ({
    ...e,
    excluded: !!e.excluded,
    signupNumber: numberOf.get(e.id) || null,
    withinFounding: (numberOf.get(e.id) || Infinity) <= foundingPlaces,
  }));

  return {
    rows,
    signupCount: counted.length,
    excludedCount: ordered.length - counted.length,
    foundingRemaining: Math.max(0, foundingPlaces - counted.length),
  };
}

module.exports = { summariseSignups };
