const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

/**
 * Send push to an array of FCM tokens.
 * Automatically removes invalid tokens from the user's doc.
 */
async function sendPush(userId, tokens, notification, data) {
  if (!tokens || tokens.length === 0) return;

  const results = await Promise.allSettled(
    tokens.map(token =>
      getMessaging().send({
        token,
        notification,
        data: data || {},
        webpush: {
          fcmOptions: { link: data?.url || '/' },
        },
      })
    )
  );

  // Clean up stale tokens
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

// ─── New Message → Push to recipient ───
exports.onNewMessage = onDocumentCreated('messages/{messageId}', async (event) => {
  const msg = event.data.data();
  if (!msg || !msg.to || !msg.from) return;

  const [recipientSnap, senderSnap] = await Promise.all([
    db.doc(`users/${msg.to}`).get(),
    db.doc(`users/${msg.from}`).get(),
  ]);

  if (!recipientSnap.exists) return;
  const { fcmTokens } = recipientSnap.data();
  const senderName = senderSnap.exists ? senderSnap.data().name : 'Someone';

  const body = msg.text.length > 120 ? msg.text.substring(0, 120) + '…' : msg.text;

  await sendPush(msg.to, fcmTokens, {
    title: senderName,
    body,
  }, {
    type: 'message',
    url: '/#/messages',
    fromId: msg.from,
  });
});

// ─── New Schedule → Push to client ───
exports.onNewSchedule = onDocumentCreated('schedule/{schedId}', async (event) => {
  const sched = event.data.data();
  if (!sched || !sched.clientId || !sched.trainerId) return;

  const [clientSnap, trainerSnap] = await Promise.all([
    db.doc(`users/${sched.clientId}`).get(),
    db.doc(`users/${sched.trainerId}`).get(),
  ]);

  if (!clientSnap.exists) return;
  const { fcmTokens } = clientSnap.data();
  const trainerName = trainerSnap.exists ? trainerSnap.data().name : 'Your trainer';

  await sendPush(sched.clientId, fcmTokens, {
    title: 'New Session',
    body: `${trainerName} scheduled ${sched.type} on ${sched.date} at ${sched.time}`,
  }, {
    type: 'schedule',
    url: '/#/schedule',
  });
});

// ─── Schedule status change → Push to relevant party ───
exports.onScheduleUpdate = onDocumentUpdated('schedule/{schedId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after || before.status === after.status) return;

  // Notify the OTHER party about the status change
  const statusLabel = { confirmed: 'confirmed', cancelled: 'cancelled', completed: 'completed' };
  const label = statusLabel[after.status];
  if (!label) return;

  // If trainer changed status → notify client, and vice versa
  const notifyId = after.clientId; // simplified: always notify client
  const snap = await db.doc(`users/${notifyId}`).get();
  if (!snap.exists) return;

  const { fcmTokens } = snap.data();

  await sendPush(notifyId, fcmTokens, {
    title: `Session ${label}`,
    body: `Your ${after.type} on ${after.date} at ${after.time} has been ${label}`,
  }, {
    type: 'schedule',
    url: '/#/schedule',
  });
});
