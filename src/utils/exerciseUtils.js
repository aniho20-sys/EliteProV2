// Follows a soft-merged exercise's mergedInto pointer to the surviving exercise doc.
// Merges never rewrite exerciseId on existing workoutPlans/workoutLogs — this lets old
// references keep resolving to the current (merged-into) exercise instead.
export const canonicalExercise = (library, id) => {
  let ex = library.find(e => e.id === id);
  const seen = new Set();
  while (ex?.mergedInto && !seen.has(ex.id)) {
    seen.add(ex.id);
    const next = library.find(e => e.id === ex.mergedInto);
    if (!next) break;
    ex = next;
  }
  return ex;
};

export const resolveExerciseName = (library, id, fallback) =>
  canonicalExercise(library, id)?.name || fallback || id;

// Title-cases a name while preserving words that are already all-caps acronyms (e.g. "RDL", "HIIT")
export const titleCaseExerciseName = (name) =>
  name.trim().replace(/\s+/g, ' ').split(' ').map(w =>
    (w === w.toUpperCase() && w.length > 1) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');

// Shared "≥1 muscle group + equipment" requirement for any UI that creates/edits exercises
export const exerciseFieldsValid = ({ muscle, equipment }) =>
  !!(muscle && muscle.split(',').map(s => s.trim()).filter(Boolean).length) && !!(equipment && equipment.trim());

// Canonical A-Z sort for every UI that lists exercises, applied at render time so a newly
// added exercise appears in its correct alphabetical position rather than at the bottom.
export const sortExercisesByName = (list) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
