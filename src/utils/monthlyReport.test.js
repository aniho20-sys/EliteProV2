import { describe, test, expect } from 'vitest';
import { buildMonthlyReport, reportMonthLabel } from './monthlyReport';

const set = (weight, reps) => ({ weight, reps, completed: true });
const base = { month: '2026-09', logs: [], schedule: [], bodyStats: [], prs: {} };

describe('buildMonthlyReport', () => {
  test('an empty month has nothing to show — the PDF prints its empty message', () => {
    const r = buildMonthlyReport(base);
    expect(r).toMatchObject({ completed: [], monthLogs: [], attendancePct: null, totalVolume: 0, topPRs: [], body: null, hasAnyData: false });
  });

  test('only this month counts; blocked slots are not sessions', () => {
    const r = buildMonthlyReport({
      ...base,
      schedule: [
        { date: '2026-09-02', status: 'completed' },
        { date: '2026-09-09', status: 'completed' },
        { date: '2026-09-16', status: 'cancelled' },
        { date: '2026-09-23', status: 'confirmed' },
        { date: '2026-09-30', status: 'completed', isBlocked: true },
        { date: '2026-08-26', status: 'completed' },
      ],
    });
    expect(r.completed.map(s => s.date)).toEqual(['2026-09-02', '2026-09-09']);
    expect(r.attendancePct).toBe(50); // 2 of 4 booked
  });

  test('volume counts weight × reps sets only, across the month', () => {
    const r = buildMonthlyReport({
      ...base,
      logs: [
        { date: '2026-09-03', entries: [{ unit: 'weight_reps', sets: [set(100, 5), set(100, 5)] }] },
        { date: '2026-09-10', entries: [{ unit: 'time', sets: [{ seconds: 60 }] }] },
        { date: '2026-08-31', entries: [{ sets: [set(500, 10)] }] },
      ],
    });
    expect(r.monthLogs).toHaveLength(2);
    expect(r.totalVolume).toBe(1000);
  });

  test('personal bests: heaviest six, weightless ones dropped', () => {
    const prs = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`ex${i}`, { weight: i * 10, date: '2026-09-01' }]));
    const r = buildMonthlyReport({ ...base, prs });
    expect(r.topPRs.map(p => p.exerciseId)).toEqual(['ex7', 'ex6', 'ex5', 'ex4', 'ex3', 'ex2']);
  });

  test('body composition: first and last of the month, with the change', () => {
    const r = buildMonthlyReport({
      ...base,
      bodyStats: [
        { date: '2026-09-28', weight: 78.5 },
        { date: '2026-09-01', weight: 80, waist: 90 },
        { date: '2026-08-01', weight: 82 },
      ],
    });
    expect(r.body.mode).toBe('range');
    expect(r.body.startDate).toBe('2026-09-01');
    expect(r.body.endDate).toBe('2026-09-28');
    expect(r.body.rows).toEqual([
      expect.objectContaining({ key: 'weight', start: 80, end: 78.5, delta: -1.5 }),
      expect.objectContaining({ key: 'waist', start: 90, end: null, delta: null }),
    ]);
  });

  test('one measurement in the month: a start, no end', () => {
    const r = buildMonthlyReport({ ...base, bodyStats: [{ date: '2026-09-05', weight: 80 }] });
    expect(r.body).toMatchObject({ mode: 'range', endDate: null });
    expect(r.body.rows[0]).toMatchObject({ start: 80, end: null, delta: null });
  });

  test('none this month: the latest ever, as a snapshot', () => {
    const r = buildMonthlyReport({ ...base, bodyStats: [{ date: '2026-07-01', weight: 81 }, { date: '2026-08-01', weight: 80 }] });
    expect(r.body).toMatchObject({ mode: 'snapshot', date: '2026-08-01' });
    expect(r.body.rows).toEqual([expect.objectContaining({ key: 'weight', value: 80 })]);
    expect(r.hasAnyData).toBe(true);
  });
});

describe('reportMonthLabel', () => {
  test('in the reader\'s language', () => {
    expect(reportMonthLabel('2026-09', 'en')).toBe('September 2026');
    expect(reportMonthLabel('2026-09', 'zh-HK')).toBe('2026年9月');
  });
});
