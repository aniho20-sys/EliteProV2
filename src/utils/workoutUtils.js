export function normalizeSets(ex) {
  if (Array.isArray(ex.sets)) return ex.sets;
  const count = ex.sets || 1;
  const weights = ex.weights || Array(count).fill(ex.weight || 0);
  return Array.from({ length: count }, (_, i) => ({ weight: weights[i] || 0, reps: ex.reps || '0' }));
}
