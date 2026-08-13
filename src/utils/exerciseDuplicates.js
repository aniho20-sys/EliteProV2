// Duplicate detection for the exercise library.
//
// DEFINITION (Ani, 2026-08-11 — this is the whole point of this module):
// A duplicate is "same movement + same equipment". Two exercises sharing a name but
// using different equipment — Shoulder Press (Barbell) vs Shoulder Press (Dumbbell) —
// are legitimate independent variants of one family, NOT duplicates, and must never be
// merged. Only same name + same equipment appearing more than once is a real duplicate.
//
// Everything here keys off that: `familyKey` ignores equipment (so variants group
// together), `duplicateKey` includes it (so only true duplicates collide).

// Case/punctuation/spacing-insensitive. "Bulgarian Split-Squat", "bulgarian split squat"
// and "Bulgarian  Split Squat" are the same movement typed three ways.
export const normalizeExerciseName = (name) =>
  String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const normalizeEquipment = (equipment) =>
  String(equipment || '').toLowerCase().trim();

// Groups variants of one movement regardless of equipment.
export const familyKey = (name) => normalizeExerciseName(name);

// Identifies a true duplicate: same movement AND same equipment.
export const duplicateKey = (name, equipment) =>
  `${normalizeExerciseName(name)}::${normalizeEquipment(equipment)}`;

// Every name an exercise answers to — its own name plus any aliases (e.g. a Chinese
// name or an abbreviation). A new exercise matching an existing one's ALIAS is still
// the same movement, so aliases have to be part of the comparison.
export const exerciseNameKeys = (ex) => {
  const keys = new Set();
  const add = (n) => { const k = normalizeExerciseName(n); if (k) keys.add(k); };
  add(ex?.name);
  (ex?.aliases || []).forEach(add);
  return keys;
};

// Soft-merged exercises (mergedInto set) are tombstones pointing at a survivor — they
// must not be reported as duplicates of the thing they were merged into, and a trainer
// re-adding that name should land on the survivor, not resurrect the tombstone.
const isLive = (ex) => !ex?.mergedInto;

/**
 * Does this candidate collide with something already in the library?
 *
 * Returns the FIRST existing exercise whose name-or-alias matches AND whose equipment
 * matches — i.e. a true duplicate under the definition above. Returns null when the
 * name matches but the equipment differs, because that is a legitimate new variant.
 *
 * `candidate.aliases` is compared too: adding "Shoulder Press" when an existing Barbell
 * entry already lists it as an alias is still a duplicate of that entry.
 */
export const findDuplicateExercise = (library, candidate, excludeId = null) => {
  const equip = normalizeEquipment(candidate?.equipment);
  const candidateKeys = exerciseNameKeys(candidate);
  if (candidateKeys.size === 0) return null;

  return (library || []).find(ex => {
    if (!isLive(ex) || ex.id === excludeId) return false;
    if (normalizeEquipment(ex.equipment) !== equip) return false;
    const keys = exerciseNameKeys(ex);
    for (const k of candidateKeys) if (keys.has(k)) return ex;
    return false;
  }) || null;
};

/**
 * Existing exercises that share this candidate's movement but use DIFFERENT equipment.
 * These are siblings in the same family — surfaced so the trainer can see "you already
 * have a Dumbbell version" while still being allowed to create the Barbell one.
 */
export const findFamilyVariants = (library, candidate, excludeId = null) => {
  const equip = normalizeEquipment(candidate?.equipment);
  const candidateKeys = exerciseNameKeys(candidate);
  if (candidateKeys.size === 0) return [];

  return (library || []).filter(ex => {
    if (!isLive(ex) || ex.id === excludeId) return false;
    if (normalizeEquipment(ex.equipment) === equip) return false;
    const keys = exerciseNameKeys(ex);
    for (const k of candidateKeys) if (keys.has(k)) return true;
    return false;
  });
};

/**
 * Name-only lookup, for the one creation path that has no equipment field
 * (ExerciseSwapModal's Custom tab). Returns every live library exercise answering to
 * this name across all equipment — so the UI can offer them instead of letting the
 * trainer create an ad-hoc duplicate of something they already own.
 */
export const findByExerciseName = (library, name) => {
  const key = normalizeExerciseName(name);
  if (!key) return [];
  return (library || []).filter(ex => isLive(ex) && exerciseNameKeys(ex).has(key));
};

/**
 * Whole-library review, grouped by the definition above.
 *
 * Returns one entry per movement family, each with:
 *   - variants:        one row per distinct equipment (legitimate — never merge)
 *   - trueDuplicates:  equipment groups holding 2+ entries (real duplicates — merge)
 *
 * `hasTrueDuplicates` is what a review table should filter on: a family with three
 * variants and no repeats is healthy, not a finding.
 */
export const groupExerciseFamilies = (library) => {
  const families = new Map();

  (library || []).filter(isLive).forEach(ex => {
    const fKey = familyKey(ex.name);
    if (!fKey) return;
    if (!families.has(fKey)) {
      families.set(fKey, { familyKey: fKey, name: ex.name, byEquipment: new Map() });
    }
    const fam = families.get(fKey);
    const eKey = normalizeEquipment(ex.equipment);
    if (!fam.byEquipment.has(eKey)) fam.byEquipment.set(eKey, []);
    fam.byEquipment.get(eKey).push(ex);
  });

  return [...families.values()].map(fam => {
    const variants = [...fam.byEquipment.entries()].map(([equipmentKey, entries]) => ({
      equipmentKey,
      equipment: entries[0].equipment || '(none)',
      entries,
      isDuplicate: entries.length > 1,
    }));
    return {
      familyKey: fam.familyKey,
      name: fam.name,
      variants,
      trueDuplicates: variants.filter(v => v.isDuplicate),
      hasTrueDuplicates: variants.some(v => v.isDuplicate),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
};
