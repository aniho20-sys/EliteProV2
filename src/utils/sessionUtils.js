// Single source of truth for "sessions remaining" severity — see STYLE.md §8.1.
export const SESSION_DANGER_THRESHOLD = 2;
export const SESSION_WARNING_THRESHOLD = 5;

// At or below this, the client gets the renewal rate-lock nudge — on EVERY
// dashboard visit (not once) and again each time they book a session — until
// the trainer manually tops them up. Kept separate from the two colour
// thresholds above even though it currently equals SESSION_WARNING_THRESHOLD:
// this one drives a revenue nudge, not a severity colour, and the two are
// meant to be tunable independently.
export const RENEWAL_PROMPT_THRESHOLD = 5;

// How many sessions a client may book after hitting zero credit. Hard cap of 1
// (CLAUDE.md #33): at remaining === 0 they can still book one session on credit,
// which is added to their next renewal; at remaining === -1 booking is blocked
// until the trainer tops them up.
export const OVERDRAFT_LIMIT = 1;

export function getSessionColor(remaining) {
  if (remaining === null) return 'var(--text-muted)';
  if (remaining <= SESSION_DANGER_THRESHOLD) return 'var(--danger)';
  if (remaining <= SESSION_WARNING_THRESHOLD) return 'var(--warning)';
  return 'var(--success)';
}
