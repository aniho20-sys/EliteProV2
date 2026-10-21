// A break the coach keeps between sessions (Ani 2026-10-21): "a 12:00–1:00 session cannot be
// followed by someone at 1:00". Clients booking in the app and strangers on the public
// booking page cannot book closer than this to another session; the coach booking for
// themselves still can. Kept in step with BUFFER_OPTIONS in functions/publicBooking.js.

export const BUFFER_OPTIONS = [0, 15, 30, 60];
export const DEFAULT_BUFFER = 30;

// The coach's chosen break in minutes; 30 until they choose.
export const bookingBuffer = (coach) => (BUFFER_OPTIONS.includes(coach?.bookingBuffer) ? coach.bookingBuffer : DEFAULT_BUFFER);

const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };

// Whether a booking from startMin to endMin (same day) is too close to `item`: overlapping
// it, or within `buffer` minutes either side. Time the coach simply blocked off (lunch, a
// day off) needs no break around it; a group class does.
export function tooClose(item, startMin, endMin, buffer) {
  if (!item || item.status === 'cancelled') return false;
  const s = toMin(item.time);
  const e = s + (Number(item.duration) || 60);
  const plainBlock = item.blocked === true || (item.isBlocked && !item.groupClassId);
  const pad = plainBlock ? 0 : buffer;
  return startMin < e + pad && endMin > s - pad;
}
