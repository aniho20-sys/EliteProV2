'use strict';

/**
 * The founding-places queue. Pure arithmetic, no emulator needed.
 *
 * This calculation has now been wrong in production twice, both times reading plausibly
 * while being false:
 *
 *   1. Founding places were derived from the number of trainer DOCUMENTS, so 37 abandoned
 *      test accounts consumed them and the card said "0 places left" before a single real
 *      trainer existed.
 *   2. Counting signup EVENTS fixed that, and then Ani's own test signup on 2026-08-20
 *      took founding place #1 and pushed a notification to her phone announcing itself.
 *
 * Both were numbers nobody could check by looking at them, which is exactly the kind that
 * needs a test rather than a careful read.
 */

const { summariseSignups } = require('../signupQueue');

const FOUNDING = 5;
const ev = (id, day, extra = {}) => ({ id, createdAt: `2026-08-${day}T10:00:00.000Z`, ...extra });

describe('counting', () => {
  test('no signups yet: every place is still open', () => {
    const s = summariseSignups([], FOUNDING);
    expect(s.signupCount).toBe(0);
    expect(s.excludedCount).toBe(0);
    expect(s.foundingRemaining).toBe(FOUNDING);
    expect(s.rows).toEqual([]);
  });

  test('one signup takes one place', () => {
    const s = summariseSignups([ev('a', '20')], FOUNDING);
    expect(s.signupCount).toBe(1);
    expect(s.foundingRemaining).toBe(4);
    expect(s.rows[0]).toMatchObject({ signupNumber: 1, withinFounding: true });
  });

  test('more signups than places: the surplus is numbered but not founding', () => {
    const s = summariseSignups(
      ['20', '21', '22', '23', '24', '25', '26'].map((d, i) => ev(`e${i}`, d)),
      FOUNDING,
    );
    expect(s.signupCount).toBe(7);
    expect(s.foundingRemaining).toBe(0);          // never negative
    expect(s.rows[4]).toMatchObject({ signupNumber: 5, withinFounding: true });
    expect(s.rows[5]).toMatchObject({ signupNumber: 6, withinFounding: false });
  });

  test('order comes from createdAt, not from the order they were handed over', () => {
    const s = summariseSignups([ev('late', '25'), ev('early', '20')], FOUNDING);
    expect(s.rows.map(r => r.id)).toEqual(['early', 'late']);
    expect(s.rows[0].signupNumber).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
describe('GUARDIAN: an excluded signup holds no place', () => {
  test("Ani's own test signup does not consume a founding place", () => {
    // The 2026-08-20 case exactly: one event, marked as her own testing.
    const s = summariseSignups([ev('own-test', '20', { excluded: true })], FOUNDING);
    expect(s.signupCount).toBe(0);
    expect(s.excludedCount).toBe(1);
    expect(s.foundingRemaining).toBe(FOUNDING);
  });

  test('an excluded event is still returned, so it can be put back', () => {
    // Excluding is reversible and the event is never deleted (CLAUDE.md #27). A row that
    // vanished from the list could not be un-excluded from the UI.
    const s = summariseSignups([ev('own-test', '20', { excluded: true })], FOUNDING);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]).toMatchObject({ id: 'own-test', excluded: true, signupNumber: null, withinFounding: false });
  });

  test('excluding one renumbers everybody behind it', () => {
    // The first real trainer should be #1, not #2 with a gap where the test used to be.
    const s = summariseSignups([
      ev('own-test', '20', { excluded: true }),
      ev('real-1', '21'),
      ev('real-2', '22'),
    ], FOUNDING);
    expect(s.rows.find(r => r.id === 'real-1').signupNumber).toBe(1);
    expect(s.rows.find(r => r.id === 'real-2').signupNumber).toBe(2);
    expect(s.foundingRemaining).toBe(3);
  });

  test('an excluded event in the middle does not leave a hole', () => {
    const s = summariseSignups([
      ev('real-1', '20'),
      ev('own-test', '21', { excluded: true }),
      ev('real-2', '22'),
    ], FOUNDING);
    expect(s.rows.map(r => r.signupNumber)).toEqual([1, null, 2]);
  });

  test('excluding everything empties the queue without going negative', () => {
    const s = summariseSignups(
      ['20', '21'].map((d, i) => ev(`e${i}`, d, { excluded: true })),
      FOUNDING,
    );
    expect(s.signupCount).toBe(0);
    expect(s.foundingRemaining).toBe(FOUNDING);
  });

  test('excluded is read as a boolean, not as whatever Firestore stored', () => {
    const s = summariseSignups([ev('a', '20')], FOUNDING);
    expect(s.rows[0].excluded).toBe(false);
  });
});
