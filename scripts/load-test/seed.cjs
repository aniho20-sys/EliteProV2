// Load test only (scripts/load-test/README.md): fills the LOCAL emulators with coaches whose
// clients have a year of history, so measure.py can time the coach's app against them.
//
// Refuses to run unless both emulator hosts are set to 127.0.0.1 — firebase-admin with no
// emulator host would write to elitepro-16718 itself (CLAUDE.md #38).
//
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//     node scripts/load-test/seed.cjs 10 50 100 200 [--summaries]
//
// --summaries also builds each client's summary with the server's own code
// (functions/clientSummary.js), as production does once the coach's app asks — B76 step 2.

const local = (v) => typeof v === 'string' && /^127\.0\.0\.1:\d+$/.test(v);
if (!local(process.env.FIRESTORE_EMULATOR_HOST) || !local(process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  console.error('Refusing: set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST to 127.0.0.1:<port>.');
  process.exit(1);
}

const path = require('path');
const admin = require(path.join(__dirname, '../../functions/node_modules/firebase-admin'));
admin.initializeApp({ projectId: 'elitepro-16718' });
const db = admin.firestore();
const auth = admin.auth();

const PASSWORD = 'loadtest-only';
const WEEKS = 52;
const TODAY = new Date('2026-10-24T12:00:00Z');
const EXERCISES = ['bench-press', 'squat', 'deadlift', 'barbell-row', 'overhead-press', 'pull-up', 'lat-pulldown', 'lateral-raise'];

const day = (offset) => {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function account(uid, name) {
  try { await auth.deleteUser(uid); } catch { /* not there yet */ }
  await auth.createUser({ uid, email: `${uid}@loadtest.invalid`, password: PASSWORD, displayName: name });
}

async function seedCoach(n) {
  const coach = `coach-${n}`;
  await account(coach, `Coach ${n}`);
  // Batches committed one after another: the emulator times out under BulkWriter's
  // parallel writes once a coach has a few hundred thousand fields of history.
  let batch = db.batch(); let inBatch = 0;
  const w = {
    set: (ref, data) => { batch.set(ref, data); inBatch += 1; if (inBatch >= 400) pending.push(flush()); },
    close: async () => { await Promise.all(pending); if (inBatch) await flush(); },
  };
  const pending = [];
  let chain = Promise.resolve();
  function flush() {
    const b = batch; batch = db.batch(); inBatch = 0;
    chain = chain.then(() => b.commit());
    return chain;
  }
  w.set(db.doc(`users/${coach}`), {
    id: coach, name: `Coach ${n}`, email: `${coach}@loadtest.invalid`, role: 'trainer', avatar: null,
    joinDate: day(-400), inviteCode: `LT${String(n).padStart(4, '0')}`, timeZone: 'Europe/London', currency: 'GBP',
    renewalRate: 40, bankDetails: { accountName: 'Coach', sortCode: '00-00-00', accountNumber: '00000000' },
  });
  for (let c = 0; c < n; c++) {
    const id = `${coach}-client-${c}`;
    w.set(db.doc(`users/${id}`), {
      id, name: `Client ${c}`, email: `${id}@loadtest.invalid`, role: 'client', avatar: null, trainerId: coach,
      joinDate: day(-WEEKS * 7), totalSessions: 120, sessionOffset: 100, intakeCompleted: true,
    });
    w.set(db.doc(`bodyStats/${id}`), { clientId: id });
    for (let wk = 0; wk < WEEKS; wk++) {
      w.set(db.doc(`bodyStats/${id}/entries/e${wk}`), {
        date: day(-wk * 7), weight: 80 - wk * 0.05, bodyFat: 20 - wk * 0.02, chest: 100, waist: 85, hips: 98, arms: 35, legs: 58,
      });
      for (let s = 0; s < 3; s++) {
        const logId = `log-${id}-${wk}-${s}`;
        w.set(db.doc(`workoutLogs/${logId}`), {
          id: logId, clientId: id, trainerId: coach, createdBy: id, planId: `plan-${id}-${s}`, date: day(-wk * 7 - s * 2),
          entries: EXERCISES.slice(s, s + 5).map((exerciseId, k) => ({
            exerciseId, unit: 'weight_reps',
            sets: [0, 1, 2].map(j => ({ weight: 40 + k * 10 + (WEEKS - wk) * 0.5, reps: 8 + j, completed: true })),
          })),
          notes: '', rpe: 7,
        });
      }
      for (let s = 0; s < 2; s++) {
        const sid = `sched-${id}-${wk}-${s}`;
        w.set(db.doc(`schedule/${sid}`), {
          id: sid, trainerId: coach, clientId: id, date: day(-wk * 7 - s * 3), time: '10:00', type: 'Training Session',
          status: 'completed', notes: '', deductedAtBooking: true, duration: 60,
        });
      }
    }
    for (let u = 1; u <= 4; u++) {
      const sid = `sched-${id}-next-${u}`;
      w.set(db.doc(`schedule/${sid}`), {
        id: sid, trainerId: coach, clientId: id, date: day(u * 3), time: '10:00', type: 'Training Session',
        status: 'confirmed', notes: '', deductedAtBooking: true, duration: 60,
      });
    }
    for (let p = 0; p < 4; p++) {
      const pid = `plan-${id}-${p}`;
      w.set(db.doc(`workoutPlans/${pid}`), {
        id: pid, name: `Day ${p + 1}`, trainerId: coach, clientId: id, day: `Day ${p + 1}`,
        exercises: EXERCISES.slice(p, p + 6).map(exerciseId => ({ exerciseId, sets: 3, reps: '8-12', rest: 90, notes: '' })),
      });
    }
    for (let m = 0; m < 10; m++) {
      const mid = `msg-${id}-${m}`;
      const fromCoach = m % 2 === 0;
      w.set(db.doc(`messages/${mid}`), {
        id: mid, from: fromCoach ? coach : id, to: fromCoach ? id : coach, text: 'See you Tuesday',
        timestamp: new Date(TODAY.getTime() - m * 86400000).toISOString(), read: true,
      });
    }
  }
  await w.close();
  if (process.argv.includes('--summaries')) {
    const { ensureClientSummaries } = require(path.join(__dirname, '../../functions/clientSummary'));
    await ensureClientSummaries({ db, trainerId: coach });
  }
  return coach;
}

(async () => {
  const sizes = process.argv.slice(2).map(Number).filter(Boolean);
  for (const n of sizes) {
    const t = Date.now();
    await seedCoach(n);
    console.log(`coach-${n}: ${n} clients seeded in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
