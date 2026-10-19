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

const { zonedToEpochMs } = require('./zonedTime');

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

// The coach's local calendar date and hour at instant `ms`.
function localDateHour(ms, timeZone) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
  } catch {
    return { date: isoDate(ms), hour: new Date(ms).getUTCHours() };
  }
}

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
    const trainer = await user(session.trainerId);
    if (!trainer) continue;
    const kind = reminderKind({ session, timeZone: trainer.timeZone, nowMs });
    if (!kind) continue;
    const client = await user(session.clientId);
    // A client without the app (managed, B35) has no phone to remind.
    if (!client || client.managed || !Array.isArray(client.fcmTokens) || client.fcmTokens.length === 0) continue;

    try {
      await db.doc(`sessionReminders/${d.id}_${kind}`).create({ scheduleId: d.id, kind, createdAt: new Date(nowMs).toISOString() });
    } catch (err) {
      if (err.code === ALREADY_EXISTS) continue; // already sent by an earlier run
      throw err;
    }
    const text = (TEXT[client.language] || TEXT.en)[kind](session.time, trainer.name || '');
    await notify({ userId: session.clientId, tokens: client.fcmTokens, ...text });
    sent++;
  }

  // Markers are only needed until the session has passed.
  const old = await db.collection('sessionReminders').where('createdAt', '<', new Date(nowMs - MARKER_TTL_MS).toISOString()).limit(300).get();
  await Promise.all(old.docs.map(x => x.ref.delete()));

  return { sent };
}

module.exports = { reminderKind, sendSessionReminders, localDateHour };
