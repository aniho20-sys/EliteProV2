// One way to search exercises, used by every screen that lets someone find one (Exercise
// Library, its merge picker, the workout-log picker, the plan builder, the edit-log picker,
// global search). Before 2026-10-10 each did its own `name.includes(query)`, and a critique
// found what that misses on a 100-exercise library: "curl dumbbell", "db curl", "biceps",
// "pullup" all found nothing, and "chest" found 5 of ~15 chest exercises — a partial result
// that looks complete.
//
// Rules: every word typed must appear somewhere in the exercise — its name, aliases, muscles,
// equipment or movement pattern — in any order. Gym shorthand (db, bb, kb, bw) is expanded,
// a plural "s" is ignored, and words typed together ("pullup") match words apart ("Pull Up").
// Letters in any script count, so a Chinese alias is searchable too.

const ABBREVIATIONS = { db: 'dumbbell', bb: 'barbell', kb: 'kettlebell', bw: 'bodyweight' };

export const searchWords = (text) => String(text || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .split(' ')
  .filter(Boolean);

// "curls" → "curl", "biceps" → "bicep"; "press" and short words are left alone.
export const singularWord = (w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

const haystack = (ex) => searchWords(
  [ex?.name, ...(ex?.aliases || []), ex?.muscle, ex?.equipment, ex?.movementPattern].join(' '),
).map(singularWord).join(' ');

export const matchesExerciseQuery = (ex, query) => {
  const words = searchWords(query).map(w => ABBREVIATIONS[w] || w).map(singularWord);
  if (words.length === 0) return true;
  const text = haystack(ex);
  if (words.every(w => text.includes(w))) return true;
  return text.replace(/ /g, '').includes(words.join(''));
};
