/* global require, exports */
const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const HttpsError = functions.https.HttpsError;

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

// ─── Credit System Helpers ───

// Detects London's UTC offset via a noon-UTC probe (handles BST/GMT automatically).
// Returns true when the given London-time session is more than 24 hours away.
function isMoreThan24HoursAway(dateStr, timeStr) {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/London', hour: 'numeric', hour12: false }).format(probe)
  ) % 24;
  const londonOffsetFromUTC = 12 - londonHour; // -1 for BST (UTC+1), 0 for GMT
  const sessionAsUTCMs = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
  const sessionTrueUTCMs = sessionAsUTCMs + londonOffsetFromUTC * 3600 * 1000;
  return (sessionTrueUTCMs - Date.now()) > 24 * 60 * 60 * 1000;
}

// Returns current YYYY-MM in Europe/London time using formatToParts for reliability.
function getLondonMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  return `${year}-${month}`;
}

// ─── Book Session → create schedule doc + deduct credit atomically ───
// Supports both client self-booking (clientId omitted) and trainer booking on
// behalf of a client (clientId passed explicitly). Server verifies authorization.
exports.bookSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = context.auth.uid;
  const { date, time, type, trainerId, duration, notes, clientId: requestedClientId } = data || {};

  if (!date || !time || !trainerId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: date, time, trainerId');
  }

  // Determine clientId and verify authorization
  let clientId;
  if (requestedClientId && requestedClientId !== uid) {
    // Trainer booking on behalf of a client — verify caller is the trainer
    if (trainerId !== uid) {
      throw new HttpsError('invalid-argument', 'trainerId must match the calling trainer');
    }
    const callerSnap = await db.doc(`users/${uid}`).get();
    if (!callerSnap.exists || callerSnap.data().role !== 'trainer') {
      throw new HttpsError('permission-denied', 'Only trainers can book on behalf of a client');
    }
    const clientDocSnap = await db.doc(`users/${requestedClientId}`).get();
    if (!clientDocSnap.exists || clientDocSnap.data().trainerId !== uid) {
      throw new HttpsError('permission-denied', 'This client is not assigned to you');
    }
    clientId = requestedClientId;
  } else {
    clientId = uid;
  }

  const clientRef = db.doc(`users/${clientId}`);
  const schedId = `sched-${Date.now()}-${clientId.slice(0, 6)}`;
  const schedRef = db.doc(`schedule/${schedId}`);

  let newBalance;
  await db.runTransaction(async (transaction) => {
    const clientSnap = await transaction.get(clientRef);
    if (!clientSnap.exists) throw new HttpsError('not-found', 'Client profile not found');

    const currentBalance = clientSnap.data().creditBalance ?? 0;
    if (currentBalance <= 0) {
      throw new HttpsError('failed-precondition', 'No credits remaining. Contact your coach to top up.');
    }

    newBalance = currentBalance - 1;
    const now = new Date().toISOString();
    const ledgerId = `ledger-${Date.now()}-${clientId.slice(0, 6)}`;

    transaction.set(schedRef, {
      id: schedId,
      clientId,
      trainerId,
      date,
      time,
      type: type || 'PT Session',
      duration: Number(duration) || 60,
      notes: notes || '',
      status: 'pending',
      creditDeducted: true,
      createdAt: now,
    });

    transaction.update(clientRef, { creditBalance: newBalance });

    transaction.set(db.doc(`creditLedger/${ledgerId}`), {
      id: ledgerId,
      clientId,
      trainerId,
      amount: -1,
      balance_after: newBalance,
      type: 'booking',
      credit_type: 'session',
      expires_at: null,
      schedule_id: schedId,
      note: `Booking: ${type || 'PT Session'} on ${date} at ${time}`,
      created_at: now,
      created_by: uid,
    });
  });

  return { newBalance, scheduleId: schedId };
});

// ─── Cancel Session → refund credit per policy (server-side enforcement) ───
exports.cancelSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = context.auth.uid;
  const { scheduleId } = data || {};

  if (!scheduleId) throw new HttpsError('invalid-argument', 'Missing scheduleId');

  const schedSnap = await db.doc(`schedule/${scheduleId}`).get();
  if (!schedSnap.exists) throw new HttpsError('not-found', 'Session not found');

  const sched = schedSnap.data();
  const isCoach = uid === sched.trainerId;
  const isClient = uid === sched.clientId;

  if (!isCoach && !isClient) {
    throw new HttpsError('permission-denied', 'Not authorized to cancel this session');
  }
  if (!['pending', 'confirmed'].includes(sched.status)) {
    throw new HttpsError('failed-precondition', `Session cannot be cancelled (status: ${sched.status})`);
  }

  const clientRef = db.doc(`users/${sched.clientId}`);
  let refunded = false;
  let newBalance = null;

  await db.runTransaction(async (transaction) => {
    const clientSnap = await transaction.get(clientRef);
    if (!clientSnap.exists) throw new HttpsError('not-found', 'Client not found');

    const clientData = clientSnap.data();
    const currentBalance = clientData.creditBalance ?? 0;
    let ledgerType = null;
    let ledgerNote = '';
    const clientUpdates = {};

    if (isCoach) {
      if (sched.creditDeducted) {
        refunded = true;
        newBalance = currentBalance + 1;
        clientUpdates.creditBalance = newBalance;
        ledgerType = 'cancellation_refund';
        ledgerNote = 'Coach cancelled — credit refunded';
      }
    } else {
      const moreThan24h = isMoreThan24HoursAway(sched.date, sched.time);
      const londonMonth = getLondonMonth();
      const storedMonth = clientData.rescheduleMonth || '';
      const count = storedMonth === londonMonth ? (clientData.rescheduleCount || 0) : 0;
      const withinLimit = count < 2;

      if (sched.creditDeducted && moreThan24h && withinLimit) {
        refunded = true;
        newBalance = currentBalance + 1;
        clientUpdates.creditBalance = newBalance;
        clientUpdates.rescheduleCount = count + 1;
        clientUpdates.rescheduleMonth = londonMonth;
        ledgerType = 'cancellation_refund';
        ledgerNote = 'Client cancelled >24hr in advance — credit refunded';
      } else if (sched.creditDeducted) {
        refunded = false;
        newBalance = currentBalance;
        if (!moreThan24h) {
          ledgerType = 'no_show_forfeit';
          ledgerNote = 'Late cancellation (<24hr) — credit forfeited';
        } else {
          ledgerType = 'reschedule_forfeit';
          ledgerNote = 'Reschedule limit reached — credit forfeited';
        }
      }
    }

    transaction.update(db.doc(`schedule/${scheduleId}`), { status: 'cancelled' });

    if (Object.keys(clientUpdates).length > 0) {
      transaction.update(clientRef, clientUpdates);
    }

    if (ledgerType) {
      const now = new Date().toISOString();
      const ledgerId = `ledger-${Date.now()}-${uid.slice(0, 6)}`;
      transaction.set(db.doc(`creditLedger/${ledgerId}`), {
        id: ledgerId,
        clientId: sched.clientId,
        trainerId: sched.trainerId,
        amount: refunded ? 1 : 0,
        balance_after: refunded ? newBalance : currentBalance,
        type: ledgerType,
        credit_type: 'session',
        expires_at: null,
        schedule_id: scheduleId,
        note: ledgerNote,
        created_at: now,
        created_by: uid,
      });
    }
  });

  return { refunded, newBalance };
});

// ─── Adjust Client Credits → trainer manually adds/removes credits ───
exports.adjustClientCredits = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const uid = context.auth.uid;
  const { clientId, amount, note } = data || {};

  if (!clientId || amount === undefined || amount === null) {
    throw new HttpsError('invalid-argument', 'Missing clientId or amount');
  }

  const callerSnap = await db.doc(`users/${uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== 'trainer') {
    throw new HttpsError('permission-denied', 'Only trainers can adjust credits');
  }

  const clientRef = db.doc(`users/${clientId}`);
  let newBalance;

  await db.runTransaction(async (transaction) => {
    const clientSnap = await transaction.get(clientRef);
    if (!clientSnap.exists) throw new HttpsError('not-found', 'Client not found');

    const clientData = clientSnap.data();
    if (clientData.trainerId !== uid) {
      throw new HttpsError('permission-denied', 'This client is not assigned to you');
    }

    const current = clientData.creditBalance ?? 0;
    newBalance = Math.max(0, current + Number(amount));

    transaction.update(clientRef, { creditBalance: newBalance });

    const now = new Date().toISOString();
    const ledgerId = `ledger-${Date.now()}-${uid.slice(0, 6)}`;
    const amt = Number(amount);
    transaction.set(db.doc(`creditLedger/${ledgerId}`), {
      id: ledgerId,
      clientId,
      trainerId: uid,
      amount: amt,
      balance_after: newBalance,
      type: 'coach_adjustment',
      credit_type: 'session',
      expires_at: null,
      schedule_id: null,
      note: note || `Coach adjusted credits by ${amt > 0 ? '+' : ''}${amt}`,
      created_at: now,
      created_by: uid,
    });
  });

  return { newBalance };
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
