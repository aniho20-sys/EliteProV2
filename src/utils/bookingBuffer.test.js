// Ani 2026-10-21: "a 12:00–1:00 session cannot be followed by someone booking 1:00".
import { describe, test, expect } from 'vitest';
import { bookingBuffer, tooClose, DEFAULT_BUFFER } from './bookingBuffer';

const at = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const noon = { time: '12:00', duration: 60, status: 'confirmed' };
const hour = (start, item, buffer = 30) => tooClose(item, at(start), at(start) + 60, buffer);

describe('the break between sessions', () => {
  test('after a 12:00–1:00 session: 1:00 is too soon, 1:30 is fine', () => {
    expect(hour('13:00', noon)).toBe(true);
    expect(hour('13:30', noon)).toBe(false);
  });
  test('before it too: a session ending at 12:00 is too close; one ending at 11:30 is fine', () => {
    expect(hour('11:00', noon)).toBe(true);
    expect(hour('10:30', noon)).toBe(false);
  });
  test('no break set: back-to-back is allowed, overlapping never is', () => {
    expect(hour('13:00', noon, 0)).toBe(false);
    expect(hour('12:30', noon, 0)).toBe(true);
  });
  test('time simply blocked off needs no break; a group class does; a cancelled session is nothing', () => {
    expect(hour('13:00', { ...noon, isBlocked: true })).toBe(false);
    expect(hour('13:00', { ...noon, blocked: true })).toBe(false);          // as a client sees it
    expect(hour('13:00', { ...noon, isBlocked: true, groupClassId: 'g1' })).toBe(true);
    expect(hour('13:00', { ...noon, status: 'cancelled' })).toBe(false);
  });
  test('30 minutes until the coach chooses; only the offered values count', () => {
    expect(DEFAULT_BUFFER).toBe(30);
    expect(bookingBuffer({})).toBe(30);
    expect(bookingBuffer({ bookingBuffer: 0 })).toBe(0);
    expect(bookingBuffer({ bookingBuffer: 60 })).toBe(60);
    expect(bookingBuffer({ bookingBuffer: 45 })).toBe(30);
    expect(bookingBuffer(null)).toBe(30);
  });
});
