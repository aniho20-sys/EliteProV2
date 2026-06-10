function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns today's date as YYYY-MM-DD in the user's LOCAL timezone.
// DO NOT use new Date().toISOString().split('T')[0] — that returns UTC date,
// which is wrong for users east of UTC (e.g. HKT rolls over at 11pm local time).
export function localToday() {
  return fmtDate(new Date());
}

// Returns a date n days from today as YYYY-MM-DD in local timezone.
export function localDateAdd(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

// Parses a YYYY-MM-DD string as LOCAL midnight (not UTC midnight).
// new Date('2026-04-23') is UTC midnight, which in UTC+8 renders as April 22.
export function parseLocalDate(str) {
  const [y, m, day] = str.split('-').map(Number);
  return new Date(y, m - 1, day);
}

// Formats a YYYY-MM-DD string as "Wed 10 June" for dashboard greeting headers.
export function formatDayDate(str = localToday()) {
  return parseLocalDate(str).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' });
}
