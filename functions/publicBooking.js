// A coach's public booking page (B38, 2026-10-04): a stranger with no account picks a free
// hour and asks for a trial session. Nothing is booked until the coach confirms — the coach
// rents the room by the hour, which the app cannot see.
//
// Everything here runs with the Admin SDK on behalf of somebody who is NOT signed in, so:
//   - the page is found by a random slug held in a reservation doc, never by the coach's
//     uid or invite code (the invite code connects an account as their client);
//   - only free start times leave — never what fills the rest, nor whom;
//   - every field is bounded, a hidden field catches simple bots, and per-day budgets cap
//     what one visitor (by hashed IP) and one coach's page can receive;
//   - a request holds a name and a way to reach the person, nothing about health. It lives
//     until the coach answers; confirming moves the contact onto the new client record and
//     deletes the request, declining deletes it, and an unanswered one is deleted a week
//     after the date it asked for.

const crypto = require('crypto');
const { zonedToEpochMs } = require('./zonedTime');

const SLOT_MINUTES = 60;
const DAYS_AHEAD = 14;
const MIN_LEAD_HOURS = 12;          // no same-morning surprises
const STALE_DAYS = 7;               // unanswered requests are deleted this long after their date
const MAX_OPEN_PER_COACH = 10;      // unanswered requests a page holds before it stops accepting
const MAX_PRICE = 1000;
const LIMITS = { name: 80, contact: 120, message: 500 };
const DAILY = { perVisitor: 3, perCoach: 20 };
const DEFAULT_HOURS = { start: '09:00', end: '17:00' }; // what SchedulePage assumes when unset

const SLUG_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const SLUG_LENGTH = 10;
const SLUG_PATTERN = /^[a-z0-9]{10}$/;
const ALREADY_EXISTS = 6;
const TRIAL_TYPE = 'Trial session';

class PublicBookingError extends Error {
  // code is an HttpsError code
  constructor(code, message) {
    super(message);
    this.name = 'PublicBookingError';
    this.code = code;
  }
}

const pad = (n) => String(n).padStart(2, '0');
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
const fromMin = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const isHHMM = (s) => typeof s === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s);

// Calendar date 'YYYY-MM-DD' of instant `now` on the coach's wall clock (UTC if no zone).
function localDate(now, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday

// Strip control characters and trim to a length — what a stranger types is stored as-is
// otherwise, and shown to the coach.
function clean(value, max) {
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanMessage(value, max) {
  // Same, but line breaks stay — a message can have paragraphs.
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  return String(value ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// A phone number (7+ digits) or an email address. Anything else is not a way to reach anyone.
function isContact(value) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  return /^\+?[0-9 ()-]+$/.test(value) && value.replace(/[^0-9]/g, '').length >= 7;
}

// ── Pure: which hours can be offered ──
// busy: [{ date, time, duration }] — sessions, blocked time and unanswered requests alike.
function freeSlots({ days, workingHours, timeZone, busy, now }) {
  const start = toMin((workingHours && workingHours.start) || DEFAULT_HOURS.start);
  const end = toMin((workingHours && workingHours.end) || DEFAULT_HOURS.end);
  const earliest = now.getTime() + MIN_LEAD_HOURS * 3600 * 1000;
  const byDate = new Map();
  for (const b of busy) {
    if (!b || !b.date || !isHHMM(b.time)) continue;
    const s = toMin(b.time);
    const list = byDate.get(b.date) || [];
    list.push([s, s + (Number(b.duration) || SLOT_MINUTES)]);
    byDate.set(b.date, list);
  }
  const today = localDate(now, timeZone);
  const slots = [];
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    if (!days.includes(weekday(date))) continue;
    const taken = byDate.get(date) || [];
    for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) {
      if (taken.some(([s, e]) => t < e && t + SLOT_MINUTES > s)) continue;
      const time = fromMin(t);
      if (zonedToEpochMs(date, time, timeZone) < earliest) continue;
      slots.push({ date, time });
    }
  }
  return slots;
}

// ── Coach: turn the page on or off, set the price and days ──
function validateSettings(input) {
  const enabled = !!(input && input.enabled);
  const price = Number(input && input.price);
  const days = Array.isArray(input && input.days) ? [...new Set(input.days.map(Number))].sort() : [];
  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) throw new PublicBookingError('invalid-argument', 'price');
  if (days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new PublicBookingError('invalid-argument', 'days');
  if (enabled && days.length === 0) throw new PublicBookingError('invalid-argument', 'days');
  return { enabled, price: Math.round(price * 100) / 100, days };
}

function randomSlug(randomInt = crypto.randomInt) {
  let s = '';
  for (let i = 0; i < SLUG_LENGTH; i++) s += SLUG_CHARS[randomInt(SLUG_CHARS.length)];
  return s;
}

async function saveSettings({ db, trainerId, input, randomInt }) {
  const settings = validateSettings(input);
  const userRef = db.doc(`users/${trainerId}`);
  const user = await userRef.get();
  if (!user.exists || user.data().role !== 'trainer') throw new PublicBookingError('permission-denied', 'Trainers only');
  let slug = (user.data().publicBooking || {}).slug;
  if (!slug) {
    for (let attempt = 0; attempt < 10 && !slug; attempt++) {
      const candidate = randomSlug(randomInt);
      try {
        await db.doc(`bookingPages/${candidate}`).create({ trainerId });
        slug = candidate;
      } catch (err) {
        if (err.code !== ALREADY_EXISTS) throw err;
      }
    }
    if (!slug) throw new PublicBookingError('unavailable', 'Could not make a link');
  }
  const publicBooking = { ...settings, slug };
  await userRef.update({ publicBooking });
  return publicBooking;
}

// ── Public: what a stranger's browser may know ──
async function coachForSlug(db, slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) return null;
  const page = await db.doc(`bookingPages/${slug}`).get();
  if (!page.exists) return null;
  const trainer = await db.doc(`users/${page.data().trainerId}`).get();
  const t = trainer.exists ? trainer.data() : {};
  const pb = t.publicBooking || {};
  if (t.role !== 'trainer' || pb.slug !== slug || !pb.enabled) return null;
  return { id: trainer.id, data: t };
}

// Sessions, blocked time and unanswered requests from yesterday on. Single-field queries
// (#34); the rest is filtered here.
async function busyFor(db, trainerId, now, tx) {
  const read = (q) => (tx ? tx.get(q) : q.get());
  const from = addDays(now.toISOString().slice(0, 10), -1);
  const [sched, requests] = await Promise.all([
    read(db.collection('schedule').where('trainerId', '==', trainerId)),
    read(db.collection('trialRequests').where('trainerId', '==', trainerId)),
  ]);
  const sessions = sched.docs.map(d => d.data()).filter(s => s.status !== 'cancelled' && String(s.date || '') >= from);
  const asked = requests.docs.map(d => ({ ...d.data(), duration: SLOT_MINUTES }));
  return { busy: [...sessions, ...asked], openRequests: requests.size };
}

async function getPage({ db, slug, now = new Date() }) {
  const coach = await coachForSlug(db, slug);
  if (!coach) throw new PublicBookingError('not-found', 'No such page');
  const { data } = coach;
  const { busy, openRequests } = await busyFor(db, coach.id, now);
  return {
    coachName: clean(data.businessName || data.name || 'Coach', LIMITS.name),
    price: data.publicBooking.price,
    currency: data.currency || 'GBP',
    minutes: SLOT_MINUTES,
    timeZone: data.timeZone || null,
    // A full inbox reads as "no times free" rather than an error — nothing to explain to a stranger.
    slots: openRequests >= MAX_OPEN_PER_COACH ? [] : freeSlots({
      days: data.publicBooking.days || [], workingHours: data.workingHours, timeZone: data.timeZone, busy, now,
    }),
  };
}

// A visitor is counted by a hash of their IP and the day, never the IP itself.
function visitorKey(ip, day) {
  return crypto.createHash('sha256').update(`${day}|${ip || 'unknown'}`).digest('hex').slice(0, 24);
}

async function requestTrial({ db, input, ip, now = new Date() }) {
  const data = input || {};
  // Filled in only by something that fills in every field. Looks like success, stores nothing.
  if (clean(data.website, 200)) return { ok: true, stored: false };

  const name = clean(data.name, LIMITS.name);
  const contact = clean(data.contact, LIMITS.contact);
  const message = cleanMessage(data.message, LIMITS.message);
  if (!name) throw new PublicBookingError('invalid-argument', 'name');
  if (!isContact(contact)) throw new PublicBookingError('invalid-argument', 'contact');
  if (data.consent !== true) throw new PublicBookingError('invalid-argument', 'consent');
  if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !isHHMM(data.time)) {
    throw new PublicBookingError('invalid-argument', 'slot');
  }

  const coach = await coachForSlug(db, data.slug);
  if (!coach) throw new PublicBookingError('not-found', 'No such page');
  const day = now.toISOString().slice(0, 10);
  const visitorRef = db.doc(`trialBudget/${day}_v_${visitorKey(ip, day)}`);
  const coachRef = db.doc(`trialBudget/${day}_c_${coach.id}`);
  const requestRef = db.collection('trialRequests').doc();

  await db.runTransaction(async (tx) => {
    const [visitor, coachBudget, { busy, openRequests }] = await Promise.all([
      tx.get(visitorRef), tx.get(coachRef), busyFor(db, coach.id, now, tx),
    ]);
    const used = (snap) => (snap.exists ? snap.data().count || 0 : 0);
    if (used(visitor) >= DAILY.perVisitor || used(coachBudget) >= DAILY.perCoach || openRequests >= MAX_OPEN_PER_COACH) {
      throw new PublicBookingError('resource-exhausted', 'Too many requests');
    }
    const offered = freeSlots({
      days: coach.data.publicBooking.days || [], workingHours: coach.data.workingHours,
      timeZone: coach.data.timeZone, busy, now,
    });
    if (!offered.some(s => s.date === data.date && s.time === data.time)) {
      throw new PublicBookingError('failed-precondition', 'Slot taken');
    }
    tx.set(visitorRef, { day, count: used(visitor) + 1 });
    tx.set(coachRef, { day, count: used(coachBudget) + 1 });
    tx.set(requestRef, {
      id: requestRef.id, trainerId: coach.id, name, contact, message,
      date: data.date, time: data.time, createdAt: now.toISOString(),
    });
  });
  return { ok: true, stored: true, requestId: requestRef.id, trainerId: coach.id, name, date: data.date, time: data.time };
}

// ── Coach: answer a request ──
// Confirm: a client without the app (B35 shape, plus the contact they gave) and a confirmed
// trial session at the asked time, in one transaction, then the request is gone. The
// session carries trial: true, which the credit triggers skip — a trial is paid for (or
// free) outside the session pack.
async function respondToRequest({ db, trainerId, requestId, action, now = new Date(), randomInt = crypto.randomInt }) {
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9]{1,40}$/.test(requestId)) throw new PublicBookingError('invalid-argument', 'requestId');
  if (action !== 'confirm' && action !== 'decline') throw new PublicBookingError('invalid-argument', 'action');
  const ref = db.doc(`trialRequests/${requestId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data().trainerId !== trainerId) throw new PublicBookingError('not-found', 'No such request');
    const r = snap.data();
    tx.delete(ref);
    if (action === 'decline') return { declined: true };

    const ms = now.getTime();
    const suffix = Array.from({ length: 4 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)]).join('');
    const clientId = `managed-${ms}-${suffix}`;
    const schedId = `sched-${ms}`;
    tx.set(db.doc(`users/${clientId}`), {
      id: clientId, name: r.name, role: 'client', trainerId, managed: true,
      joinDate: localDate(now, null), contact: r.contact,
    });
    tx.set(db.doc(`schedule/${schedId}`), {
      id: schedId, trainerId, clientId, date: r.date, time: r.time, duration: SLOT_MINUTES,
      type: TRIAL_TYPE, status: 'confirmed', notes: r.message || '', trial: true,
    });
    return { confirmed: true, clientId, schedId };
  });
}

// ── Daily: forget unanswered requests and old budgets ──
async function cleanup({ db, now = new Date() }) {
  const today = now.toISOString().slice(0, 10);
  const staleBefore = addDays(today, -STALE_DAYS);
  const [requests, budgets] = await Promise.all([
    db.collection('trialRequests').where('date', '<', staleBefore).get(),
    db.collection('trialBudget').where('day', '<', today).get(),
  ]);
  const refs = [...requests.docs, ...budgets.docs].map(d => d.ref);
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
  return { requests: requests.size, budgets: budgets.size };
}

module.exports = {
  freeSlots, validateSettings, saveSettings, getPage, requestTrial, respondToRequest, cleanup,
  isContact, PublicBookingError, LIMITS, DAILY, MAX_OPEN_PER_COACH, SLOT_MINUTES, TRIAL_TYPE,
};
