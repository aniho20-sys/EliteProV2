// Single source of truth for "sessions remaining" severity — see STYLE.md §8.1.
export const SESSION_DANGER_THRESHOLD = 2;
export const SESSION_WARNING_THRESHOLD = 5;

export function getSessionColor(remaining) {
  if (remaining === null) return 'var(--text-muted)';
  if (remaining <= SESSION_DANGER_THRESHOLD) return 'var(--danger)';
  if (remaining <= SESSION_WARNING_THRESHOLD) return 'var(--warning)';
  return 'var(--success)';
}
