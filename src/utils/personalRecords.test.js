import { describe, test, expect } from 'vitest';
import { recentPersonalRecords, PR_WINDOW_DAYS } from './personalRecords';

// Ani 2026-10-10: the PR cards show only records set in the last 30 days, newest first,
// so the list does not grow with every exercise a client has ever logged.
const TODAY = '2026-10-10';
const PRS = {
  squat: { weight: 100, date: '2026-10-10', name: 'Squat' },        // today
  bench: { weight: 80, date: '2026-09-11', name: 'Bench' },         // 29 days ago — last day in
  row: { weight: 70, date: '2026-09-10', name: 'Row' },             // 30 days ago — out
  curl: { weight: 20, date: '2026-10-01', name: 'Curl' },
  future: { weight: 50, date: '2026-10-11', name: 'Typo' },         // a log dated tomorrow
};

describe('recent personal records', () => {
  test('30 days including today, newest first', () => {
    expect(PR_WINDOW_DAYS).toBe(30);
    expect(recentPersonalRecords(PRS, TODAY).map(([id]) => id)).toEqual(['squat', 'curl', 'bench']);
  });

  test('keeps each record whole', () => {
    expect(recentPersonalRecords(PRS, TODAY)[0]).toEqual(['squat', PRS.squat]);
  });

  test('nothing recent, nothing at all, or a record with no date: an empty list', () => {
    expect(recentPersonalRecords({ row: PRS.row }, TODAY)).toEqual([]);
    expect(recentPersonalRecords({}, TODAY)).toEqual([]);
    expect(recentPersonalRecords(undefined, TODAY)).toEqual([]);
    expect(recentPersonalRecords({ x: { weight: 1 } }, TODAY)).toEqual([]);
  });

  test('the window crosses a month and a year end', () => {
    expect(recentPersonalRecords({ a: { weight: 1, date: '2025-12-03' } }, '2026-01-01')).toHaveLength(1);
    expect(recentPersonalRecords({ a: { weight: 1, date: '2025-12-02' } }, '2026-01-01')).toHaveLength(0);
  });
});
