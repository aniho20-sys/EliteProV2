import { describe, test, expect } from 'vitest';
import { matchesExerciseQuery } from './exerciseSearch';
import { normalizeExerciseName, equipmentInName, findDuplicateExercise } from './exerciseDuplicates';
import { exerciseLibrary } from '../data/exercises';

// The searches the 2026-10-10 critique (B45) found returning nothing, or a partial list
// that looked complete, on the 100-exercise library.
const find = (q) => exerciseLibrary.filter(e => matchesExerciseQuery(e, q)).map(e => e.name);

describe('searching exercises', () => {
  test('words in any order', () => {
    expect(find('curl dumbbell')).toContain('Bicep Curl (Dumbbell)');
    expect(find('dumbbell curl')).toContain('Bicep Curl (Dumbbell)');
  });

  test('gym shorthand and plurals', () => {
    expect(find('db curl')).toContain('Bicep Curl (Dumbbell)');
    expect(find('biceps')).toEqual(expect.arrayContaining(['Bicep Curl (Cable)', 'Hammer Curl (Dumbbell)', 'Preacher Curl (Machine)']));
    expect(find('curls')).toContain('Bicep Curl (Barbell)');
  });

  test('words typed together', () => {
    expect(find('pullup')).toContain('Pull Up');
    expect(find('pushup')).toContain('Push Up');
  });

  test('a muscle finds every exercise that works it, not just the ones named after it', () => {
    const chest = exerciseLibrary.filter(e => e.muscle.split(', ').includes('Chest')).map(e => e.name);
    expect(chest.length).toBeGreaterThan(10);
    expect(find('chest')).toEqual(expect.arrayContaining(chest));
  });

  test('a renamed exercise by its old name, and a Chinese alias', () => {
    expect(find('barbell curl')).toContain('Bicep Curl (Barbell)');
    expect(matchesExerciseQuery({ name: 'Bench Press', aliases: ['臥推'] }, '臥推')).toBe(true);
  });

  test('an empty search matches everything; nonsense matches nothing', () => {
    expect(find('').length).toBe(exerciseLibrary.length);
    expect(find('zzqx')).toEqual([]);
  });
});

describe('the same exercise typed another way', () => {
  test('equipment words and plurals do not make a new movement', () => {
    expect(normalizeExerciseName('Cable Bicep Curls')).toBe(normalizeExerciseName('Bicep Curl (Cable)'));
    expect(normalizeExerciseName('Machine')).toBe('machine'); // never collapses to nothing
    // A coach's own "Bicep Curls" on Cable is the starter "Bicep Curl (Cable)".
    expect(findDuplicateExercise(exerciseLibrary, { name: 'Bicep Curls', equipment: 'Cable' })?.id).toBe('bicep-curl-cable');
  });

  test('the equipment a name spells out — and none when it names two (#35)', () => {
    expect(equipmentInName('Cable Bicep Curl')).toBe('Cable');
    expect(equipmentInName('DB Row')).toBe('Dumbbell');
    expect(equipmentInName('Smith Machine Squat')).toBe('Machine');
    expect(equipmentInName('Bicep Curl')).toBe('');
    expect(equipmentInName('Cable or Dumbbell Fly')).toBe('');
  });
});
