import { describe, test, expect } from 'vitest';
import { exerciseLibrary, equipmentTypes, muscleGroups, movementPatterns } from './exercises';
import { findDuplicateExercise, findFamilyVariants } from '../utils/exerciseDuplicates';
import { sortExercisesByName } from '../utils/exerciseUtils';

// The starter library every coach gets. B43 (Ani 2026-10-10) added the Barbell / Dumbbell /
// Cable / Machine versions of 30 movements, named "Movement (Equipment)", and renamed 15
// existing entries to match. Workout logs and plans point at these by id, and a coach's
// own merged exercises can point at them too (mergedInto), so ids must never change.

// The ids that existed before B43 and the name each was known by — kept as an alias so a
// coach searching or typing the old name still lands on the same exercise.
const RENAMED = {
  'bench-press': 'Bench Press', 'incline-db-press': 'Incline Dumbbell Press', 'cable-fly': 'Cable Fly',
  'barbell-row': 'Barbell Row', 'lat-pulldown': 'Lat Pulldown', 'overhead-press': 'Overhead Press',
  'lateral-raise': 'Lateral Raise', squat: 'Barbell Squat', 'romanian-deadlift': 'Romanian Deadlift',
  'calf-raise': 'Calf Raise', lunge: 'Lunge', 'barbell-curl': 'Barbell Curl', 'hammer-curl': 'Hammer Curl',
  'skull-crusher': 'Skull Crusher', 'cable-crunch': 'Cable Crunch',
};
const UNCHANGED = ['push-up', 'deadlift', 'pull-up', 'face-pull', 'leg-press', 'leg-curl', 'tricep-pushdown', 'plank', 'hanging-leg-raise'];

const byId = (id) => exerciseLibrary.find(e => e.id === id);

describe('the starter exercise library', () => {
  test('ids and names are unique', () => {
    expect(new Set(exerciseLibrary.map(e => e.id)).size).toBe(exerciseLibrary.length);
    expect(new Set(exerciseLibrary.map(e => e.name.toLowerCase())).size).toBe(exerciseLibrary.length);
  });

  test('every equipment, muscle and movement pattern is one the app knows', () => {
    for (const e of exerciseLibrary) {
      expect(equipmentTypes, e.id).toContain(e.equipment);
      for (const m of e.muscle.split(', ')) expect(muscleGroups, e.id).toContain(m);
      if (e.movementPattern) expect(movementPatterns, e.id).toContain(e.movementPattern);
    }
  });

  test('every id from before the variants is still there; renamed ones answer to their old name', () => {
    for (const [id, oldName] of Object.entries(RENAMED)) {
      expect(byId(id), id).toBeDefined();
      expect(byId(id).aliases, id).toContain(oldName);
    }
    for (const id of UNCHANGED) expect(byId(id), id).toBeDefined();
  });

  test('Leg Curl and Calf Raise stay unclassified — neither is one of the eight patterns (#35)', () => {
    expect(byId('leg-curl').movementPattern).toBeUndefined();
    expect(byId('calf-raise').movementPattern).toBeUndefined();
  });

  test('a variant is named "Movement (Equipment)" with its own equipment', () => {
    for (const e of exerciseLibrary.filter(x => / \((Barbell|Dumbbell|Cable|Machine)\)$/.test(x.name))) {
      expect(e.name.endsWith(`(${e.equipment})`), e.id).toBe(true);
    }
  });

  test('Bicep Curl comes in all four, and they sort next to each other', () => {
    const curls = exerciseLibrary.filter(e => e.name.startsWith('Bicep Curl ('));
    expect(curls.map(e => e.equipment).sort()).toEqual(['Barbell', 'Cable', 'Dumbbell', 'Machine']);
    const sorted = sortExercisesByName(exerciseLibrary).map(e => e.name);
    const first = sorted.indexOf('Bicep Curl (Barbell)');
    expect(sorted.slice(first, first + 4)).toEqual(['Bicep Curl (Barbell)', 'Bicep Curl (Cable)', 'Bicep Curl (Dumbbell)', 'Bicep Curl (Machine)']);
  });

  test('no two starter exercises are the same movement on the same equipment', () => {
    for (const e of exerciseLibrary) expect(findDuplicateExercise(exerciseLibrary, e, e.id), e.id).toBeNull();
  });

  test('a coach typing a name they already know lands on the starter exercise, not a new copy', () => {
    const found = (name, equipment) => findDuplicateExercise(exerciseLibrary, { name, equipment })?.id;
    expect(found('Barbell Curl', 'Barbell')).toBe('barbell-curl');
    expect(found('Cable Bicep Curl', 'Cable')).toBe('bicep-curl-cable');
    expect(found('Overhead Press', 'Barbell')).toBe('overhead-press');
    expect(found('Goblet Squat', 'Dumbbell')).toBe('squat-dumbbell');
    // The same name on other equipment is a sibling, not a duplicate.
    expect(findFamilyVariants(exerciseLibrary, { name: 'Bicep Curl', equipment: 'Kettlebell' }).length).toBe(4);
  });
});
