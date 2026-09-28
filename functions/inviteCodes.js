// Invite codes and connecting a client to a coach — server side only.
//
// Until 2026-09-28 both lived in the browser (P2 + P3, reports/production-audit-2026-09-28.md):
//   P2 — a client set their own users.trainerId, so anyone who knew a coach's uid (every
//        removed client does) could attach themselves and read that coach's profile,
//        including bank details, and the coach's whole schedule.
//   P3 — a trainer set their own users.inviteCode, so another trainer could copy yours and
//        new students typing it could land with them instead.
// Both fields are now written only here, via the Admin SDK; firestore.rules refuses them
// from the client.
//
// Uniqueness: a code is owned by a reservation document, inviteCodes/{code} → { trainerId }.
// Creating a document that already exists fails, so two trainers can never hold one code.
// Codes issued before this existed have no reservation yet; they are honoured only while
// exactly one trainer carries them, and reserved to that trainer on first use.

const crypto = require('crypto');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — same as the client used
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 10;
const ALREADY_EXISTS = 6; // gRPC status for create() on an existing document

class InviteCodeError extends Error {
  // code is an HttpsError code: permission-denied, failed-precondition, …
  constructor(code, message) {
    super(message);
    this.name = 'InviteCodeError';
    this.code = code;
  }
}

function randomCode(randomInt = crypto.randomInt) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return code;
}

const publicTrainer = (snap) => ({ id: snap.id, name: (snap.data() || {}).name || 'Coach' });

// Which trainer does this (already normalised) code belong to? { id, name } or null.
// Only id and name ever leave: the caller is a stranger to this trainer when they ask.
async function resolveTrainerByCode(db, code, now = () => new Date()) {
  const reservation = await db.doc(`inviteCodes/${code}`).get();
  if (reservation.exists) {
    const trainer = await db.doc(`users/${reservation.data().trainerId}`).get();
    const t = trainer.exists ? trainer.data() : {};
    return t.role === 'trainer' && t.inviteCode === code ? publicTrainer(trainer) : null;
  }

  // A code from before reservations. Deliberately a SINGLE-field equality query: Firestore
  // auto-indexes every single field, whereas adding role == 'trainer' can need a composite
  // index that would be missing in production and fail exactly like a wrong code (#34).
  const snap = await db.collection('users').where('inviteCode', '==', code).limit(10).get();
  const trainers = snap.docs.filter(d => (d.data() || {}).role === 'trainer');
  // Two trainers with one code means one of them copied it. Which one is the original is
  // not knowable from here, so refuse rather than guess (#35) — a student sent to the
  // wrong coach pays the wrong person.
  if (trainers.length !== 1) {
    if (trainers.length > 1) console.error(`[inviteCodes] code ${code} held by ${trainers.length} trainers; refusing`);
    return null;
  }
  try {
    await db.doc(`inviteCodes/${code}`).create({
      trainerId: trainers[0].id, createdAt: now().toISOString(), via: 'legacy',
    });
  } catch (err) {
    if (err.code !== ALREADY_EXISTS) throw err;
    return resolveTrainerByCode(db, code, now); // reserved concurrently — ask again
  }
  return publicTrainer(trainers[0]);
}

// Give a trainer a code they alone hold, reusing their current one when it is safely theirs.
async function ensureInviteCode(db, trainerId, { randomInt, now = () => new Date() } = {}) {
  const userRef = db.doc(`users/${trainerId}`);
  return db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    if (!user.exists || user.data().role !== 'trainer') {
      throw new InviteCodeError('permission-denied', 'Trainers only');
    }

    const current = user.data().inviteCode;
    if (current) {
      const reservationRef = db.doc(`inviteCodes/${current}`);
      const reservation = await tx.get(reservationRef);
      if (reservation.exists && reservation.data().trainerId === trainerId) return current;
      if (!reservation.exists) {
        const holders = await tx.get(db.collection('users').where('inviteCode', '==', current).limit(10));
        const others = holders.docs.filter(d => d.id !== trainerId && (d.data() || {}).role === 'trainer');
        if (others.length === 0) {
          tx.create(reservationRef, { trainerId, createdAt: now().toISOString(), via: 'legacy' });
          return current;
        }
      }
      // Reserved by, or shared with, another trainer — this trainer gets a fresh one.
    }

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const code = randomCode(randomInt);
      const reservationRef = db.doc(`inviteCodes/${code}`);
      if ((await tx.get(reservationRef)).exists) continue;
      if (!(await tx.get(db.collection('users').where('inviteCode', '==', code).limit(1))).empty) continue;
      tx.create(reservationRef, { trainerId, createdAt: now().toISOString(), via: 'issued' });
      tx.update(userRef, { inviteCode: code });
      return code;
    }
    throw new InviteCodeError('unavailable', 'Could not issue an invite code');
  });
}

// Connect the calling client to the coach who owns this code.
async function connectClientByCode(db, clientId, code, now) {
  const clientRef = db.doc(`users/${clientId}`);
  const client = await clientRef.get();
  if (!client.exists || client.data().role !== 'client') {
    throw new InviteCodeError('failed-precondition', 'Clients only');
  }
  const trainer = await resolveTrainerByCode(db, code, now);
  if (!trainer) return { found: false };
  await clientRef.update({ trainerId: trainer.id });
  return { found: true, trainer };
}

module.exports = {
  InviteCodeError, randomCode, resolveTrainerByCode, ensureInviteCode, connectClientByCode, CODE_CHARS,
};
