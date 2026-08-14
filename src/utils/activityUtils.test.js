import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getLastActivity, getClientActivityDates, isActiveWithin } from './activityUtils';

const TODAY = '2026-08-14';

// A client who trains only in booked sessions — the exact shape that log-only logic
// mislabels as inactive.
const sessionOnlyClient = {
  getWorkoutLogs: () => [],
  getSchedule: () => [
    { clientId: 'c1', date: '2026-08-12', status: 'completed', type: 'Training Session' },
    { clientId: 'c1', date: '2026-08-20', status: 'confirmed', type: 'Training Session' },
  ],
  today: TODAY,
};

describe('getLastActivity', () => {
  test('a client who only has completed sessions is active', () => {
    const { daysSince, label } = getLastActivity('c1', sessionOnlyClient);
    expect(daysSince).toBe(2);
    expect(label).toBe('Training Session');
  });

  test('takes whichever of log or session is more recent', () => {
    const deps = {
      getWorkoutLogs: () => [{ date: '2026-08-01', planId: 'p1' }],
      getSchedule: () => [{ date: '2026-08-13', status: 'completed', type: 'Training Session' }],
      today: TODAY,
    };
    expect(getLastActivity('c1', deps).daysSince).toBe(1);

    const logIsNewer = {
      getWorkoutLogs: () => [{ date: '2026-08-13', planId: 'p1' }],
      getSchedule: () => [{ date: '2026-08-01', status: 'completed' }],
      plans: [{ id: 'p1', name: 'Upper Body' }],
      today: TODAY,
    };
    const r = getLastActivity('c1', logIsNewer);
    expect(r.daysSince).toBe(1);
    expect(r.label).toBe('Upper Body');
  });

  test('a booked-but-not-completed session is not activity', () => {
    const deps = {
      getWorkoutLogs: () => [],
      getSchedule: () => [{ date: '2026-08-13', status: 'confirmed' }],
      today: TODAY,
    };
    expect(getLastActivity('c1', deps).daysSince).toBeNull();
  });

  test('no logs and no sessions reads as null, not zero', () => {
    const deps = { getWorkoutLogs: () => [], getSchedule: () => [], today: TODAY };
    expect(getLastActivity('c1', deps)).toEqual({ daysSince: null, label: null });
  });
});

describe('isActiveWithin', () => {
  test('a session-only client counts as retained', () => {
    expect(isActiveWithin('c1', sessionOnlyClient, 30)).toBe(true);
  });

  test('falls outside the window once the last session is old enough', () => {
    const deps = {
      getWorkoutLogs: () => [],
      getSchedule: () => [{ date: '2026-06-01', status: 'completed' }],
      today: TODAY,
    };
    expect(isActiveWithin('c1', deps, 30)).toBe(false);
  });

  test('a client with no history at all is not active', () => {
    const deps = { getWorkoutLogs: () => [], getSchedule: () => [], today: TODAY };
    expect(isActiveWithin('c1', deps, 30)).toBe(false);
  });
});

describe('getClientActivityDates', () => {
  test('unions log dates and completed session dates without duplicates', () => {
    const deps = {
      getWorkoutLogs: () => [{ date: '2026-08-12' }, { date: '2026-08-10' }],
      getSchedule: () => [
        { date: '2026-08-12', status: 'completed' },
        { date: '2026-08-13', status: 'completed' },
        { date: '2026-08-14', status: 'confirmed' },
      ],
    };
    expect(getClientActivityDates('c1', deps).sort()).toEqual(['2026-08-10', '2026-08-12', '2026-08-13']);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
// This same bug has now shipped twice — the trainer dashboard was fixed in Session 35 and
// BusinessAnalyticsPage kept its own log-only copy until 2026-08-14, so the two screens
// disagreed about whether the same client was active. These tests fail if anyone writes a
// third copy. Proven to bite: reinstating `logs.some(l => l.date >= cutoff)` in
// BusinessAnalyticsPage makes the first of them fail.
const SRC = new URL('..', import.meta.url).pathname;

const sourceFiles = (dir) => readdirSync(dir).flatMap(entry => {
  const full = join(dir, entry);
  if (statSync(full).isDirectory()) return sourceFiles(full);
  return /\.jsx?$/.test(entry) && !/\.test\.jsx?$/.test(entry) ? [full] : [];
});

// Words that only appear when a file is deciding whether a client is training or not.
const ACTIVITY_WORDS = /\b(inactive|retention|retained|churn|activeClients?|isActive|activeCount|activeThisWeek)\b/i;

describe('GUARDIAN: activity judgements must go through activityUtils', () => {
  const files = sourceFiles(join(SRC, 'pages')).concat(sourceFiles(join(SRC, 'components')));

  test('no file decides "active" from workoutLogs without the shared helper', () => {
    const offenders = files.filter(file => {
      const src = readFileSync(file, 'utf8');
      if (!ACTIVITY_WORDS.test(src)) return false;
      // Navigation's isActive comes from react-router NavLink, not from client training.
      if (!/getWorkoutLogs\s*\(/.test(src)) return false;
      return !/from '.*utils\/activityUtils'/.test(src);
    });
    expect(offenders.map(f => f.replace(SRC, 'src/'))).toEqual([]);
  });

  test('no file compares a workout log date against a recency cutoff by hand', () => {
    const offenders = files.filter(file => {
      const src = readFileSync(file, 'utf8');
      // e.g. `logs.some(l => l.date >= recentCutoff)` — the exact shape of both bugs.
      return /getWorkoutLogs\s*\([^)]*\)[\s\S]{0,200}?\.\s*some\s*\(\s*\w+\s*=>\s*\w+\.date\s*>=/.test(src)
        || /\blogs\s*\.\s*some\s*\(\s*\w+\s*=>\s*\w+\.date\s*>=/.test(src);
    });
    expect(offenders.map(f => f.replace(SRC, 'src/'))).toEqual([]);
  });

  test('the guardian can actually see an offending file', () => {
    // Guards the guard: if the detection regex silently stops matching, the two tests
    // above would pass on a codebase full of the bug.
    const planted = "const logs = getWorkoutLogs(c.id);\nconst isActive = logs.some(l => l.date >= recentCutoff);";
    expect(/\blogs\s*\.\s*some\s*\(\s*\w+\s*=>\s*\w+\.date\s*>=/.test(planted)).toBe(true);
    expect(ACTIVITY_WORDS.test(planted)).toBe(true);
  });
});
