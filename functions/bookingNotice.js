// How late a client may still book (B83) — the server twin of src/utils/bookingNotice.js,
// kept in step by a test. Unchosen: 12 hours.

const BOOKING_NOTICE_OPTIONS = [0, 2, 6, 12, 24, 48];
const DEFAULT_BOOKING_NOTICE = 12;

const bookingNotice = (coach) => (BOOKING_NOTICE_OPTIONS.includes(coach && coach.bookingNoticeHours)
  ? coach.bookingNoticeHours : DEFAULT_BOOKING_NOTICE);

module.exports = { bookingNotice, BOOKING_NOTICE_OPTIONS, DEFAULT_BOOKING_NOTICE };
