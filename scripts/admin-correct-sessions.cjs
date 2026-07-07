/**
 * Admin Correction Script — Credit System Session Audit
 * ──────────────────────────────────────────────────────
 * Finds schedule docs where a credit should have been deducted but wasn't:
 *   status != 'cancelled'  AND  creditDeducted != true
 *
 * Splits results into:
 *   BEFORE: sessions created before the credit system launched (2026-07-07)
 *   AFTER:  sessions created after launch — these are the problem cases
 *
 * USAGE
 * ─────
 *   1. Export service account key from Firebase Console → Project Settings → Service Accounts
 *      → Generate new private key → save as /tmp/sa.json (never commit this file)
 *   2. Run: GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json node scripts/admin-correct-sessions.cjs
 *
 * By default this script only LISTS — it does NOT modify any data.
 * To apply corrections to a specific session, call correctSession(scheduleId, reason) below.
 *
 * The correction function:
 *   - Deducts 1 credit from the client atomically (transaction)
 *   - Writes a ledger entry with type: 'manual_correction'
 *   - Sets creditDeducted: true on the schedule doc
 *   - Requires trainer to be present and client to have creditBalance >= 1
 */

'use strict';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// ── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ID = 'elitepro-16718';

// Credit system launch date — sessions created on or after this date that
// lack creditDeducted:true are genuine bugs needing correction.
const LAUNCH_DATE = '2026-07-07T00:00:00.000Z';

// ── Init ─────────────────────────────────────────────────────────────────────

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}
const db = getFirestore();

// ── Audit ─────────────────────────────────────────────────────────────────────

async function auditSessions() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ElitePro Credit System — Session Audit');
  console.log('═══════════════════════════════════════════════════\n');

  // Query all non-cancelled sessions (Firestore can't query "field != value" for
  // creditDeducted directly because docs may lack the field entirely;
  // we filter post-fetch for creditDeducted !== true)
  const snap = await db.collection('schedule')
    .where('status', 'in', ['pending', 'confirmed', 'completed'])
    .get();

  console.log(`Total non-cancelled sessions: ${snap.size}\n`);

  const missingCredit = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.creditDeducted !== true);

  if (missingCredit.length === 0) {
    console.log('✅ No sessions found with missing creditDeducted. All good.\n');
    return;
  }

  const before = missingCredit.filter(s => !s.createdAt || s.createdAt < LAUNCH_DATE);
  const after  = missingCredit.filter(s => s.createdAt && s.createdAt >= LAUNCH_DATE);

  console.log(`Sessions missing creditDeducted: ${missingCredit.length}`);
  console.log(`  BEFORE ${LAUNCH_DATE} (legacy, expected): ${before.length}`);
  console.log(`  AFTER  ${LAUNCH_DATE} (bug, needs review): ${after.length}\n`);

  // ── Pre-launch sessions (expected — they used the old totalSessions system) ──
  if (before.length > 0) {
    console.log('── PRE-LAUNCH SESSIONS (no action needed) ──────────────');
    before.forEach(s => {
      console.log(`  ${s.id} | client=${s.clientId} | date=${s.date} | status=${s.status} | createdAt=${s.createdAt || '(none)'}`);
    });
    console.log('');
  }

  // ── Post-launch sessions (these are the bug cases) ──
  if (after.length === 0) {
    console.log('✅ No post-launch sessions with missing creditDeducted.\n');
    return;
  }

  console.log('── POST-LAUNCH SESSIONS (REVIEW REQUIRED) ──────────────');
  after.forEach(s => {
    console.log(`  ${s.id}`);
    console.log(`    clientId  : ${s.clientId}`);
    console.log(`    trainerId : ${s.trainerId}`);
    console.log(`    date      : ${s.date} ${s.time}`);
    console.log(`    status    : ${s.status}`);
    console.log(`    createdAt : ${s.createdAt}`);
    console.log('');
  });

  console.log('To apply a correction, uncomment and run correctSession() at the bottom of this script.\n');

  return after;
}

// ── Correction ────────────────────────────────────────────────────────────────

/**
 * Deducts 1 credit from the client and writes a manual_correction ledger entry.
 * Only call this after manually confirming the session genuinely used a credit.
 *
 * @param {string} scheduleId  - The schedule doc ID to correct
 * @param {string} reason      - Human-readable reason (written to ledger note)
 */
async function correctSession(scheduleId, reason) {
  console.log(`\nCorrecting session: ${scheduleId}`);
  console.log(`Reason: ${reason}\n`);

  const schedRef = db.doc(`schedule/${scheduleId}`);
  const schedSnap = await schedRef.get();
  if (!schedSnap.exists) {
    console.error(`ERROR: Schedule doc ${scheduleId} not found`);
    return;
  }

  const sched = schedSnap.data();
  if (sched.creditDeducted === true) {
    console.warn(`SKIP: creditDeducted is already true on ${scheduleId}`);
    return;
  }
  if (sched.status === 'cancelled') {
    console.warn(`SKIP: session ${scheduleId} is cancelled — no correction needed`);
    return;
  }

  const clientRef = db.doc(`users/${sched.clientId}`);

  await db.runTransaction(async (transaction) => {
    const clientSnap = await transaction.get(clientRef);
    if (!clientSnap.exists) throw new Error(`Client ${sched.clientId} not found`);

    const currentBalance = clientSnap.data().creditBalance ?? 0;
    if (currentBalance < 1) {
      throw new Error(
        `Client ${sched.clientId} has creditBalance=${currentBalance} — cannot deduct. ` +
        'Add credits first via adjustClientCredits, then re-run.'
      );
    }

    const newBalance = currentBalance - 1;
    const now = new Date().toISOString();
    const ledgerId = `ledger-${Date.now()}-manual`;

    transaction.update(schedRef, { creditDeducted: true });
    transaction.update(clientRef, { creditBalance: newBalance });
    transaction.set(db.doc(`creditLedger/${ledgerId}`), {
      id: ledgerId,
      clientId: sched.clientId,
      trainerId: sched.trainerId,
      amount: -1,
      balance_after: newBalance,
      type: 'manual_correction',
      credit_type: 'session',
      expires_at: null,
      schedule_id: scheduleId,
      note: `Manual correction: ${reason}`,
      created_at: now,
      created_by: 'admin-script',
    });
  });

  console.log(`✅ Corrected ${scheduleId}: creditDeducted=true, ledger entry written`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await auditSessions();

    // ── TO APPLY A CORRECTION: uncomment and fill in the details below ──
    //
    // await correctSession(
    //   'sched-1234567890-abc123',  // scheduleId to correct
    //   'Session booked before migration ran; client confirmed credit was owed'
    // );
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
