// functions/zonedTime.js — a trainer's wall-clock session time to a real instant.
// Pure; runs in the emulator suite only because that is where functions tests run.

const { zonedToEpochMs } = require('../zonedTime');

const iso = (ms) => new Date(ms).toISOString();

describe('zonedToEpochMs', () => {
  test('London in summer time is an hour ahead of UTC', () => {
    expect(iso(zonedToEpochMs('2026-09-29', '10:00', 'Europe/London'))).toBe('2026-09-29T09:00:00.000Z');
  });

  test('London in winter is UTC', () => {
    expect(iso(zonedToEpochMs('2026-12-01', '10:00', 'Europe/London'))).toBe('2026-12-01T10:00:00.000Z');
  });

  test('Hong Kong is eight hours ahead all year', () => {
    expect(iso(zonedToEpochMs('2026-09-29', '10:00', 'Asia/Hong_Kong'))).toBe('2026-09-29T02:00:00.000Z');
    expect(iso(zonedToEpochMs('2026-01-15', '10:00', 'Asia/Hong_Kong'))).toBe('2026-01-15T02:00:00.000Z');
  });

  test('the day the clocks go back: the evening before and the morning after', () => {
    expect(iso(zonedToEpochMs('2026-10-24', '20:00', 'Europe/London'))).toBe('2026-10-24T19:00:00.000Z');
    expect(iso(zonedToEpochMs('2026-10-25', '09:00', 'Europe/London'))).toBe('2026-10-25T09:00:00.000Z');
  });

  test('crossing midnight into another UTC day', () => {
    expect(iso(zonedToEpochMs('2026-09-29', '00:30', 'Europe/London'))).toBe('2026-09-28T23:30:00.000Z');
  });

  test('no zone, or an unknown one, reads the time as UTC — how it worked before', () => {
    expect(iso(zonedToEpochMs('2026-09-29', '10:00'))).toBe('2026-09-29T10:00:00.000Z');
    expect(iso(zonedToEpochMs('2026-09-29', '10:00', 'Not/AZone'))).toBe('2026-09-29T10:00:00.000Z');
  });
});
