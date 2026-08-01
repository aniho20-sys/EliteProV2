// Single source of truth for "sessions remaining" severity — see STYLE.md §8.1.
export const SESSION_DANGER_THRESHOLD = 2;
export const SESSION_WARNING_THRESHOLD = 5;

// At or below this, the client's dashboard shows the renewal rate-lock prompt
// on EVERY visit (not once) until the trainer manually tops them up — see
// ClientDashboard.jsx. Deliberately separate from the two colour thresholds
// above: this one drives a revenue nudge, not a severity colour.
export const RENEWAL_PROMPT_THRESHOLD = 3;

export function getSessionColor(remaining) {
  if (remaining === null) return 'var(--text-muted)';
  if (remaining <= SESSION_DANGER_THRESHOLD) return 'var(--danger)';
  if (remaining <= SESSION_WARNING_THRESHOLD) return 'var(--warning)';
  return 'var(--success)';
}
