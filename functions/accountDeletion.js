/* global exports */
// What happens to an account's data when its Firebase Auth user is deleted
// (onAccountDelete in index.js). Split out so the list is tested, not just read.
//
// DELETED — the person's own data, health data above all:
//   messages sent or received, their workout logs, sessions they are in, plans
//   they wrote or were given, exercises / templates / exercise overrides they
//   made, body stats (entries + parent doc), the intake form (injuries, PAR-Q),
//   and the profile itself.
//
// DETACHED, not deleted — a trainer's clients are real people with their own
//   accounts. They are unlinked (trainerId: null) so they can connect to someone
//   else, and keep their own logs and body stats.
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
  for (const c of clients.docs) {
    if (c.ref.path !== `users/${uid}`) ops.push({ type: 'update', ref: c.ref, data: { trainerId: null } });
  }

  await commitInChunks(db, ops);
  return {
    deleted: ops.filter(o => o.type === 'delete').length,
    detachedClients: ops.filter(o => o.type === 'update').length,
  };
}

exports.deleteAccountData = deleteAccountData;
exports.CHUNK = CHUNK;
