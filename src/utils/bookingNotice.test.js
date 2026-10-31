// B83 (Ani 2026-10-31): how late a client may still book is the coach's choice.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { bookingNotice, tooSoonToBook, BOOKING_NOTICE_OPTIONS, DEFAULT_BOOKING_NOTICE } from './bookingNotice';

const HOUR = 60 * 60 * 1000;

describe('the coach’s booking notice', () => {
  test('12 hours until chosen (what the public page always had); only offered values count', () => {
    expect(DEFAULT_BOOKING_NOTICE).toBe(12);
    expect(bookingNotice({})).toBe(12);
    expect(bookingNotice({ bookingNoticeHours: 0 })).toBe(0);
    expect(bookingNotice({ bookingNoticeHours: 5 })).toBe(12);
  });
  test('too soon means inside the notice — or already started', () => {
    const now = Date.UTC(2026, 9, 31, 12);
    expect(tooSoonToBook(12, now + 11 * HOUR, now)).toBe(true);
    expect(tooSoonToBook(12, now + 13 * HOUR, now)).toBe(false);
    expect(tooSoonToBook(0, now + 1, now)).toBe(false);
    expect(tooSoonToBook(0, now - 1, now)).toBe(true);
  });
  test('the server and the rules use the same options and default', () => {
    const list = JSON.stringify(BOOKING_NOTICE_OPTIONS).replace(/,/g, ', ');
    const server = readFileSync(join(cwd(), 'functions/bookingNotice.js'), 'utf8');
    expect(server).toContain(`const BOOKING_NOTICE_OPTIONS = ${list};`);
    expect(server).toContain(`const DEFAULT_BOOKING_NOTICE = ${DEFAULT_BOOKING_NOTICE};`);
    expect(readFileSync(join(cwd(), 'firestore.rules'), 'utf8')).toContain(`bookingNoticeHours in ${list}`);
  });
});
