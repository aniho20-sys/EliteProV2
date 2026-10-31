// How late a client may still book a session: at least this many hours before it (Ani
// 2026-10-31, B83). The coach chooses; 12 until they do, as the public booking page always
// had. The coach booking for a client is never held to it. The server refuses a client's
// booking made too late (onScheduleBooked) and offers strangers only hours this far ahead
// (functions/publicBooking.js) — functions/bookingNotice.js is the twin, kept in step by
// src/utils/bookingNotice.test.js.

export const BOOKING_NOTICE_OPTIONS = [0, 2, 6, 12, 24, 48];
export const DEFAULT_BOOKING_NOTICE = 12;

export const bookingNotice = (coach) => (BOOKING_NOTICE_OPTIONS.includes(coach?.bookingNoticeHours)
  ? coach.bookingNoticeHours : DEFAULT_BOOKING_NOTICE);

// Too soon to book a session starting at sessionMs — or already started.
export const tooSoonToBook = (hours, sessionMs, nowMs = Date.now()) => sessionMs < nowMs + hours * 60 * 60 * 1000;
