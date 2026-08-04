const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, getDocs, collection, query, where } = require('firebase/firestore');

// End-to-end coverage for the invite-code connect flow — the FIRST thing a new
// student does. Broken on 2026-08-04: connectToTrainer() resolved the code against
// AppContext's in-memory `users` array, which for an unconnected client contains
// only their own doc. The trainer was never in memory, so the lookup could not
// succeed and every valid code came back "Invalid invite code".
//
// The fix resolves the code with a real Firestore query, so these tests pin the
// two things that query depends on: that rules permit an unconnected client to
// run it, and that the resulting trainerId write is accepted. If a future rules
// tightening locks `users` reads down to related-users-only, this suite fails
// instead of student onboarding silently dying in production again.
//
// Own PROJECT_ID per the note in subscriptions.rules.test.js (parallel Jest
// workers + shared project = clearFirestore() races).
const PROJECT_ID = 'elitepro-rules-test-invite-code';
const TRAINER = 'trainerInvite';
const OTHER_TRAINER = 'trainerOther';
const UNCONNECTED_CLIENT = 'clientUnconnected';
const CODE = '3XQPKM';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', TRAINER), {
      id: TRAINER, role: 'trainer', name: 'Coach Ani', inviteCode: CODE,
    });
    await setDoc(doc(db, 'users', OTHER_TRAINER), {
      id: OTHER_TRAINER, role: 'trainer', name: 'Other Coach', inviteCode: 'ZZZZZZ',
    });
    // trainerId: null — the exact state of a student who has not connected to anyone.
    await setDoc(doc(db, 'users', UNCONNECTED_CLIENT), {
      id: UNCONNECTED_CLIENT, role: 'client', name: 'New Student', trainerId: null,
    });
  });
});

// Mirrors AppContext.findTrainerByCodeRemote: single-field query (always auto-indexed
// by Firestore), role filtered in JS. A second equality filter would risk needing a
// composite index that doesn't exist in production.
const codeQuery = (db, code) => query(
  collection(db, 'users'),
  where('inviteCode', '==', code),
);
const trainersFrom = (snap) => snap.docs.filter(d => d.data().role === 'trainer');

describe('invite code lookup', () => {
  test('an unconnected client can query users by invite code', async () => {
    const db = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await assertSucceeds(getDocs(codeQuery(db, CODE)));
  });

  test('the lookup returns exactly the trainer owning that code', async () => {
    const db = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    const trainers = trainersFrom(await getDocs(codeQuery(db, CODE)));
    expect(trainers.length).toBe(1);
    expect(trainers[0].id).toBe(TRAINER);
    expect(trainers[0].data().name).toBe('Coach Ani');
  });

  test('an unknown code returns no match (genuine "invalid code", not a rules failure)', async () => {
    const db = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    const trainers = trainersFrom(await getDocs(codeQuery(db, 'NOPE99')));
    expect(trainers.length).toBe(0);
  });

  test('an unauthenticated visitor cannot look up invite codes', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(codeQuery(db, CODE)));
  });
});

describe('invite code connect flow (end to end)', () => {
  test('client connects with a valid code and appears in that trainer\'s client list', async () => {
    const clientDb = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();

    // 1. resolve the code
    const trainers = trainersFrom(await getDocs(codeQuery(clientDb, CODE)));
    expect(trainers.length).toBe(1);
    const trainerId = trainers[0].id;

    // 2. write trainerId onto own profile (self-update allowlist must include it)
    await assertSucceeds(updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), { trainerId }));

    // 3. the trainer's own client-list query now returns the student — this is the
    //    listener AppContext runs, so passing here means the coach really sees them.
    const trainerDb = testEnv.authenticatedContext(TRAINER).firestore();
    const clients = await getDocs(query(
      collection(trainerDb, 'users'),
      where('trainerId', '==', TRAINER),
    ));
    expect(clients.docs.map(d => d.id)).toContain(UNCONNECTED_CLIENT);
  });

  test('connecting does not put the student in a different trainer\'s client list', async () => {
    const clientDb = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), { trainerId: TRAINER });

    const otherDb = testEnv.authenticatedContext(OTHER_TRAINER).firestore();
    const clients = await getDocs(query(
      collection(otherDb, 'users'),
      where('trainerId', '==', OTHER_TRAINER),
    ));
    expect(clients.empty).toBe(true);
  });

  test('a client still cannot escalate to trainer while setting trainerId', async () => {
    const clientDb = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await assertFails(updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), {
      trainerId: TRAINER,
      role: 'trainer',
    }));
  });

  test('a client cannot grant themselves sessions while connecting', async () => {
    const clientDb = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await assertFails(updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), {
      trainerId: TRAINER,
      totalSessions: 100,
    }));
  });
});
