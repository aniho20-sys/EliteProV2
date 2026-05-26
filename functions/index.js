/* global require, exports */
const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

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

// ─── New Message → Push to recipient ───
exports.onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap) => {
    const msg = snap.data();
    if (!msg || !msg.to || !msg.from) return;

    const [recipientSnap, senderSnap, unreadSnap] = await Promise.all([
      db.doc(`users/${msg.to}`).get(),
      db.doc(`users/${msg.from}`).get(),
      db.collection('messages').where('to', '==', msg.to).where('read', '==', false).get(),
    ]);

    if (!recipientSnap.exists) return;
    const { fcmTokens } = recipientSnap.data();
    const senderName = senderSnap.exists ? senderSnap.data().name : 'Someone';
    const body = msg.text.length > 120 ? msg.text.substring(0, 120) + '…' : msg.text;
    const badgeCount = String(unreadSnap.size); // new message is already in the count

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

// ─── Sessions running low → Push to trainer when remaining drops to ≤ 2 ───
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

    // Only fire when crossing the ≤ 2 threshold for the first time
    if (remainingAfter > 2 || remainingBefore <= 2) return;

    const trainerId = after.trainerId;
    if (!trainerId) return;

    const trainerSnap = await db.doc(`users/${trainerId}`).get();
    if (!trainerSnap.exists) return;

    const clientName = after.name || 'A client';
    const clientId = change.after.id;

    await sendPush(trainerId, trainerSnap.data().fcmTokens, {
      title: '⚠️ 堂數不足',
      body: `${clientName} 只剩 ${remainingAfter} 堂，記得提醒續費`,
    }, {
      type: 'sessions_low',
      url: `/#/clients/${clientId}`,
      clientId,
    });
  });
