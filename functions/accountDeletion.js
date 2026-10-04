// What happens to an account's data when its Firebase Auth user is deleted
// (onAccountDelete in index.js). Split out so the list is tested, not just read.
//
// DELETED — the person's own data, health data above all:
//   messages sent or received, their workout logs, sessions they are in, plans
//   they wrote or were given, exercises / templates / exercise overrides they
//   made, body stats (entries + parent doc), the intake form (injuries, PAR-Q),
//   a coach's unanswered trial requests and booking-page link (B38), and the profile itself.
//
// DETACHED, not deleted — a trainer's clients are real people with their own
//   accounts. They are unlinked (trainerId: null) so they can connect to someone
//   else, and keep their own logs and body stats.
//   Except clients WITHOUT the app (managed: true, B35): they have no account, and the
//   record exists only because the coach typed it in. With the coach gone nobody could
//   read or delete it, so it is deleted like the coach's own data — same list as above,
//   run for that client's id.
//
// KEPT — financial records: invoices, creditLedger, subscriptions. A trainer has
//   to keep what they billed and were paid (UK tax records), and a subscription
//   doc is the only trace that a cancellation was attempted. Subscriptions are
//   cancelled at GoCardless separately, before this runs (see index.js).

const CHUNK = 400;

async function commitInChunks(db, ops) {
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + CHUNK)) {
      if (op.type === 'delete') batch.delete(op.ref);
      else batch.update(op.ref, op.data);
    }
    await batch.commit();
  }
}

async function deleteAccountData({ db, uid }) {
  const where = (col, field) => db.collection(col).where(field, '==', uid).get();
  const snaps = await Promise.all([
    where('messages', 'from'),
    where('messages', 'to'),
    where('workoutLogs', 'clientId'),
    where('schedule', 'trainerId'),
    where('schedule', 'clientId'),
    where('workoutPlans', 'trainerId'),
    where('workoutPlans', 'clientId'),
    where('exercises', 'trainerId'),
    where('templates', 'trainerId'),
    where('exerciseOverrides', 'trainerId'),
    // B38: strangers' trial requests to this coach, and the page link's reservation.
    where('trialRequests', 'trainerId'),
    where('bookingPages', 'trainerId'),
    db.collection(`bodyStats/${uid}/entries`).get(),
  ]);
  const clients = await where('users', 'trainerId');

  // One doc can match two queries (a plan both written by and assigned to the same
  // uid, a message to yourself). De-duplicate so each doc is written once.
  const seen = new Set();
  const ops = [];
  const del = (ref) => {
    if (seen.has(ref.path)) return;
    seen.add(ref.path);
    ops.push({ type: 'delete', ref });
  };

  for (const snap of snaps) snap.docs.forEach(d => del(d.ref));
  del(db.doc(`bodyStats/${uid}`));
  del(db.doc(`intakeForms/${uid}`));
  del(db.doc(`users/${uid}`));
  const managed = [];
  for (const c of clients.docs) {
    if (c.ref.path === `users/${uid}`) continue;
    if (c.data().managed === true) managed.push(c.id);
    else ops.push({ type: 'update', ref: c.ref, data: { trainerId: null } });
  }

  await commitInChunks(db, ops);
  let deleted = ops.filter(o => o.type === 'delete').length;
  for (const clientId of managed) deleted += (await deleteAccountData({ db, uid: clientId })).deleted;
  return {
    deleted,
    detachedClients: ops.filter(o => o.type === 'update').length,
    deletedManagedClients: managed.length,
  };
}

class RemoveManagedError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// A coach removing a client who has no app. Unlike removing a client with an account
// (which only detaches them), there is no one to keep the record for, so it and what
// hangs off it are deleted — the same list as a deleted account. Invoices and the
// credit ledger are kept, as always.
async function removeManagedClient({ db, trainerId, clientId }) {
  if (typeof clientId !== 'string' || !/^managed-[0-9]{10,16}-[a-z0-9]{4}$/.test(clientId)) {
    throw new RemoveManagedError('invalid-argument', 'Not a client without the app');
  }
  const snap = await db.doc(`users/${clientId}`).get();
  if (!snap.exists) return { removed: false }; // already gone — a second tap, or a retry
  const c = snap.data();
  if (c.managed !== true || c.trainerId !== trainerId) {
    throw new RemoveManagedError('permission-denied', 'Not your client');
  }
  const { deleted } = await deleteAccountData({ db, uid: clientId });
  return { removed: true, deleted };
}

exports.deleteAccountData = deleteAccountData;
exports.removeManagedClient = removeManagedClient;
exports.RemoveManagedError = RemoveManagedError;
exports.CHUNK = CHUNK;
