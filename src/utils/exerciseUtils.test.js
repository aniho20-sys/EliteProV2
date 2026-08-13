import { describe, test, expect } from 'vitest';
import { canonicalExercise, resolveExerciseName } from './exerciseUtils';
import { exerciseLibrary as seedExercises } from '../data/exercises';

// Soft-merge resolution (CLAUDE.md #27). A merged exercise keeps its document and gains a
// mergedInto pointer; historical workoutPlans/workoutLogs keep their original exerciseId
// and are resolved through that pointer at read time. Nothing is ever batch-rewritten.
//
// The case these tests exist for: on 2026-08-11 Ani approved merging the trainer-created
// "Military press" into the SEED exercise "Overhead Press". A seed exercise has no
// Firestore document of its own — the 24 entries in data/exercises.js are static frontend
// data appended in-memory by AppContext's exercises listener. So the survivor of this
// merge is not a real document, and the question was whether a tombstone pointing at a
// seed id still resolves. It does, because getExercises() returns one merged array
// containing both Firestore docs and the seed entries, and canonicalExercise() looks the
// pointer up in that same array.

const OVERHEAD_PRESS = seedExercises.find(e => e.id === 'overhead-press');

// Mirrors what getExercises() hands to the UI: trainer docs first, then the seed entries.
const mergedLibrary = (trainerDocs = []) => [...trainerDocs, ...seedExercises];

const militaryPressTombstone = {
  id: 'custom-military-press',
  name: 'Military press',
  equipment: 'Barbell',
  trainerId: 'trainer-1',
  mergedInto: 'overhead-press',
};

describe('canonicalExercise — tombstone pointing at a SEED exercise', () => {
  test('the seed survivor is present in the merged library at all', () => {
    expect(OVERHEAD_PRESS).toBeDefined();
    expect(mergedLibrary().find(e => e.id === 'overhead-press')).toBeDefined();
  });

  test('resolves a trainer-doc tombstone to the seed exercise', () => {
    const lib = mergedLibrary([militaryPressTombstone]);
    const resolved = canonicalExercise(lib, 'custom-military-press');
    expect(resolved.id).toBe('overhead-press');
    expect(resolved.name).toBe(OVERHEAD_PRESS.name);
  });

  test('a historical log/plan entry displays the survivor name', () => {
    const lib = mergedLibrary([militaryPressTombstone]);
    // What every page calls: resolveExerciseName(library, entry.exerciseId, fallback)
    expect(resolveExerciseName(lib, 'custom-military-press', 'Exercise')).toBe('Overhead Press');
  });

  test('the survivor itself still resolves to itself', () => {
    const lib = mergedLibrary([militaryPressTombstone]);
    expect(canonicalExercise(lib, 'overhead-press').id).toBe('overhead-press');
  });

  test('an unrelated exercise is unaffected by the merge', () => {
    const lib = mergedLibrary([militaryPressTombstone]);
    expect(canonicalExercise(lib, 'bench-press').id).toBe('bench-press');
  });
});

describe('canonicalExercise — general soft-merge behaviour', () => {
  test('follows a chain of pointers to the final survivor', () => {
    const lib = mergedLibrary([
      { id: 'a', name: 'A', mergedInto: 'b' },
      { id: 'b', name: 'B', mergedInto: 'overhead-press' },
    ]);
    expect(canonicalExercise(lib, 'a').id).toBe('overhead-press');
  });

  test('a pointer cycle terminates instead of hanging', () => {
    const lib = mergedLibrary([
      { id: 'x', name: 'X', mergedInto: 'y' },
      { id: 'y', name: 'Y', mergedInto: 'x' },
    ]);
    expect(canonicalExercise(lib, 'x')).toBeDefined();
  });

  test('a pointer to a missing exercise falls back to the tombstone itself', () => {
    const lib = mergedLibrary([{ id: 'orphan', name: 'Orphan', mergedInto: 'does-not-exist' }]);
    expect(canonicalExercise(lib, 'orphan').id).toBe('orphan');
  });

  test('an ad-hoc custom entry with no library record falls back to its stored name', () => {
    // ExerciseSwapModal's Custom tab creates custom-<timestamp> ids that never enter the
    // library — the stored name is the only source of truth for those.
    expect(resolveExerciseName(mergedLibrary(), 'custom-1699999999', 'Sled Push')).toBe('Sled Push');
  });
});
