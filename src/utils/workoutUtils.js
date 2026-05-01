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

// Returns a weight suggestion (kg) based on the last N logs for one exercise.
// Returns null if insufficient data or exercise is not weight_reps type.
export function getProgressionSuggestion(logs, exerciseId) {
  const relevant = [...logs]
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .filter(log => log.entries?.some(e => e.exerciseId === exerciseId && (e.unit || 'weight_reps') === 'weight_reps'))
    .slice(0, 3);

  if (relevant.length < 2) return null;

  const maxWeights = relevant.map(log => {
    const entry = log.entries.find(e => e.exerciseId === exerciseId);
    if (!entry?.sets?.length) return 0;
    return Math.max(...entry.sets.map(s => Number(s.weight) || 0));
  }).filter(w => w > 0);

  if (maxWeights.length < 2) return null;

  // If last 2 sessions have the same peak weight, suggest a 2.5kg bump
  const [latest, prev] = maxWeights;
  if (latest > 0 && latest === prev) return +(latest + 2.5).toFixed(1);
  // If progressive over last 3, also suggest next step
  if (maxWeights.length === 3 && latest > prev && prev > maxWeights[2]) return +(latest + 2.5).toFixed(1);
  return null;
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
