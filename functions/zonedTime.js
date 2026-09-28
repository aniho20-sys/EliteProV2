// A session's date and time are wall-clock values in the trainer's own time zone — the
// app shows and books them in the browser's local time. Cloud Functions run in UTC, so
// `new Date('2026-09-29T10:00:00')` there means 10:00 UTC, which during British Summer
// Time is 11:00 in London: every session looked an hour later than it was, and a cancel
// 23 hours ahead was judged "early" and refunded (reports/production-audit-2026-09-28.md,
// High-value 2). The trainer's zone is stored on their profile as `timeZone` (IANA name,
// written by the app from the browser).

// Offset of `timeZone` from UTC at instant `ms`, in milliseconds (London in BST: +3600000).
function offsetAt(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const v = Object.fromEntries(parts.map(p => [p.type, Number(p.value)]));
  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// Epoch milliseconds of wall-clock `date` ('YYYY-MM-DD') + `time` ('HH:MM') in `timeZone`.
// With no zone, or one this runtime does not know, the value is read as UTC — which is
// exactly what happened before zones were stored, so an old profile behaves as it did.
function zonedToEpochMs(date, time, timeZone) {
  const [y, mo, d] = String(date).split('-').map(Number);
  const [h, mi] = String(time || '00:00').split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (!timeZone) return wall;
  try {
    // Two passes: the first offset is taken at a guess that can sit on the wrong side of
    // a clock change; the second, taken at the corrected instant, is the right one.
    const first = wall - offsetAt(wall, timeZone);
    return wall - offsetAt(first, timeZone);
  } catch {
    return wall; // RangeError: unknown time zone
  }
}

module.exports = { zonedToEpochMs };
