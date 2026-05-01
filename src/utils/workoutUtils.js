export const UNIT_OPTIONS = [
  { value: 'weight_reps', label: 'Wt+Reps' },
  { value: 'reps_only', label: 'Reps' },
  { value: 'time', label: 'Time' },
  { value: 'distance', label: 'Dist' },
];

export function emptySet(unit) {
  if (unit === 'reps_only') return { reps: '' };
  if (unit === 'time') return { seconds: '' };
  if (unit === 'distance') return { metres: '' };
  return { weight: '', reps: '' };
}

export function hasValue(s, unit) {
  if (unit === 'reps_only') return Boolean(s.reps);
  if (unit === 'time') return Boolean(s.seconds);
  if (unit === 'distance') return Boolean(s.metres);
  return Boolean(s.weight) && Boolean(s.reps);
}

export function formatSet(s, unit) {
  if (unit === 'reps_only') return `× ${s.reps}`;
  if (unit === 'time') return `${s.seconds}s`;
  if (unit === 'distance') return `${s.metres}m`;
  return `${s.weight}kg × ${s.reps}`;
}

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
  return entries.map(e => {
    const unit = e.unit || 'weight_reps';
    return {
      ...e,
      sets: (e.sets || [])
        .filter(s => {
          if (unit === 'reps_only') return Boolean(s.reps);
          if (unit === 'time') return Boolean(s.seconds);
          if (unit === 'distance') return Boolean(s.metres);
          return Boolean(s.weight) && Boolean(s.reps);
        })
        .map(s => {
          if (unit === 'reps_only') return { reps: Number(s.reps) };
          if (unit === 'time') return { seconds: Number(s.seconds) };
          if (unit === 'distance') return { metres: Number(s.metres) };
          return { weight: Number(s.weight), reps: Number(s.reps) };
        }),
    };
  });
}
