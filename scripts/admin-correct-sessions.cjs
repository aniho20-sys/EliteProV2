/**
 * ElitePro Admin Script — Credit System Migration & Audit
 * ────────────────────────────────────────────────────────
 *
 * SETUP
 * ─────
 *   Export service account key: Firebase Console → Project Settings →
 *   Service Accounts → Generate new private key → save as /tmp/sa.json
 *   (NEVER commit this file)
 *
 * COMMANDS
 * ────────
 *   migrate              Dry-run: print before → after for every unmigrated client
 *   migrate --execute    Apply migration (atomic per client: creditBalance + ledger)
 *   audit                List sessions missing creditDeducted, split pre/post launch
 *   correct <id> <note>  Apply manual credit correction to a specific session
 *
 * EXAMPLES
 * ────────
 *   GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json node scripts/admin-correct-sessions.cjs migrate
 *   GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json node scripts/admin-correct-sessions.cjs migrate --execute
 *   GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json node scripts/admin-correct-sessions.cjs audit
 *   GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json node scripts/admin-correct-sessions.cjs correct sched-xxx "session booked before migration"
 */

'use strict';

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID  = 'elitepro-16718';
const LAUNCH_DATE = '2026-07-07T00:00:00.000Z';

if (!getApps().length) initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// migrate
// Sets creditBalance on every client whose field is null/missing.
// Calculation: totalSessions - sessionOffset (or 0 if no quota).
// Each write is a separate Firestore transaction so the check-then-write is
// atomic — safe to run from multiple machines simultaneously.
// ─────────────────────────────────────────────────────────────────────────────
async function migrate(execute) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Credit Balance Migration  [${execute ? 'EXECUTE' : 'DRY RUN'}]`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Fetch all clients — filter creditBalance == null in memory because
  // Firestore "field does not exist" queries require composite indexes.
  const snap = await db.collection('users').where('role', '==', 'client').get();
  const unmigrated = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.creditBalance == null);

  if (unmigrated.length === 0) {
    console.log('✅ All clients already have creditBalance set. Nothing to migrate.\n');
    return;
  }

  console.log(`Clients to migrate: ${unmigrated.length}\n`);
  console.log(
    'clientId'.padEnd(28) +
    'name'.padEnd(22) +
    'totalSessions'.padEnd(15) +
    'sessionOffset'.padEnd(15) +
    'creditBalance (before → after)'
  );
  console.log('─'.repeat(100));

  for (const client of unmigrated) {
    const remaining = client.totalSessions != null
      ? Math.max(0, client.totalSessions - (client.sessionOffset || 0))
      : 0;
    console.log(
      client.id.slice(0, 26).padEnd(28) +
      (client.name || '—').slice(0, 20).padEnd(22) +
      String(client.totalSessions ?? '—').padEnd(15) +
      String(client.sessionOffset ?? '—').padEnd(15) +
      `null → ${remaining}`
    );
  }

  if (!execute) {
    console.log('\n[DRY RUN] No data written. Re-run with --execute to apply.\n');
    return;
  }

  console.log('\nApplying migration…\n');
  let ok = 0, skipped = 0, failed = 0;

  for (const client of unmigrated) {
    const remaining = client.totalSessions != null
      ? Math.max(0, client.totalSessions - (client.sessionOffset || 0))
      : 0;

    const clientRef = db.doc(`users/${client.id}`);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(clientRef);
        if (!snap.exists) throw new Error('Client doc not found');

        // Re-check inside transaction — prevents double-write if run concurrently
        if (snap.data().creditBalance != null) {
          skipped++;
          return; // already migrated by another process, skip silently
        }

        const now = new Date().toISOString();
        const ledgerId = `ledger-${Date.now()}-migrate-${client.id.slice(0, 6)}`;

        tx.update(clientRef, { creditBalance: remaining });

        tx.set(db.doc(`creditLedger/${ledgerId}`), {
          id: ledgerId,
          clientId: client.id,
          trainerId: client.trainerId || null,
          amount: remaining,
          balance_after: remaining,
          type: 'migration',
          credit_type: 'session',
          expires_at: null,
          schedule_id: null,
          note: `Initial credit balance migrated from totalSessions system` +
                (client.totalSessions != null
                  ? ` (${client.totalSessions} total − ${client.sessionOffset || 0} used = ${remaining})`
                  : ' (no totalSessions set; starting at 0)'),
          created_at: now,
          created_by: 'admin-script/migrate',
        });
      });
      console.log(`  ✅ ${client.id} (${client.name || '—'}) → creditBalance: ${remaining}`);
      ok++;
    } catch (err) {
      console.error(`  ❌ ${client.id} (${client.name || '—'}) — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} migrated, ${skipped} already migrated (skipped), ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// audit
// Finds non-cancelled sessions missing creditDeducted, split pre/post launch.
// ─────────────────────────────────────────────────────────────────────────────
async function audit() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Session Audit — Missing creditDeducted');
  console.log('═══════════════════════════════════════════════════════\n');

  const snap = await db.collection('schedule')
    .where('status', 'in', ['pending', 'confirmed', 'completed'])
    .get();

  console.log(`Total non-cancelled sessions: ${snap.size}\n`);

  const missing = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.creditDeducted !== true);

  if (missing.length === 0) {
    console.log('✅ No sessions with missing creditDeducted.\n');
    return;
  }

  const before = missing.filter(s => !s.createdAt || s.createdAt < LAUNCH_DATE);
  const after  = missing.filter(s => s.createdAt  && s.createdAt >= LAUNCH_DATE);

  console.log(`Missing creditDeducted: ${missing.length}`);
  console.log(`  BEFORE ${LAUNCH_DATE} (legacy — no action needed): ${before.length}`);
  console.log(`  AFTER  ${LAUNCH_DATE} (potential bug — review):    ${after.length}\n`);

  if (before.length > 0) {
    console.log('── PRE-LAUNCH (legacy, expected) ────────────────────────');
    before.forEach(s =>
      console.log(`  ${s.id} | client=${s.clientId} | ${s.date} | ${s.status} | createdAt=${s.createdAt || '(none)'}`)
    );
    console.log('');
  }

  if (after.length > 0) {
    console.log('── POST-LAUNCH (review required) ────────────────────────');
    after.forEach(s => {
      console.log(`  ${s.id}`);
      console.log(`    clientId  : ${s.clientId}`);
      console.log(`    trainerId : ${s.trainerId}`);
      console.log(`    date      : ${s.date} ${s.time}`);
      console.log(`    status    : ${s.status}`);
      console.log(`    createdAt : ${s.createdAt}`);
      console.log('');
    });
    console.log('Run: node scripts/admin-correct-sessions.cjs correct <schedId> "<reason>"\n');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// correct
// Deducts 1 credit + writes manual_correction ledger entry for a session.
// ─────────────────────────────────────────────────────────────────────────────
async function correct(scheduleId, reason) {
  if (!scheduleId || !reason) {
    console.error('Usage: correct <scheduleId> "<reason>"');
    process.exit(1);
  }

  console.log(`\nCorrecting session: ${scheduleId}`);
  console.log(`Reason: ${reason}\n`);

  const schedRef = db.doc(`schedule/${scheduleId}`);
  const schedSnap = await schedRef.get();
  if (!schedSnap.exists) { console.error('ERROR: Schedule doc not found'); process.exit(1); }

  const sched = schedSnap.data();
  if (sched.creditDeducted === true) { console.warn('SKIP: creditDeducted already true'); return; }
  if (sched.status === 'cancelled')  { console.warn('SKIP: session is cancelled'); return; }

  const clientRef = db.doc(`users/${sched.clientId}`);

  await db.runTransaction(async (tx) => {
    const clientSnap = await tx.get(clientRef);
    if (!clientSnap.exists) throw new Error(`Client ${sched.clientId} not found`);

    const current = clientSnap.data().creditBalance ?? 0;
    if (current < 1) throw new Error(`Client has creditBalance=${current} — add credits first`);

    const newBalance = current - 1;
    const now = new Date().toISOString();
    const ledgerId = `ledger-${Date.now()}-manual`;

    tx.update(schedRef, { creditDeducted: true });
    tx.update(clientRef, { creditBalance: newBalance });
    tx.set(db.doc(`creditLedger/${ledgerId}`), {
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
      created_by: 'admin-script/correct',
    });
  });

  console.log(`✅ Done: creditDeducted=true, creditBalance decremented, ledger written.\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  const [,, cmd, ...rest] = process.argv;

  try {
    if (cmd === 'migrate') {
      await migrate(rest.includes('--execute'));
    } else if (cmd === 'audit') {
      await audit();
    } else if (cmd === 'correct') {
      await correct(rest[0], rest.slice(1).join(' '));
    } else {
      console.log([
        '',
        'Usage: GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json node scripts/admin-correct-sessions.cjs <command>',
        '',
        'Commands:',
        '  migrate              Dry-run: print before → after for every unmigrated client',
        '  migrate --execute    Apply migration (atomic per client)',
        '  audit                List sessions missing creditDeducted',
        '  correct <id> <note>  Apply manual credit correction to a session',
        '',
      ].join('\n'));
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
