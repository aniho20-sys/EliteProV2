/* global require, exports */
const functions = require('firebase-functions/v1');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { writeGcAccessToken } = require('./gcSecrets');
const { createNonce, consumeNonce } = require('./gcOAuthNonce');

initializeApp();
const db = getFirestore();

// ElitePro's own GoCardless Partner app credentials — one app, shared across
// all trainers (this is NOT a per-trainer secret; per-trainer OAuth tokens
// are handled separately in gcSecrets.js). Static, known at deploy time, so
// these use Firebase's native defineSecret()/`firebase functions:secrets:set`
// instead of the manual Secret Manager calls gcSecrets.js makes for the
// dynamic per-trainer case. Never sent to any client.
const GC_CLIENT_ID = defineSecret('GC_CLIENT_ID');
const GC_CLIENT_SECRET = defineSecret('GC_CLIENT_SECRET');
const GC_REDIRECT_URI = defineSecret('GC_REDIRECT_URI');

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
exports.onScheduleBooked = functions.firestore
  .document('schedule/{schedId}')
  .onCreate(async (snap) => {
    const sched = snap.data();
    if (!sched || sched.isBlocked || !sched.clientId || sched.deductedAtBooking) return;

    const clientRef = db.doc(`users/${sched.clientId}`);
    await db.runTransaction(async (tx) => {
      const clientDoc = await tx.get(clientRef);
      if (!clientDoc.exists) return;
      const current = clientDoc.data().sessionOffset ?? 0;
      tx.update(clientRef, { sessionOffset: current + 1 });
      tx.update(snap.ref, { deductedAtBooking: true });
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
exports.gcOAuthStart = functions
  .runWith({ secrets: [GC_CLIENT_ID, GC_REDIRECT_URI] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    const trainerId = context.auth.uid;
    const trainerSnap = await db.doc(`users/${trainerId}`).get();
    if (!trainerSnap.exists || trainerSnap.data().role !== 'trainer') {
      throw new functions.https.HttpsError('permission-denied', 'Trainers only');
    }

    // `state` is a crypto-random, single-use, 10-minute nonce bound to this
    // trainerId server-side — never the trainerId itself, which would let
    // anyone forge a state value for any known trainer UID.
    const nonce = await createNonce(trainerId);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: GC_CLIENT_ID.value(),
      redirect_uri: GC_REDIRECT_URI.value(),
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
exports.gcOAuthCallback = functions
  .runWith({ secrets: [GC_CLIENT_ID, GC_CLIENT_SECRET, GC_REDIRECT_URI] })
  .https.onRequest(async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
      res.status(400).send('Missing code or state');
      return;
    }

    const nonceResult = await consumeNonce(String(state));
    if (!nonceResult.ok) {
      console.warn('[gcOAuthCallback] rejected state:', nonceResult.reason);
      res.status(400).send('Invalid or expired request');
      return;
    }
    const trainerId = nonceResult.trainerId;

    // 4th check: the identity the nonce resolved to must still be a real,
    // current trainer (not deleted/role-changed since gcOAuthStart issued it).
    const trainerSnap = await db.doc(`users/${trainerId}`).get();
    if (!trainerSnap.exists || trainerSnap.data().role !== 'trainer') {
      res.status(400).send('Invalid trainer');
      return;
    }

    const tokenRes = await fetch(GC_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        client_id: GC_CLIENT_ID.value(),
        client_secret: GC_CLIENT_SECRET.value(),
        redirect_uri: GC_REDIRECT_URI.value(),
      }),
    });
    if (!tokenRes.ok) {
      console.error('[gcOAuthCallback] token exchange failed', await tokenRes.text());
      res.status(502).send('GoCardless token exchange failed');
      return;
    }
    const tokenJson = await tokenRes.json();

    // WRITE PATH: token -> Secret Manager only.
    await writeGcAccessToken(trainerId, tokenJson.access_token);

    // Non-sensitive metadata -> Firestore, Admin SDK (bypasses client rules).
    await db.doc(`gcConnections/${trainerId}`).set({
      trainerId,
      gcOrganisationId: tokenJson.organisation_id || null,
      environment: 'sandbox',
      status: 'connected',
      connectedAt: new Date().toISOString(),
    });

    res.redirect('https://elitepro-16718.web.app/#/profile?gc=connected');
  });
