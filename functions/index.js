/* global require, exports */
const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const { writeGcAccessToken, deleteGcAccessToken, readGcAppCredentials } = require('./gcSecrets');
const { createNonce, consumeNonce, releaseNonce, finalizeNonce } = require('./gcOAuthNonce');
const { normalizeInviteCode } = require('./inviteCode');
const { selectTestAccounts } = require('./testAccounts');
const { summariseSignups } = require('./signupQueue');

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

// ─── Owner operations: new-trainer signup alert + platform stats ───
//
// A trainer signing up is the only event on this platform that Ani has to react to
// personally, so it is deliberately loud: a push to her phone, an email, AND a Firestore
// record. The record is the one that matters — push and email can both silently fail
// (token expired, extension not installed), and a missed signup is a lost founding member.
//
// OWNER_EMAIL is a literal on purpose. It also has to appear literally in firestore.rules,
// which cannot read secrets, so keeping the two in one obvious place beats hiding one of
// them. It identifies who to notify; it grants nothing on its own.
const OWNER_EMAIL = 'aniho20@gmail.com';
const FOUNDING_PLACES = 5;

async function findOwner() {
  const snap = await db.collection('users').where('email', '==', OWNER_EMAIL).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

// Counting via the aggregation query rather than reading every document — this runs on
// every signup and on every Profile visit, and only the number is ever needed.
async function countRole(role) {
  const agg = await db.collection('users').where('role', '==', role).count().get();
  return agg.data().count;
}

// Founding places are counted from signup EVENTS, not from how many trainer documents
// exist. The users collection carries years of development and QA accounts — 37 of them
// when this was first switched on — so counting documents reported the five founding
// places as gone before a single real trainer had arrived. An event only exists for a
// signup that happened after the offer went live, which is exactly what the offer means.
// Excluded events stay in the collection — the record of what happened is not edited, only
// what it counts towards (CLAUDE.md #27). Reads documents rather than count() because a
// count() aggregation cannot skip them without a second equality filter, and two equality
// filters can require a composite index that will not exist in production (#34). Signup
// volume is small enough that reading them is free.
async function countTrainerSignups() {
  const snap = await db.collection('platformEvents')
    .where('type', '==', 'trainer_signup')
    .get();
  return snap.docs.filter(d => !(d.data() || {}).excluded).length;
}

exports.onNewTrainerSignup = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap) => {
    const user = snap.data() || {};
    // Clients are the trainers' customers, not Ani's — she only hears about trainers.
    if (user.role !== 'trainer') return null;

    const createdAt = new Date().toISOString();
    // Position in the signup queue, which is what the founding offer is about. The total
    // number of trainer documents is recorded alongside it for Ani's own numbers, but it
    // is not what decides a founding place.
    const signupNumber = (await countTrainerSignups()) + 1;
    const totalTrainers = await countRole('trainer');
    const withinFounding = signupNumber <= FOUNDING_PLACES;
    const name = user.name || '(no name)';
    const email = user.email || '(no email)';

    // 1. The durable record. Written first and on its own, so a failure in either of the
    //    delivery channels below can never cost Ani the signup itself.
    await db.collection('platformEvents').add({
      type: 'trainer_signup',
      userId: snap.id,
      name,
      email,
      signupNumber,
      totalTrainers,
      withinFounding,
      createdAt,
      readByOwner: false,
    });

    const foundingLine = withinFounding
      ? `Founding place ${signupNumber} of ${FOUNDING_PLACES}.`
      : `Founding places are gone (${FOUNDING_PLACES} of ${FOUNDING_PLACES} taken).`;

    const owner = await findOwner();

    // 2. Push, and 3. email — both best-effort and independent, so one failing does not
    //    take the other down with it.
    await Promise.allSettled([
      owner
        ? sendPush(owner.id, owner.data().fcmTokens, {
          title: `New trainer: ${name}`,
          body: `${email} — signup #${signupNumber}. ${foundingLine}`,
        }, { url: '/#/profile' })
        : Promise.resolve(),

      // The Firebase "Trigger Email" extension sends anything written to `mail`. If the
      // extension is not installed the document simply sits there unread — no crash, no
      // deploy-time dependency (CLAUDE.md #29), and the platformEvents record above still
      // exists either way.
      db.collection('mail').add({
        to: OWNER_EMAIL,
        message: {
          subject: `New ElitePro trainer: ${name} (signup #${signupNumber})`,
          text: [
            `Name:  ${name}`,
            `Email: ${email}`,
            `Time:  ${createdAt}`,
            `Signup number: ${signupNumber}`,
            `Trainer accounts in total: ${totalTrainers}`,
            foundingLine,
          ].join('\n'),
        },
      }),
    ]);

    console.log(`[onNewTrainerSignup] signup #${signupNumber} ${email} founding=${withinFounding}`);
    return null;
  });

// Owner-only operating numbers for the Profile page. A callable rather than a stored
// counter: it cannot drift, needs no backfill for the accounts that already exist, and
// the owner check happens server-side where it cannot be edited away in devtools.
exports.getPlatformStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  if ((context.auth.token.email || '').toLowerCase() !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Owner only');
  }

  const [trainerCount, clientCount, recentSnap] = await Promise.all([
    countRole('trainer'),
    countRole('client'),
    db.collection('platformEvents')
      .where('type', '==', 'trainer_signup')
      .get(),
  ]);

  // Ordered and numbered in JS rather than with orderBy, so this needs no composite index
  // (CLAUDE.md #34). The queue arithmetic itself lives in signupQueue.js, where it is
  // tested — it has been wrong in production twice.
  const { rows, signupCount, excludedCount, foundingRemaining } = summariseSignups(
    recentSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    FOUNDING_PLACES,
  );

  const recentSignups = rows
    .slice(-10)
    .reverse()
    .map(({ id, name, email, createdAt, excluded, signupNumber, withinFounding }) =>
      ({ id, name, email, createdAt, excluded, signupNumber, withinFounding }));

  return {
    trainerCount,
    clientCount,
    signupCount,
    excludedCount,
    foundingPlaces: FOUNDING_PLACES,
    foundingRemaining,
    recentSignups,
  };
});

// Owner-only: mark a signup event as not a real customer, or put it back.
//
// Ani tests the signup flow with her own addresses. Those are genuine events and the record
// of them is never edited or deleted (CLAUDE.md #27) — but they are not customers, and on
// 2026-08-31 one of them was holding founding place #1 and had pushed a notification to her
// phone announcing itself. Only what an event counts towards changes here.
exports.setSignupExcluded = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  if ((context.auth.token.email || '').toLowerCase() !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Owner only');
  }

  const eventId = String((data && data.eventId) || '').trim();
  if (!eventId) throw new functions.https.HttpsError('invalid-argument', 'eventId required');
  const excluded = !!(data && data.excluded);

  const ref = db.doc(`platformEvents/${eventId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'No such signup');
  if ((snap.data() || {}).type !== 'trainer_signup') {
    throw new functions.https.HttpsError('failed-precondition', 'Not a signup event');
  }

  await ref.update({ excluded, excludedAt: excluded ? new Date().toISOString() : null });
  return { eventId, excluded };
});

// Owner-only account audit. Ani looked at 37 trainer accounts and 54 client accounts and
// could not say what any of them were — and there is no other way for her to find out,
// since she works from a phone and nobody has Firestore console habits here.
//
// Worth stating what this can and cannot tell you: completeProfile() is the ONLY code path
// in the app that creates a users document, so every one of these is a real Firebase Auth
// sign-in that reached the role picker. None of them were seeded. What separates Ani's own
// testing from a stranger is the date they arrived and whether they ever did anything.
exports.getAccountAudit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  if ((context.auth.token.email || '').toLowerCase() !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Owner only');
  }

  const [usersSnap, plansSnap, schedSnap, logsSnap, authList] = await Promise.all([
    db.collection('users').get(),
    db.collection('workoutPlans').get(),
    db.collection('schedule').get(),
    db.collection('workoutLogs').get(),
    // Firebase Auth is the authoritative record of who actually turned up. The Firestore
    // profile only records the day the role was picked; Auth also knows how they signed in
    // and, crucially, whether they ever came back. A test account never has a second
    // visit — a real person does.
    getAuth().listUsers(1000).catch(() => ({ users: [] })),
  ]);

  const authByUid = {};
  (authList.users || []).forEach(u => {
    authByUid[u.uid] = {
      provider: (u.providerData && u.providerData[0] && u.providerData[0].providerId) || 'unknown',
      createdAt: u.metadata && u.metadata.creationTime ? u.metadata.creationTime.slice(0, 16) : null,
      lastSignIn: u.metadata && u.metadata.lastSignInTime ? u.metadata.lastSignInTime.slice(0, 16) : null,
    };
  });
  // A sign-in on a later day than the account was made. The single strongest signal that
  // somebody meant it.
  const returned = (uid) => {
    const a = authByUid[uid];
    if (!a || !a.createdAt || !a.lastSignIn) return false;
    return new Date(a.lastSignIn).toDateString() !== new Date(a.createdAt).toDateString();
  };

  const tally = (snap, key) => {
    const counts = {};
    snap.docs.forEach(d => {
      const id = d.data()[key];
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  };
  const plansBy = tally(plansSnap, 'trainerId');
  const sessionsBy = tally(schedSnap, 'trainerId');
  const logsBy = tally(logsSnap, 'clientId');

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const clients = users.filter(u => u.role === 'client');
  const clientsBy = {};
  clients.forEach(c => { if (c.trainerId) clientsBy[c.trainerId] = (clientsBy[c.trainerId] || 0) + 1; });

  const trainers = users
    .filter(u => u.role === 'trainer')
    .map(t => ({
      id: t.id,
      name: t.name || '(no name)',
      email: t.email || '(no email)',
      joinDate: t.joinDate || '(unknown)',
      clients: clientsBy[t.id] || 0,
      plans: plansBy[t.id] || 0,
      sessions: sessionsBy[t.id] || 0,
      provider: (authByUid[t.id] || {}).provider || 'unknown',
      lastSignIn: (authByUid[t.id] || {}).lastSignIn || null,
      returned: returned(t.id),
    }))
    // Anything that never gained a client, a plan or a session is an account that was
    // created and abandoned — which is what a testing run looks like from the outside.
    .map(t => ({ ...t, dormant: t.clients === 0 && t.plans === 0 && t.sessions === 0 }))
    .sort((a, b) => String(b.joinDate).localeCompare(String(a.joinDate)));

  // Signups per day. A single day holding a dozen accounts is a testing session; one
  // account on a day by itself is a person.
  const byDate = {};
  users.forEach(u => {
    const d = u.joinDate || '(unknown)';
    byDate[d] = byDate[d] || { date: d, trainers: 0, clients: 0 };
    if (u.role === 'trainer') byDate[d].trainers += 1;
    else if (u.role === 'client') byDate[d].clients += 1;
  });
  const signupsByDate = Object.values(byDate).sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    totals: {
      trainers: trainers.length,
      clients: clients.length,
      dormantTrainers: trainers.filter(t => t.dormant).length,
      unattachedClients: clients.filter(c => !c.trainerId).length,
      clientsWithNoLogs: clients.filter(c => !logsBy[c.id]).length,
      // Anyone, either role, who signed in again on a later day.
      returnedEver: users.filter(u => returned(u.id)).length,
      authRecordsFound: Object.keys(authByUid).length,
    },
    trainers,
    signupsByDate,
  };
});

// ─── Test-account cleanup (owner only) ───
//
// More than one automated test run has written accounts straight into the production
// project instead of the emulator: 2026-06-13/14 left ~91 on testtrainer<epoch>@example.com,
// and an earlier one left trainer_<epoch>@test.local.
//
// They are identifiable beyond doubt because both domains are reserved by standard and can
// never carry a mailbox. That fact is the entire safety story, so the list of such domains
// lives in exactly one place and nothing else decides who gets deleted — see
// testAccounts.js. Accounts on real domains are never swept, however test-like they look.

// listUsers returns at most 1000 per call, so a single call is a silent cap, not a list.
async function listAllAuthUsers() {
  const out = [];
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    out.push(...(page.users || []));
    pageToken = page.pageToken;
  } while (pageToken);
  return out;
}

// Firebase Auth is the register of who actually exists. Firestore only holds profiles, and
// an account can exist in Auth with no profile at all — a signup abandoned at the role
// screen, or a script that created logins and never got as far as writing documents.
//
// This function used to read Firestore alone, which meant it could not see, report or
// delete exactly the accounts that leave stray addresses behind. On 2026-08-31 the cleanup
// reported everything gone, Firestore was genuinely clean, and the Auth user list was still
// full of testtrainer…@example.com. The tool was not lying; it was looking in the wrong
// place. Auth is now the primary source and Firestore is folded in for anything Auth has
// already forgotten.
// The selection itself lives in testAccounts.js, where it can be tested without an
// emulator — the bug was never in the deleting, it was in deciding what to delete.
async function findTestAccounts() {
  const [snap, authUsers] = await Promise.all([
    db.collection('users').get(),
    listAllAuthUsers(),
  ]);
  return selectTestAccounts(authUsers, snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

exports.previewTestAccountCleanup = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  if ((context.auth.token.email || '').toLowerCase() !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Owner only');
  }

  const { doomed, strandedClients } = await findTestAccounts();
  return {
    count: doomed.length,
    trainers: doomed.filter(u => u.role === 'trainer').length,
    clients: doomed.filter(u => u.role === 'client').length,
    // Logins with no Firestore profile. They have no role, so without their own count they
    // would vanish from the trainers/clients breakdown and the totals would not add up.
    noProfile: doomed.filter(u => !u.hasProfile).length,
    accounts: doomed.slice(0, 200).map(u => ({ id: u.id, name: u.name || '', email: u.email || '', role: u.role || '' })),
    strandedClients: strandedClients.map(u => ({ id: u.id, name: u.name || '', email: u.email || '' })),
  };
});

exports.deleteTestAccounts = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  if ((context.auth.token.email || '').toLowerCase() !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Owner only');
  }

  const { doomed, strandedClients } = await findTestAccounts();

  // The caller has to say how many accounts they were shown. If the set changed between
  // the preview and the confirmation, this deletes nothing and says so — the alternative
  // is silently removing an account the owner never saw.
  const expected = Number(data && data.expectedCount);
  if (!Number.isInteger(expected) || expected !== doomed.length) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `The list changed since you reviewed it (${doomed.length} now, you confirmed ${expected}). Nothing was deleted — preview again.`,
    );
  }
  if (doomed.length === 0) return { deleted: 0, detached: 0, remaining: 0 };

  // Detach first. If anything later fails, a real client is already safe rather than
  // pointing at a trainer that no longer exists.
  for (const c of strandedClients) {
    await db.doc(`users/${c.id}`).update({ trainerId: null });
  }

  // Each account costs one Auth delete plus eight Firestore queries, all sequential, and a
  // callable's client-side timeout is around a minute. A large sweep would be cut off
  // part-way with no report of what actually happened. Every delete here is idempotent, so
  // capping the run and saying how many are left is both safe and honest.
  const MAX_PER_RUN = 40;
  const batchOfDoomed = doomed.slice(0, MAX_PER_RUN);

  let deleted = 0;
  for (const user of batchOfDoomed) {
    const uid = user.id;

    // Auth first: onAccountDelete cascades messages, logs, schedule, plans and exercises.
    // Admin deletes fire it the same as any other, and a missing Auth record is fine —
    // the Firestore side still gets cleaned below either way.
    await getAuth().deleteUser(uid).catch(() => {});

    // Everything onAccountDelete does not cover, plus the profile itself. Deleting a
    // document that is already gone is a no-op, so this stays safe to re-run.
    const subEntries = await db.collection(`bodyStats/${uid}/entries`).get().catch(() => ({ docs: [] }));
    const [invTrainer, invClient, ledgerClient, ledgerTrainer, templates, overrides, plansAsClient, logsAsTrainer] =
      await Promise.all([
        db.collection('invoices').where('trainerId', '==', uid).get(),
        db.collection('invoices').where('clientId', '==', uid).get(),
        db.collection('creditLedger').where('clientId', '==', uid).get(),
        db.collection('creditLedger').where('trainerId', '==', uid).get(),
        db.collection('templates').where('trainerId', '==', uid).get(),
        db.collection('exerciseOverrides').where('trainerId', '==', uid).get(),
        db.collection('workoutPlans').where('clientId', '==', uid).get(),
        db.collection('workoutLogs').where('trainerId', '==', uid).get(),
      ]);

    const refs = [
      ...subEntries.docs.map(d => d.ref),
      ...invTrainer.docs.map(d => d.ref),
      ...invClient.docs.map(d => d.ref),
      ...ledgerClient.docs.map(d => d.ref),
      ...ledgerTrainer.docs.map(d => d.ref),
      ...templates.docs.map(d => d.ref),
      ...overrides.docs.map(d => d.ref),
      ...plansAsClient.docs.map(d => d.ref),
      ...logsAsTrainer.docs.map(d => d.ref),
      db.doc(`bodyStats/${uid}`),
      db.doc(`intakeForms/${uid}`),
      db.doc(`users/${uid}`),
    ];

    // Firestore batches cap at 500 writes.
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      refs.slice(i, i + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
    deleted += 1;
  }

  const remaining = doomed.length - deleted;
  console.log(`[deleteTestAccounts] removed ${deleted} reserved-domain accounts, ${remaining} left, detached ${strandedClients.length} real clients`);
  return { deleted, detached: strandedClients.length, remaining };
});

// ── Invite code resolution ──
// Resolving an invite code is the one lookup a user has to make BEFORE they have any
// relationship with the person they are looking up, so it can never be served from
// AppContext's in-memory `users` array (CLAUDE.md #34).
//
// It used to be a direct Firestore query from the client, which is why `users` carried
// `allow read: if isAuth()` — every signed-in user could list every user document, and a
// user document contains an email address. Moving the lookup here lets that rule close to
// the three real relationships (own doc, own clients, own trainer) while the connect flow
// keeps working for a student who has none of them yet.
//
// Returns only what the connect screen actually displays. The trainer's email, session
// counts, bank details and rates are read but never sent back.
//
// Not rate limited. An authenticated caller can guess codes here, but a hit reveals only a
// coach's display name, and before this function existed the same caller could simply read
// the entire users collection — so this strictly reduces what a guesser gets. If codes ever
// start protecting something that matters, add a per-caller limit then.
exports.resolveInviteCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');

  const code = normalizeInviteCode((data && data.code) || '');
  if (!code) throw new functions.https.HttpsError('invalid-argument', 'Code required');

  // Deliberately a SINGLE-field equality query. Firestore auto-indexes every single field,
  // whereas adding `role == 'trainer'` as a second filter can require a composite index —
  // which, missing in production, throws failed-precondition and breaks this exact flow
  // again (#34). Role is filtered below in JS, where it costs nothing.
  const snap = await db.collection('users').where('inviteCode', '==', code).limit(10).get();
  const match = snap.docs.find(d => (d.data() || {}).role === 'trainer');
  if (!match) return { found: false };

  return {
    found: true,
    trainer: { id: match.id, name: (match.data() || {}).name || 'Coach' },
  };
});

// Owner-only: what does Firebase actually know about this email address?
//
// The client cannot answer this. Email enumeration protection makes
// sendPasswordResetEmail() resolve for an address with no account and send nothing, and
// it disables fetchSignInMethodsForEmail entirely — so when a student says "I never got
// the reset email", the app has no way to tell whether the address was wrong, whether
// they signed up with Google and have no password at all, or whether the mail was simply
// delivered to spam.
//
// The Admin SDK is not subject to that protection. This is owner-gated precisely because
// an open version of it would be the enumeration oracle the protection exists to prevent.
exports.lookupAccountByEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  if ((context.auth.token.email || '').toLowerCase() !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Owner only');
  }

  const email = String((data && data.email) || '').trim().toLowerCase();
  if (!email) throw new functions.https.HttpsError('invalid-argument', 'Email required');

  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (err) {
    if (err && err.code === 'auth/user-not-found') {
      return { exists: false, email };
    }
    throw new functions.https.HttpsError('internal', err.message || 'Lookup failed');
  }

  const providers = (user.providerData || []).map(p => p.providerId);
  const profile = await db.doc(`users/${user.uid}`).get();

  return {
    exists: true,
    email,
    uid: user.uid,
    providers,
    // A Google-only account has no password to reset. Telling that person to use the reset
    // email is the wrong instruction — they should sign in with Google.
    canResetPassword: providers.includes('password'),
    disabled: user.disabled,
    emailVerified: user.emailVerified,
    createdAt: user.metadata && user.metadata.creationTime ? user.metadata.creationTime : null,
    lastSignIn: user.metadata && user.metadata.lastSignInTime ? user.metadata.lastSignInTime : null,
    hasProfile: profile.exists,
    role: profile.exists ? (profile.data().role || null) : null,
  };
});
