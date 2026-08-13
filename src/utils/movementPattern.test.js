import { describe, test, expect } from 'vitest';
import { inferMovementPattern, explainMovementPattern } from './exerciseUtils';

describe('inferMovementPattern — single-keyword hits', () => {
  test.each([
    ['Bulgarian Split Squat', 'Squat'],
    ['Walking Lunges', 'Squat'],
    ['Box Step Up', 'Squat'],
    ['Wall Sit', 'Squat'],
    ['Romanian Deadlift', 'Hinge'],
    ['RDL', 'Hinge'],
    ['Kettlebell Swing', 'Hinge'],
    ['Good Morning', 'Hinge'],
    ['Hip Thrust', 'Hinge'],
    ['Glute Bridge', 'Hinge'],
    ['Bench Press', 'Push'],
    ['Chest Fly', 'Push'],
    ['Ring Dip', 'Push'],
    ['Overhead Tricep Extension', 'Push'],
    ['Barbell Row', 'Pull'],
    ['Chin Up', 'Pull'],
    ['Barbell Shrug', 'Pull'],
    ["Farmer's Walk", 'Carry'],
    ['Suitcase Carry', 'Carry'],
    ['Waiter Walk', 'Carry'],
    ['Bird Dog', 'Core'],
    ['Dead Bug', 'Core'],
    ['Hollow Hold', 'Core'],
    ['Boat Pose', 'Core'],
    ['Bear Crawl', 'Locomotion'],
    ['Crab Walk', 'Locomotion'],
    ['Scorpion Stretch', 'Locomotion'],
    ['Cable Chop', 'Rotation'],
    ['Russian Twist', 'Rotation'],
    ['Landmine Rotation', 'Rotation'],
  ])('%s → %s', (name, expected) => {
    expect(inferMovementPattern(name)).toBe(expected);
  });
});

describe('priority order when several patterns match', () => {
  // Ani's rule: whichever pattern owns the dominant hip/knee action wins.
  test.each([
    ['Squat Push Press', 'Squat'],
    ['Leg Press', 'Squat'],
    ['Sumo Deadlift High Pull', 'Hinge'],
    ['Deadlift to Row', 'Hinge'],
    ['Pallof Press', 'Core'],
    ['Landmine Rotation Press', 'Rotation'],
    ['Suitcase Carry Lunge', 'Carry'],
    ['Bear Crawl Push Up', 'Locomotion'],
  ])('%s → %s', (name, expected) => {
    expect(inferMovementPattern(name)).toBe(expected);
  });

  test('a tie is reported as medium confidence, not high', () => {
    const r = explainMovementPattern('Leg Press');
    expect(r.confidence).toBe('medium');
    expect(r.hits.map(h => h.pattern).sort()).toEqual(['Push', 'Squat']);
  });

  test('several keywords from one pattern is still a single claim', () => {
    const r = explainMovementPattern('Lat Pulldown');
    expect(r.confidence).toBe('high');
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0].keywords).toEqual(expect.arrayContaining(['pull', 'pulldown']));
  });
});

describe('keywords are matched on token prefixes, never mid-word', () => {
  test('"throw" does not count as "row"', () => {
    expect(inferMovementPattern('Medicine Ball Throw')).toBe('');
  });

  test('plurals and closed compounds still match', () => {
    expect(inferMovementPattern('Barbell Rows')).toBe('Pull');
    expect(inferMovementPattern('Pullup')).toBe('Pull');
    expect(inferMovementPattern('Pushdown')).toBe('Push');
    expect(inferMovementPattern('Dips')).toBe('Push');
  });

  test('a phrase needs its words adjacent and in order', () => {
    expect(inferMovementPattern('Leg Press')).toBe('Squat');
    // "leg" and "raise" both present but not as the phrase "leg raise"
    expect(inferMovementPattern('Single Leg Calf Raise')).toBe('');
  });

  test('hyphens and punctuation are normalised away', () => {
    expect(inferMovementPattern('Push-Up')).toBe('Push');
    expect(inferMovementPattern('Pull-Ups')).toBe('Pull');
  });
});

describe('blocked keywords fall through to a human instead of a wrong answer', () => {
  test('a tricep kickback is not a hinge', () => {
    expect(inferMovementPattern('Tricep Kickback')).toBe('');
    expect(explainMovementPattern('Tricep Kickback').confidence).toBe('low');
  });

  test('an unqualified kickback still counts as a hinge', () => {
    expect(inferMovementPattern('Cable Glute Kickback')).toBe('Hinge');
  });

  test('a leg curl is not a pull', () => {
    expect(inferMovementPattern('Leg Curl')).toBe('');
    expect(inferMovementPattern('Nordic Curl')).toBe('');
    expect(inferMovementPattern('Seated Hamstring Curl')).toBe('');
  });

  test('an arm curl still counts as a pull', () => {
    expect(inferMovementPattern('Hammer Curl')).toBe('Pull');
    expect(inferMovementPattern('Barbell Curl')).toBe('Pull');
  });
});

describe('no match', () => {
  test.each(['Calf Raise', 'Turkish Get Up', 'Burpee', 'Hip Abduction', ''])(
    '%s → empty string, low confidence',
    (name) => {
      const r = explainMovementPattern(name);
      expect(r.pattern).toBe('');
      expect(r.confidence).toBe('low');
    },
  );

  test('handles null and undefined without throwing', () => {
    expect(inferMovementPattern(null)).toBe('');
    expect(inferMovementPattern(undefined)).toBe('');
  });
});
