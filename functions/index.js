/* global require, exports */
const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { writeGcAccessToken, deleteGcAccessToken, readGcAppCredentials } = require('./gcSecrets');
const { createNonce, consumeNonce, releaseNonce, finalizeNonce } = require('./gcOAuthNonce');

initializeApp();
const db = getFirestore();

// How many sessions past zero a client may book on credit. Must stay in sync
// with OVERDRAFT_LIMIT in src/utils/sessionUtils.js — the UI uses it to warn
// and block, this file uses it as the actual enforcement (CLAUDE.md #33).
const OVERDRAFT_LIMIT = 1;

// ElitePro's own GoCardless Partner app credentials (client_id/client_secret/
// redirect_uri) are read at CALL TIME via gcSecrets.readGcAppCredentials(),
// NOT declared here via defineSecret()/.runWith({secrets:[...]}). That
// mechanism validates secrets at DEPLOY time — if Secret Manager isn't even
// enabled yet on the project (as it wasn't when this was first written,
// breaking the entire Functions deploy, not just these two functions), the
// whole `firebase deploy --only functions` step fails, taking every other
// function down with it. Reading at call time means deploy always succeeds
// regardless of Secret Manager's state; gcOAuthStart/gcOAuthCallback simply
// return a graceful "not configured" result until the secrets actually exist
// (see reports/gocardless-sandbox-setup-guide.md).
//
// Sandbox only, per Ani's explicit instruction — do not point this at
// GoCardless's live endpoints until the full Phase 3 sandbox UAT pass (see
// reports/phase3-subscription-design.md §11 step 7) is signed off.
const GC_AUTHORIZE_URL = 'https://connect-sandbox.gocardless.com/oauth/authorize';
const GC_TOKEN_URL = 'https://connect-sandbox.gocardless.com/oauth/access_token';

async function sendPush(userId, tokens, notification, data) {
  if (!tokens || tokens.length === 0) return;

  const results = await Promise.allSettled(
    tokens.map(token =>
      getMessaging().send({
        token,
        notification,
        data: data || {},
        webpush: { fcmOptions: { link: data?.url || '/' } },
      })
    )
  );

  const invalid = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const code = r.reason?.code || '';
      if (code.includes('not-registered') || code.includes('invalid')) {
        invalid.push(tokens[i]);
      }
    }
  });

  if (invalid.length > 0) {
    await db.doc(`users/${userId}`).update({
      fcmTokens: FieldValue.arrayRemove(...invalid),
    });
  }
}

// ─── GDPR: Cascaded delete when Firebase Auth user is deleted ───
exports.onAccountDelete = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const batch = db.batch();

  const [msgFrom, msgTo, logs, schedTrainer, schedClient, plans] = await Promise.all([
    db.collection('messages').where('from', '==', uid).get(),
    db.collection('messages').where('to', '==', uid).get(),
    db.collection('workoutLogs').where('clientId', '==', uid).get(),
    db.collection('schedule').where('trainerId', '==', uid).get(),
    db.collection('schedule').where('clientId', '==', uid).get(),
    db.collection('workoutPlans').where('trainerId', '==', uid).get(),
  ]);

  msgFrom.docs.forEach(d => batch.delete(d.ref));
  msgTo.docs.forEach(d => batch.delete(d.ref));
  logs.docs.forEach(d => batch.delete(d.ref));
  schedTrainer.docs.forEach(d => batch.delete(d.ref));
  schedClient.docs.forEach(d => batch.delete(d.ref));
  plans.docs.forEach(d => batch.delete(d.ref));

  const exercises = await db.collection('exercises').where('trainerId', '==', uid).get();
  exercises.docs.forEach(d => batch.delete(d.ref));

  await batch.commit();
  console.log(`[GDPR] Deleted all data for uid=${uid}`);
});

// ─── New Message → server-side rate limit + push to recipient ───
// Max 20 messages per sender per 60-second window (enforced server-side)
exports.onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap) => {
    const msg = snap.data();
    if (!msg || !msg.to || !msg.from) return;

    // Server-side rate limit: count messages from this sender in the last 60s
    const windowStart = new Date(Date.now() - 60_000).toISOString();
    const recentSnap = await db.collection('messages')
      .where('from', '==', msg.from)
      .where('timestamp', '>=', windowStart)
      .get();
    if (recentSnap.size > 20) {
      console.warn(`[rate-limit] sender ${msg.from} sent ${recentSnap.size} msgs in 60s — skipping push`);
      return;
    }

    const [recipientSnap, senderSnap, unreadSnap] = await Promise.all([
      db.doc(`users/${msg.to}`).get(),
      db.doc(`users/${msg.from}`).get(),
      db.collection('messages').where('to', '==', msg.to).where('read', '==', false).get(),
    ]);

    if (!recipientSnap.exists) return;
    const { fcmTokens } = recipientSnap.data();
    const senderName = senderSnap.exists ? senderSnap.data().name : 'Someone';
    const body = msg.text.length > 120 ? msg.text.substring(0, 120) + '…' : msg.text;
    const badgeCount = String(unreadSnap.size);

    await sendPush(msg.to, fcmTokens, { title: senderName, body }, {
      type: 'message',
      url: '/#/messages',
      fromId: msg.from,
      badgeCount,
    });
  });

// ─── New Schedule → Push to client AND trainer ───
exports.onNewSchedule = functions.firestore
  .document('schedule/{schedId}')
  .onCreate(async (snap) => {
    const sched = snap.data();
    if (!sched || !sched.clientId || !sched.trainerId) return;

    const [clientSnap, trainerSnap] = await Promise.all([
      db.doc(`users/${sched.clientId}`).get(),
      db.doc(`users/${sched.trainerId}`).get(),
    ]);

    const trainerName = trainerSnap.exists ? trainerSnap.data().name : 'Your trainer';
    const clientName = clientSnap.exists ? clientSnap.data().name : 'A client';
    const data = { type: 'schedule', url: '/#/schedule' };

    await Promise.all([
      clientSnap.exists
        ? sendPush(sched.clientId, clientSnap.data().fcmTokens, {
            title: 'New Session',
            body: `${trainerName} scheduled ${sched.type} on ${sched.date} at ${sched.time}`,
          }, data)
        : null,
      trainerSnap.exists
        ? sendPush(sched.trainerId, trainerSnap.data().fcmTokens, {
            title: 'New Session Booking',
            body: `${clientName} booked ${sched.type} on ${sched.date} at ${sched.time}`,
          }, data)
        : null,
    ]);
  });

// ─── Schedule status change → Push to both parties ───
exports.onScheduleUpdate = functions.firestore
  .document('schedule/{schedId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!before || !after || before.status === after.status) return;

    const statusLabel = { confirmed: 'confirmed', cancelled: 'cancelled', completed: 'completed' };
    const label = statusLabel[after.status];
    if (!label) return;

    const [clientSnap, trainerSnap] = await Promise.all([
      db.doc(`users/${after.clientId}`).get(),
      db.doc(`users/${after.trainerId}`).get(),
    ]);

    const notification = {
      title: `Session ${label}`,
      body: `${after.type} on ${after.date} at ${after.time} has been ${label}`,
    };
    const data = { type: 'schedule', url: '/#/schedule' };

    await Promise.all([
      clientSnap.exists ? sendPush(after.clientId, clientSnap.data().fcmTokens, notification, data) : null,
      trainerSnap.exists ? sendPush(after.trainerId, trainerSnap.data().fcmTokens, notification, data) : null,
    ]);
  });

// ─── New Workout Plan assigned → Push to client ───
exports.onNewWorkoutPlan = functions.firestore
  .document('workoutPlans/{planId}')
  .onCreate(async (snap) => {
    const plan = snap.data();
    if (!plan || !plan.clientId || !plan.trainerId) return;

    const [clientSnap, trainerSnap] = await Promise.all([
      db.doc(`users/${plan.clientId}`).get(),
      db.doc(`users/${plan.trainerId}`).get(),
    ]);

    if (!clientSnap.exists) return;
    const { fcmTokens } = clientSnap.data();
    const trainerName = trainerSnap.exists ? trainerSnap.data().name : 'Your trainer';

    await sendPush(plan.clientId, fcmTokens, {
      title: 'New Workout Plan',
      body: `${trainerName} created "${plan.name}" for you`,
    }, { type: 'plan', url: '/#/my-workouts' });
  });

// ─── New Workout Log → Push to trainer ───
exports.onNewWorkoutLog = functions.firestore
  .document('workoutLogs/{logId}')
  .onCreate(async (snap) => {
    const log = snap.data();
    if (!log || !log.clientId) return;

    const clientSnap = await db.doc(`users/${log.clientId}`).get();
    if (!clientSnap.exists) return;

    const trainerId = clientSnap.data().trainerId;
    if (!trainerId) return;

    const trainerSnap = await db.doc(`users/${trainerId}`).get();
    if (!trainerSnap.exists) return;

    const clientName = clientSnap.data().name || 'A client';

    await sendPush(trainerId, trainerSnap.data().fcmTokens, {
      title: 'Workout Logged',
      body: `${clientName} completed a workout`,
    }, {
      type: 'workout_log',
      url: `/#/clients/${log.clientId}`,
      clientId: log.clientId,
    });
  });

// ─── Session credit: deduct 1 credit the moment a real session is booked ───
// Sessions ARE session credit — booking spends one immediately (not on completion).
// Blocked time slots (no clientId) are skipped.
//
// OVERDRAFT: a client with 0 credit left may still book exactly one session on
// credit (see CLAUDE.md #33). That pushes sessionOffset past totalSessions, so
// `remaining` (= total - offset) goes to -1. The ledger entry recording the debt
// is written HERE, server-side, in the same transaction as the deduction —
// never client-side: firestore.rules only lets a trainer create creditLedger
// docs, and a client writing their own debt record would be wrong regardless.
// Nothing needs to "repay" the debt later: topping up adds to totalSessions,
// so remaining goes from -1 to (qty - 1) by the existing arithmetic.
exports.onScheduleBooked = functions.firestore
  .document('schedule/{schedId}')
  .onCreate(async (snap) => {
    const sched = snap.data();
    if (!sched || sched.isBlocked || !sched.clientId || sched.deductedAtBooking) return;

    const clientRef = db.doc(`users/${sched.clientId}`);
    const ledgerRef = db.collection('creditLedger').doc();

    await db.runTransaction(async (tx) => {
      const clientDoc = await tx.get(clientRef);
      if (!clientDoc.exists) return;
      const data = clientDoc.data();
      const current = data.sessionOffset ?? 0;
      const total = data.totalSessions ?? null;
      const newOffset = current + 1;

      // Enforce the overdraft cap HERE, not just in the UI. The client-side
      // check reads `remaining` from a Firestore listener that lags behind this
      // trigger, so two bookings made in quick succession both see the
      // pre-deduction figure and sail past the limit (verified: it reached -2).
      // This is the only place with a consistent view of the balance.
      if (total !== null && newOffset > total + OVERDRAFT_LIMIT) {
        console.warn(
          `[onScheduleBooked] rejecting ${snap.ref.id}: client ${sched.clientId} ` +
          `would go to ${total - newOffset}, past the ${OVERDRAFT_LIMIT}-session overdraft cap`
        );
        // Never charged, so nothing to refund — the booking simply must not
        // exist. Deleting rather than cancelling avoids leaving the client a
        // phantom "cancelled" session they never knowingly created.
        tx.delete(snap.ref);
        return;
      }

      tx.update(clientRef, { sessionOffset: newOffset });
      tx.update(snap.ref, { deductedAtBooking: true });

      // total === null means the trainer never set a package — unlimited, so
      // there's no such thing as an overdraft to record.
      if (total !== null && newOffset > total) {
        tx.set(ledgerRef, {
          clientId: sched.clientId,
          trainerId: sched.trainerId ?? data.trainerId ?? null,
          date: new Date().toISOString().slice(0, 10),
          type: 'overdraft',
          qty: -1,
          rate: null, // set when the trainer actually tops up and charges
          schedId: snap.ref.id,
          addedBy: 'system',
        });
        tx.update(snap.ref, { bookedOnCredit: true });
      }
    });
  });

// ─── Session credit: cancel refund / legacy-booking catch-up on complete ───
// deductedAtBooking marks sessions booked under the new pay-at-booking model.
// Sessions booked before this shipped have no such flag and were never charged
// at booking, so they're caught up here instead — same net effect either way.
//
// Cancel:
//   - legacy (no flag): late (<24h) charges now; early (>=24h) stays free — this
//     mirrors the exact behaviour that used to run client-side.
//   - new model (flag set): late stays charged (no-op); early refunds 1 credit,
//     capped at 2 free early-cancels per client per calendar month.
// Complete:
//   - legacy (no flag): charge now, exactly once.
//   - new model (flag set): already charged at booking — no-op.
exports.onScheduleCreditUpdate = functions.firestore
  .document('schedule/{schedId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after || after.isBlocked || !after.clientId) return;
    if (!before || before.status === after.status) return;

    const clientRef = db.doc(`users/${after.clientId}`);

    if (after.status === 'cancelled') {
      const sessionDt = new Date(`${after.date}T${after.time}:00`);
      const isLate = (sessionDt.getTime() - Date.now()) / (1000 * 60 * 60) < 24;

      if (!after.deductedAtBooking) {
        if (!isLate) return; // legacy booking, early cancel — always free
        await db.runTransaction(async (tx) => {
          const clientDoc = await tx.get(clientRef);
          if (!clientDoc.exists) return;
          const current = clientDoc.data().sessionOffset ?? 0;
          tx.update(clientRef, { sessionOffset: current + 1 });
        });
        return;
      }

      if (isLate) return; // already charged at booking, stays charged

      const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      const reversalRef = db.collection('creditLedger').doc();
      await db.runTransaction(async (tx) => {
        const clientDoc = await tx.get(clientRef);
        if (!clientDoc.exists) return;
        const data = clientDoc.data();
        const count = data.earlyCancelMonth === month ? (data.earlyCancelCount ?? 0) : 0;
        if (count >= 2) return; // free early-cancel cap used up this month
        const current = data.sessionOffset ?? 0;
        tx.update(clientRef, {
          sessionOffset: Math.max(0, current - 1),
          earlyCancelMonth: month,
          earlyCancelCount: count + 1,
        });

        // This booking was the one taken on credit, and it's now refunded — so
        // the client no longer owes it. Reverse the debt entry rather than
        // deleting it, keeping creditLedger append-only (CLAUDE.md #27) and
        // leaving a ledger that still reconciles against `remaining`.
        if (after.bookedOnCredit) {
          tx.set(reversalRef, {
            clientId: after.clientId,
            trainerId: after.trainerId ?? data.trainerId ?? null,
            date: new Date().toISOString().slice(0, 10),
            type: 'overdraft_reversed',
            qty: 1,
            rate: null,
            schedId: change.after.id,
            addedBy: 'system',
          });
        }
      });
      return;
    }

    // Reopen: the trainer pressed Mark Complete by mistake and is undoing it.
    // For a LEGACY booking the completion is what charged the credit, so
    // reopening has to refund it — otherwise complete → reopen → complete
    // charges the client twice for one session. New-model bookings were
    // charged at booking, so both directions are correctly no-ops for them.
    if (before.status === 'completed' && after.status !== 'cancelled') {
      if (after.deductedAtBooking) return;
      await db.runTransaction(async (tx) => {
        const clientDoc = await tx.get(clientRef);
        if (!clientDoc.exists) return;
        const current = clientDoc.data().sessionOffset ?? 0;
        tx.update(clientRef, { sessionOffset: Math.max(0, current - 1) });
      });
      return;
    }

    if (after.status === 'completed') {
      if (after.deductedAtBooking) return; // already charged at booking
      await db.runTransaction(async (tx) => {
        const clientDoc = await tx.get(clientRef);
        if (!clientDoc.exists) return;
        const current = clientDoc.data().sessionOffset ?? 0;
        tx.update(clientRef, { sessionOffset: current + 1 });
      });
    }
  });

// ─── Sessions running low → Push to client when remaining drops to ≤ 3, push to trainer when ≤ 2 ───
exports.onSessionsLow = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!after || after.role !== 'client') return;
    if ((before.sessionOffset ?? 0) === (after.sessionOffset ?? 0)) return;

    const total = after.totalSessions;
    if (!total || total <= 0) return;

    const remainingBefore = total - (before.sessionOffset ?? 0);
    const remainingAfter  = total - (after.sessionOffset ?? 0);
    const clientId = change.after.id;
    const clientName = after.name || 'A client';

    // Notify the client when crossing the ≤ 3 threshold for the first time
    if (remainingAfter <= 3 && remainingBefore > 3) {
      await sendPush(clientId, after.fcmTokens, {
        title: '🔔 Sessions running low',
        body: `You have ${remainingAfter} session${remainingAfter === 1 ? '' : 's'} left — contact your trainer to top up`,
      }, {
        type: 'sessions_low_client',
        url: '/#/',
      });
    }

    // Notify the trainer when crossing the ≤ 2 threshold for the first time
    if (remainingAfter <= 2 && remainingBefore > 2) {
      const trainerId = after.trainerId;
      if (trainerId) {
        const trainerSnap = await db.doc(`users/${trainerId}`).get();
        if (trainerSnap.exists) {
          await sendPush(trainerId, trainerSnap.data().fcmTokens, {
            title: '⚠️ Sessions running low',
            body: `${clientName} has ${remainingAfter} session${remainingAfter === 1 ? '' : 's'} left — remind them to renew`,
          }, {
            type: 'sessions_low',
            url: `/#/clients/${clientId}`,
            clientId,
          });
        }
      }
    }
  });

// ─── Phase 3: GoCardless OAuth connect — start (trainer-invoked) ───
// Callable function: verifies the caller is an authenticated trainer, then
// returns the GoCardless-hosted authorize URL for the client to redirect to.
// Builds a URL only — never touches a secret, never writes anything except
// the short-lived CSRF nonce record (see gcOAuthNonce.js).
exports.gcOAuthStart = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  const trainerId = context.auth.uid;
  const trainerSnap = await db.doc(`users/${trainerId}`).get();
  if (!trainerSnap.exists || trainerSnap.data().role !== 'trainer') {
    throw new functions.https.HttpsError('permission-denied', 'Trainers only');
  }

  const creds = await readGcAppCredentials();
  if (!creds) {
    throw new functions.https.HttpsError('failed-precondition', 'GoCardless is not configured yet');
  }

  // `state` is a crypto-random, single-use, 10-minute nonce bound to this
  // trainerId server-side — never the trainerId itself, which would let
  // anyone forge a state value for any known trainer UID.
  const nonce = await createNonce(trainerId);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    scope: 'read_write',
    state: nonce,
  });
  return { url: `${GC_AUTHORIZE_URL}?${params.toString()}` };
});

// ─── Phase 3: GoCardless OAuth connect — callback (public HTTP endpoint) ───
// GoCardless redirects the trainer's browser here directly after they approve
// the connection — there is no Firebase ID token on this request, so
// authenticity comes entirely from `state` resolving to a nonce this app
// itself issued via gcOAuthStart (see gcOAuthNonce.js for the four checks:
// exists, not expired, not already used, and the trainerId it resolves to
// is re-verified against a live trainer doc below) plus the code exchange
// only succeeding with ElitePro's own registered client_secret.
//
// THIS IS THE ONLY FUNCTION THAT WRITES THE PER-TRAINER GOCARDLESS ACCESS
// TOKEN. It writes to Secret Manager (via gcSecrets.writeGcAccessToken) —
// never to Firestore, never anywhere a client SDK read could reach it.
// Non-sensitive connection metadata (org id, status) goes to
// gcConnections/{trainerId} via the Admin SDK, which is the "server-side
// only" write path firestore.rules' `allow write: if false` is designed to
// require.
const PROFILE_URL = 'https://elitepro-16718.web.app/#/profile';

exports.gcOAuthCallback = functions.https.onRequest(async (req, res) => {
  const { code, state, error } = req.query;

  // Trainer declined on GoCardless's own consent page — not a failure on
  // our side, just release whatever nonce this was (best-effort, so a
  // fresh Connect attempt starts clean) and send them back with a message
  // ProfilePage can show as-is, not a generic/scary error.
  if (error) {
    console.log('[gcOAuthCallback] user declined on GoCardless:', error);
    if (state) await releaseNonce(String(state));
    res.redirect(`${PROFILE_URL}?gc=cancelled`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${PROFILE_URL}?gc=error`);
    return;
  }

  // Should never actually be reachable with a valid nonce if gcOAuthStart
  // already refused to issue one — but check defensively in case
  // credentials were removed between start and callback.
  const creds = await readGcAppCredentials();
  if (!creds) {
    await releaseNonce(String(state));
    res.redirect(`${PROFILE_URL}?gc=not-configured`);
    return;
  }

  const nonceResult = await consumeNonce(String(state));
  if (!nonceResult.ok) {
    console.warn('[gcOAuthCallback] rejected state:', nonceResult.reason);
    res.redirect(`${PROFILE_URL}?gc=error`);
    return;
  }
  const trainerId = nonceResult.trainerId;

  // 4th check: the identity the nonce resolved to must still be a real,
  // current trainer (not deleted/role-changed since gcOAuthStart issued it).
  const trainerSnap = await db.doc(`users/${trainerId}`).get();
  if (!trainerSnap.exists || trainerSnap.data().role !== 'trainer') {
    await releaseNonce(String(state));
    res.redirect(`${PROFILE_URL}?gc=error`);
    return;
  }

  const tokenRes = await fetch(GC_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    console.error('[gcOAuthCallback] token exchange failed', await tokenRes.text());
    // GoCardless's own authorization code is now spent regardless of
    // whether we release the nonce, so a retry needs a fresh Connect
    // attempt either way — release for hygiene, not because it helps here.
    await releaseNonce(String(state));
    res.redirect(`${PROFILE_URL}?gc=error`);
    return;
  }
  const tokenJson = await tokenRes.json();

  // WRITE PATH: token -> Secret Manager only. writeGcAccessToken retries
  // transient failures internally (gcSecrets.js); if it still fails after
  // that, release the nonce (rather than leaving it permanently burnt) so
  // the trainer can retry without our own infra hiccup costing them a
  // second trip through GoCardless's consent page.
  try {
    await writeGcAccessToken(trainerId, tokenJson.access_token);
  } catch (err) {
    console.error('[gcOAuthCallback] Secret Manager write failed after retries', err);
    await releaseNonce(String(state));
    res.redirect(`${PROFILE_URL}?gc=error`);
    return;
  }

  // Non-sensitive metadata -> Firestore, Admin SDK (bypasses client rules).
  await db.doc(`gcConnections/${trainerId}`).set({
    trainerId,
    gcOrganisationId: tokenJson.organisation_id || null,
    environment: 'sandbox',
    status: 'connected',
    connectedAt: new Date().toISOString(),
  });

  // Only now, with everything actually persisted, is the nonce truly spent.
  await finalizeNonce(String(state));

  res.redirect(`${PROFILE_URL}?gc=connected`);
});

// ─── Phase 3: GoCardless disconnect (trainer-invoked) ───
// Deletes the trainer's Secret Manager token entirely and marks the
// connection doc disconnected. Whether this should also call GoCardless's
// own OAuth revocation endpoint is unverified (same category of unknown as
// the pause mechanism — see reports/phase3-subscription-design.md) so it's
// not attempted here; local disconnect is unconditional and immediate
// either way.
exports.gcDisconnect = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  const trainerId = context.auth.uid;
  const trainerSnap = await db.doc(`users/${trainerId}`).get();
  if (!trainerSnap.exists || trainerSnap.data().role !== 'trainer') {
    throw new functions.https.HttpsError('permission-denied', 'Trainers only');
  }

  await deleteGcAccessToken(trainerId);
  await db.doc(`gcConnections/${trainerId}`).set({
    trainerId,
    status: 'disconnected',
    disconnectedAt: new Date().toISOString(),
  }, { merge: true });

  return { ok: true };
});

// ─── Phase 3: daily cleanup of expired GoCardless OAuth nonces ───
// The first scheduled function in this codebase — a natural home for the
// pause auto-resume / cancel-after-notice scheduled jobs Phase 3 will need
// later (see reports/phase3-subscription-design.md §5/§6), not a one-off.
// Expired nonces (used or not) are harmless leftover data — consumeNonce()
// already rejects them on any access attempt — but they'd otherwise
// accumulate in Firestore forever with nothing else ever removing them.
exports.cleanupExpiredGcNonces = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const now = new Date().toISOString();
    const expiredSnap = await db.collection('gcOAuthNonces')
      .where('expiresAt', '<', now)
      .get();
    if (expiredSnap.empty) return null;

    const batch = db.batch();
    expiredSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`[cleanupExpiredGcNonces] deleted ${expiredSnap.size} expired nonce(s)`);
    return null;
  });
