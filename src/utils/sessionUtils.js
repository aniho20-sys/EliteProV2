export function getSessionColor(remaining) {
  if (remaining === null) return 'var(--text-muted)';
  if (remaining >= 5) return '#06d6a0';
  if (remaining >= 3) return 'var(--warning)';
  return 'var(--danger)';
}
