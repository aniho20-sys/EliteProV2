// B76 step 2 — a small summary of each client on their own user doc (users/{id}.summary),
// kept by the server, so the coach's dashboard needs no listener per client.
//
// Load test 2026-10-25 (reports/load-test-2026-10-24.md): after step 1 a coach with 100
// clients still had 214 listeners, and the phone took 164 s to answer them all from its own
// cache. The dashboard only ever needed, per client, the latest activity and the latest
// body stats — so those are kept here and read with the client docs the coach already has.
//
//   recentLogs     — up to RECENT_LOGS logs, newest first: { id, date, planId, workoutName }
//                    (the notification centre lists the past week's; activity takes the first)
//   lastSession    — the last completed session with the client's current coach: { id, date, type }
//   latestBodyStat — { date, weight, bodyFat } of the newest body-stats entry; null when the
//                    client does not share health information with their coach (B79)
//
// Built only from queries, never from the write that triggered it, and in a transaction, so
// two writes landing together cannot leave an older summary over a newer one. Only clients
// get one, and only the server writes it: `summary` is in no allowlist in firestore.rules.

const RECENT_LOGS = 5;
const SUMMARY_VERSION = 1;

async function buildClientSummary({ db, clientId, now = () => new Date() }) {
  const userRef = db.doc(`users/${clientId}`);
  return db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    if (!user.exists || user.data().role !== 'client') return null;
    const trainerId = user.data().trainerId || null;

    const logs = await tx.get(db.collection('workoutLogs')
      .where('clientId', '==', clientId).orderBy('date', 'desc').limit(RECENT_LOGS));
    const sessions = trainerId
      ? await tx.get(db.collection('schedule')
        .where('clientId', '==', clientId).where('trainerId', '==', trainerId)
        .where('status', '==', 'completed').orderBy('date', 'desc').limit(1))
      : null;
    // The coach reads this summary; a client who keeps their health information from their
    // coach (healthSharing 'no', B79) keeps it out of here too.
    const shared = user.data().healthSharing !== 'no';
    const body = shared
      ? await tx.get(db.collection(`bodyStats/${clientId}/entries`).orderBy('date', 'desc').limit(1))
      : { docs: [] };

    const s = sessions && sessions.docs[0];
    const b = body.docs[0];
    const summary = {
      version: SUMMARY_VERSION,
      recentLogs: logs.docs.map(d => ({
        id: d.id,
        date: d.data().date || null,
        planId: d.data().planId || null,
        workoutName: d.data().workoutName || null,
      })),
      lastSession: s ? { id: s.id, date: s.data().date || null, type: s.data().type || null } : null,
      latestBodyStat: b ? { date: b.data().date || null, weight: b.data().weight ?? null, bodyFat: b.data().bodyFat ?? null } : null,
      updatedAt: now().toISOString(),
    };
    tx.update(userRef, { summary });
    return summary;
  });
}

// The client a written schedule session concerns — only when it is, or was, a completed one
// (nothing else changes lastSession).
function scheduleClientToRefresh(before, after) {
  const was = before && before.status === 'completed';
  const is = after && after.status === 'completed';
  if (!was && !is) return [];
  const ids = new Set([before && before.clientId, after && after.clientId].filter(Boolean));
  return [...ids];
}

// The coach's clients that have no summary yet (or an older version): built once, so the
// clients that existed before B76 step 2 get one. Called by the coach's app.
async function ensureClientSummaries({ db, trainerId, now }) {
  const clients = await db.collection('users').where('trainerId', '==', trainerId).get();
  const missing = clients.docs.filter(d => d.data().role === 'client'
    && !(d.data().summary && d.data().summary.version === SUMMARY_VERSION));
  // Ten at a time: a coach with hundreds of clients finishes well inside the call's time.
  for (let i = 0; i < missing.length; i += 10) {
    await Promise.all(missing.slice(i, i + 10).map(d => buildClientSummary({ db, clientId: d.id, now })));
  }
  return { built: missing.length };
}

module.exports = { buildClientSummary, scheduleClientToRefresh, ensureClientSummaries, RECENT_LOGS, SUMMARY_VERSION };
