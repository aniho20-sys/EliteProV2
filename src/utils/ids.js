// Document ids: `<prefix>-<ms>-<4 chars>`. Date.now() like the app has always used (#4),
// plus a short random suffix — two writes in the same millisecond (a Promise.all over
// several hours or several clients) used to get the same id, and the second overwrote
// the first (B52).
export function newId(prefix, now = Date.now(), random = Math.random) {
  const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0');
  return `${prefix}-${now}-${suffix}`;
}

// When an id was made, read back from it — for ids with or without the suffix. 0 when the
// id carries no timestamp.
export function idTime(id = '') {
  const m = /^[^-]+-(\d{13,})(?:-|$)/.exec(String(id));
  return m ? Number(m[1]) : 0;
}
