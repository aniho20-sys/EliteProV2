// B51 — reminders before a session (Ani 2026-10-19). Run every hour by
// sendSessionReminders (index.js); every rule is here so it is tested without a clock.
//
//   dayBefore — the evening before, from 19:00 in the coach's own time zone.
//   soon      — about two hours before (start 45–135 minutes away: the overlap means a
//               run that fires a little late or early still catches it; the marker below
//               stops it going twice).
//
// Only confirmed sessions with a client who has the app. A session's date/time are
// wall-clock values in the coach's zone (zonedTime.js), the same reading the credit logic
// uses. Each reminder is claimed with a marker document before it is sent, so a repeated
// or overlapping run can never send it twice; a push that then fails is not retried —
// one missed reminder beats a phone buzzing twice.

const { zonedToEpochMs, localDateHour } = require('./zonedTime');

const DAY_BEFORE_HOUR = 19;
const SOON_MIN_MS = 45 * 60 * 1000;
const SOON_MAX_MS = 135 * 60 * 1000;
// The evening reminder is skipped for a session this close — the "soon" one covers it.
const DAY_BEFORE_MIN_LEAD_MS = 3 * 60 * 60 * 1000;
const MARKER_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALREADY_EXISTS = 6;

// Written Traditional Chinese for a client who chose it (CLAUDE.md #28 register rules);
// everyone else English. Push text is built on the server, so it cannot use the app's t().
const TEXT = {
  en: {
    dayBefore: (time, coach) => ({ title: 'Session tomorrow', body: `Tomorrow at ${time} with ${coach}.` }),
    soon: (time, coach) => ({ title: 'Session soon', body: `Today at ${time} with ${coach}.` }),
  },
  'zh-HK': {
    dayBefore: (time, coach) => ({ title: '明天有課堂', body: `明天 ${time}，教練 ${coach}。` }),
    soon: (time, coach) => ({ title: '課堂即將開始', body: `今天 ${time}，教練 ${coach}。` }),
  },
};

const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

const dayAfter = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return isoDate(Date.UTC(y, m - 1, d) + 86400000);
};

// Which reminder, if any, is due for one session now.
function reminderKind({ session, timeZone, nowMs }) {
  const startMs = zonedToEpochMs(session.date, session.time, timeZone);
  const lead = startMs - nowMs;
  if (lead <= 0) return null;
  if (lead > SOON_MIN_MS && lead <= SOON_MAX_MS) return 'soon';
  const local = localDateHour(nowMs, timeZone);
  if (lead >= DAY_BEFORE_MIN_LEAD_MS && dayAfter(local.date) === session.date && local.hour >= DAY_BEFORE_HOUR) return 'dayBefore';
  return null;
}

async function sendSessionReminders({ db, now, notify }) {
  const nowMs = now().getTime();
  // A window wide enough for every time zone; single-field range query (#34).
  const snap = await db.collection('schedule')
    .where('date', '>=', isoDate(nowMs - 86400000))
    .where('date', '<=', isoDate(nowMs + 2 * 86400000))
    .get();

  const users = new Map();
  const user = async (id) => {
    if (!users.has(id)) {
      const s = await db.doc(`users/${id}`).get();
      users.set(id, s.exists ? s.data() : null);
    }
    return users.get(id);
  };

  let sent = 0;
  for (const d of snap.docs) {
    const session = d.data();
    if (session.status !== 'confirmed' || session.isBlocked || !session.clientId || !session.trainerId) continue;
    if (typeof session.date !== 'string' || typeof session.time !== 'string') continue;
    const trainer = await user(session.trainerId);
    if (!trainer) continue;
    const kind = reminderKind({ session, timeZone: trainer.timeZone, nowMs });
    if (!kind) continue;
    const client = await user(session.clientId);
    // A client without the app (managed, B35) has no phone to remind; one who has left this
    // coach is no longer theirs to remind (B52).
    if (!client || client.managed || client.trainerId !== session.trainerId) continue;
    if (!Array.isArray(client.fcmTokens) || client.fcmTokens.length === 0) continue;

    // The marker names the date and time too: a session moved to another day is a new
    // appointment and gets its own reminders (B52).
    const marker = `${d.id}_${session.date}_${session.time.replace(':', '')}_${kind}`;
    try {
      await db.doc(`sessionReminders/${marker}`).create({ scheduleId: d.id, kind, createdAt: new Date(nowMs).toISOString() });
    } catch (err) {
      if (err.code === ALREADY_EXISTS) continue; // already sent by an earlier run
      console.error(`[sendSessionReminders] ${d.id}: marker failed`, err && err.message);
      continue; // one bad session must not stop everyone else's reminders (B52)
    }
    const text = (TEXT[client.language] || TEXT.en)[kind](session.time, trainer.name || '');
    try {
      await notify({ userId: session.clientId, tokens: client.fcmTokens, ...text });
      sent++;
    } catch (err) {
      console.error(`[sendSessionReminders] ${d.id}: push failed`, err && err.message);
    }
  }

  // Markers are only needed until the session has passed.
  const old = await db.collection('sessionReminders').where('createdAt', '<', new Date(nowMs - MARKER_TTL_MS).toISOString()).limit(300).get();
  await Promise.all(old.docs.map(x => x.ref.delete()));

  return { sent };
}

module.exports = { reminderKind, sendSessionReminders };
