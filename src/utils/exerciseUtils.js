export const resolveExerciseName = (library, id, fallback) =>
  library.find(e => e.id === id)?.name || fallback || id;

// Title-cases a name while preserving words that are already all-caps acronyms (e.g. "RDL", "HIIT")
export const titleCaseExerciseName = (name) =>
  name.trim().replace(/\s+/g, ' ').split(' ').map(w =>
    (w === w.toUpperCase() && w.length > 1) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');

// Shared "≥1 muscle group + equipment" requirement for any UI that creates/edits exercises
export const exerciseFieldsValid = ({ muscle, equipment }) =>
  !!(muscle && muscle.split(',').map(s => s.trim()).filter(Boolean).length) && !!(equipment && equipment.trim());
