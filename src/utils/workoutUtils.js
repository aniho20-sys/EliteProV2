export function normalizeSets(ex) {
  if (Array.isArray(ex.sets)) return ex.sets;
  const count = ex.sets || 1;
  const weights = ex.weights || Array(count).fill(ex.weight || 0);
  return Array.from({ length: count }, (_, i) => ({ weight: weights[i] || 0, reps: ex.reps || '0' }));
}

// Immutably update one field of one set inside an entries array
export function applySetUpdate(entries, exIdx, setIdx, field, value) {
  return entries.map((entry, i) =>
    i === exIdx
      ? { ...entry, sets: entry.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) }
      : entry
  );
}

// Serialize display entries to storage format (filter incomplete sets, coerce to numbers)
export function serializeEntries(entries) {
  return entries.map(e => ({
    ...e,
    sets: (e.sets || [])
      .filter(s => s.weight && s.reps)
      .map(s => ({ weight: Number(s.weight), reps: Number(s.reps) })),
  }));
}
