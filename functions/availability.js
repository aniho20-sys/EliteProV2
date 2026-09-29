// When a coach is busy — and nothing else — for their clients' booking screen.
//
// Clients used to read their coach's whole schedule straight from Firestore, so every
// client could see every other client's name (clientId), session type and the coach's
// notes on them (production audit 2026-09-28, High-value 4). Firestore rules cannot hide
// fields, only whole documents, so the rule now lets a client read their own sessions only,
// and the booking screen asks this instead: dates, times and lengths, nothing about whom.

// Sessions from yesterday on — the booking screen never offers a past day, and a day's
// margin covers a client whose clock is behind the server's.
function cutoffDate(now) {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// The fields a slot carries. Anything added here is visible to every client of the coach.
function toSlot(s) {
  return {
    date: String(s.date || ''),
    time: String(s.time || ''),
    duration: Number(s.duration) || 60,
  };
}

async function trainerAvailability(db, callerUid, now = new Date()) {
  const caller = await db.doc(`users/${callerUid}`).get();
  const trainerId = caller.exists ? caller.data().trainerId : null;
  if (!trainerId) return { slots: [] };

  // Single-field query (#34); the rest is filtered here.
  const snap = await db.collection('schedule').where('trainerId', '==', trainerId).get();
  const from = cutoffDate(now);
  const slots = snap.docs
    .map(d => d.data())
    .filter(s => s.status !== 'cancelled' && String(s.date || '') >= from)
    .map(toSlot)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return { slots };
}

module.exports = { trainerAvailability };
