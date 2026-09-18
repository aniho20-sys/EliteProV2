import { describe, test, expect } from 'vitest';
import { formatDayDate, formatLongDate, formatMonthYear, formatWeekdayShort, formatShortDate, formatFullDate } from './format';
import { parseLocalDate } from '../utils/dateUtils';

const DATE = '2026-06-10'; // a Wednesday

// ---------------------------------------------------------------------------
// GUARDIAN: English output is byte-identical to the calls these helpers replace.
// ---------------------------------------------------------------------------
// Phase 1's promise is that an English user sees no change. These pin the exact strings
// the pages produced before, computed the way the pages computed them, so that wiring a
// page onto format.js cannot move a comma.
describe('GUARDIAN: English does not move', () => {
  const d = parseLocalDate(DATE);

  test('dashboard day date — dateUtils.formatDayDate used en-US', () => {
    expect(formatDayDate(DATE, 'en'))
      .toBe(d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' }));
    expect(formatDayDate(DATE, 'en')).toBe('Wed, June 10');
  });

  test('schedule selected-day heading — SchedulePage used en', () => {
    expect(formatLongDate(DATE, 'en'))
      .toBe(d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }));
    expect(formatLongDate(DATE, 'en')).toBe('Wednesday, June 10');
  });

  test('schedule month label', () => {
    expect(formatMonthYear(DATE, 'en')).toBe(d.toLocaleDateString('en', { month: 'long', year: 'numeric' }));
    expect(formatMonthYear(DATE, 'en')).toBe('June 2026');
  });

  test('schedule day strip', () => {
    expect(formatWeekdayShort(d, 'en')).toBe(d.toLocaleDateString('en', { weekday: 'short' }));
    expect(formatWeekdayShort(d, 'en')).toBe('Wed');
  });

  test('session-list date chip — SessionDateList used en-US', () => {
    expect(formatShortDate(DATE, 'en'))
      .toBe(d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }));
    expect(formatShortDate(DATE, 'en')).toBe('Wed, Jun 10');
  });

  test('session-detail heading — SessionDateList used en-US', () => {
    expect(formatFullDate(DATE, 'en'))
      .toBe(d.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    expect(formatFullDate(DATE, 'en')).toBe('Wednesday, June 10, 2026');
  });

  test('an unknown language falls back to English', () => {
    expect(formatDayDate(DATE, 'fr')).toBe('Wed, June 10');
    expect(formatDayDate(DATE)).toBe('Wed, June 10');
  });
});

describe('zh-HK', () => {
  // Verified against Node's ICU on 2026-09-02; the same ICU tables ship in Safari/Chrome.
  test('day date', () => expect(formatDayDate(DATE, 'zh-HK')).toBe('6月10日週三'));
  test('long date', () => expect(formatLongDate(DATE, 'zh-HK')).toBe('6月10日星期三'));
  test('month label', () => expect(formatMonthYear(DATE, 'zh-HK')).toBe('2026年6月'));
  test('short date', () => expect(formatShortDate(DATE, 'zh-HK')).toBe('6月10日週三'));
  test('full date', () => expect(formatFullDate(DATE, 'zh-HK')).toBe('2026年6月10日星期三'));
  test('weekday short accepts a Date or a date string', () => {
    expect(formatWeekdayShort(parseLocalDate(DATE), 'zh-HK')).toBe('週三');
    expect(formatWeekdayShort(DATE, 'zh-HK')).toBe('週三');
  });
});
