export const resolveExerciseName = (library, id, fallback) =>
  library.find(e => e.id === id)?.name || fallback || id;
