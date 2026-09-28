// Error monitoring for the web app — the phone side reports, this side keeps count.
//
// Until 2026-09-28 nothing did: a student whose phone showed a white screen, or whose
// button silently failed, was invisible unless they told Ani (production audit
// 2026-09-28, High-value 1). No third-party service: reports land in our own Firestore
// and Ani is told by push (and by email if the Trigger Email extension is installed).
//
// Reports are grouped by fingerprint (the message with numbers blanked, plus where it was
// thrown), so one bug hit by twenty students is one document with a count of twenty, and
// one notification rather than twenty.
//
// The endpoint accepts reports from signed-out callers too — the login page can crash —
// so everything here is bounded: every field is truncated, and a per-day budget caps how
// many reports are stored, how many distinct errors are created and how many
// notifications go out, whatever a caller sends.

const crypto = require('crypto');

const LIMITS = {
  message: 500,
  stack: 4000,
  url: 300,
  userAgent: 300,
  build: 40,
  users: 20, // distinct uids remembered per error
};
const DAILY = {
  reports: 2000,
  newErrors: 200,
  notifications: 20,
};
const RENOTIFY_MS = 24 * 60 * 60 * 1000;
const SOURCES = ['window', 'promise', 'boundary'];

const clip = (v, n) => String(v ?? '').slice(0, n);

// Strips the query string and anything after the route: an invite link carries a code,
// and nothing here needs it.
function cleanUrl(url) {
  const s = clip(url, LIMITS.url);
  const [base, hash = ''] = s.split('#');
  return `${base.split('?')[0]}${hash ? `#${hash.split('?')[0]}` : ''}`;
}

// Returns a clean report, or null for one not worth keeping.
function normalizeReport(data) {
  const d = data || {};
  const message = clip(d.message, LIMITS.message).trim();
  if (!message) return null;
  return {
    message,
    stack: clip(d.stack, LIMITS.stack),
    source: SOURCES.includes(d.source) ? d.source : 'window',
    url: cleanUrl(d.url),
    userAgent: clip(d.userAgent, LIMITS.userAgent),
    build: clip(d.build, LIMITS.build),
  };
}

// The first stack line that points at our own code, e.g. "assets/index-abc.js:1:2345".
// Bundles are renamed every deploy, so the file hash is blanked with the numbers.
function firstFrame(stack) {
  const line = String(stack || '').split('\n').map(s => s.trim()).find(s => /\.(m?js|jsx)(\?|:|\))/.test(s));
  return line || '';
}

function fingerprint(report) {
  const shape = (s) => s.replace(/\b[0-9a-f]{6,}\b/gi, '#').replace(/\d+/g, '#');
  return crypto.createHash('sha1')
    .update(`${shape(report.message)}|${shape(firstFrame(report.stack))}`)
    .digest('hex')
    .slice(0, 24);
}

const day = (now) => now.toISOString().slice(0, 10);

// Stores one report. Returns { stored, id, notify, count }: `notify` is true when Ani
// should hear about it now — the first time this error is seen, or the first time in a
// day — and today's notification budget is not spent.
async function recordClientError(db, report, { uid = null, now = new Date() } = {}) {
  const id = fingerprint(report);
  const errorRef = db.doc(`clientErrors/${id}`);
  const budgetRef = db.doc(`clientErrorBudget/${day(now)}`);
  const at = now.toISOString();

  return db.runTransaction(async (tx) => {
    const [errorSnap, budgetSnap] = await Promise.all([tx.get(errorRef), tx.get(budgetRef)]);
    const budget = { reports: 0, newErrors: 0, notifications: 0, ...(budgetSnap.exists ? budgetSnap.data() : {}) };

    if (budget.reports >= DAILY.reports) return { stored: false, id };
    if (!errorSnap.exists && budget.newErrors >= DAILY.newErrors) return { stored: false, id };

    const prev = errorSnap.exists ? errorSnap.data() : null;
    const lastNotified = prev && prev.lastNotifiedAt ? Date.parse(prev.lastNotifiedAt) : 0;
    const due = !prev || now.getTime() - lastNotified >= RENOTIFY_MS;
    const notify = due && budget.notifications < DAILY.notifications;

    const users = prev ? [...(prev.users || [])] : [];
    if (uid && !users.includes(uid) && users.length < LIMITS.users) users.push(uid);
    const count = (prev ? prev.count || 0 : 0) + 1;

    tx.set(errorRef, {
      message: report.message,
      source: report.source,
      stack: report.stack,
      url: report.url,
      userAgent: report.userAgent,
      build: report.build,
      firstSeen: prev ? prev.firstSeen : at,
      lastSeen: at,
      count,
      users,
      lastUid: uid,
      lastNotifiedAt: notify ? at : (prev ? prev.lastNotifiedAt || null : null),
    });
    tx.set(budgetRef, {
      reports: budget.reports + 1,
      newErrors: budget.newErrors + (prev ? 0 : 1),
      notifications: budget.notifications + (notify ? 1 : 0),
    });
    return { stored: true, id, notify, count, isNew: !prev };
  });
}

module.exports = { normalizeReport, fingerprint, recordClientError, LIMITS, DAILY };
