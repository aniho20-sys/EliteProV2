const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where } = require('firebase/firestore');

// End-to-end coverage for the invite-code connect flow — the FIRST thing a new
// student does. Broken on 2026-08-04: connectToTrainer() resolved the code against
// AppContext's in-memory `users` array, which for an unconnected client contains
// only their own doc. The trainer was never in memory, so the lookup could not
// succeed and every valid code came back "Invalid invite code".
//
// The fix resolved the code with a real Firestore query from the browser, and this
// suite pinned what that query depended on. Its header used to end: "If a future
// rules tightening locks `users` reads down to related-users-only, this suite fails
// instead of student onboarding silently dying in production again."
//
// That is exactly what happened on 2026-08-27. Closing `users` to related-users-only
// broke these tests loudly, which is the whole point of having written them — the
// lookup moved into the resolveInviteCode callable rather than the rule being quietly
// left open. The assertions below now pin the new shape: the client-side query is
// REFUSED, the code still resolves server-side, and the connect flow still completes.
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

// Mirrors the query inside the resolveInviteCode callable: single-field (always
// auto-indexed by Firestore), role filtered in JS. A second equality filter would risk
// needing a composite index that doesn't exist in production.
const codeQuery = (db, code) => query(
  collection(db, 'users'),
  where('inviteCode', '==', code),
);
const trainersFrom = (snap) => snap.docs.filter(d => d.data().role === 'trainer');

// Stands in for resolveInviteCode. That callable runs on the Admin SDK, which bypasses
// rules entirely, so a rules-disabled context is the accurate simulation of it here.
// (The callable's own behaviour is covered in functions/test/resolveInviteCode.test.js.)
const resolveServerSide = async (code) => {
  let result = null;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const trainers = trainersFrom(await getDocs(codeQuery(context.firestore(), code)));
    result = trainers.length ? { id: trainers[0].id, ...trainers[0].data() } : null;
  });
  return result;
};

describe('invite code lookup is no longer a client-side query', () => {
  // Until 2026-08-27 this query ran from the browser, which is why `users` had
  // `allow read: if isAuth()` — and that meant any signed-in account could list every
  // user on the platform and harvest every email address. The lookup moved into the
  // resolveInviteCode callable so this rule could close.
  test('an unconnected client can NOT query users by invite code', async () => {
    const db = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await assertFails(getDocs(codeQuery(db, CODE)));
  });

  test('an unauthenticated visitor cannot either', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(codeQuery(db, CODE)));
  });

  test('the code still resolves server-side, to exactly the trainer owning it', async () => {
    const trainer = await resolveServerSide(CODE);
    expect(trainer).not.toBeNull();
    expect(trainer.id).toBe(TRAINER);
    expect(trainer.name).toBe('Coach Ani');
  });

  test('an unknown code resolves to nothing (genuine "invalid code", not a failure)', async () => {
    expect(await resolveServerSide('NOPE99')).toBeNull();
  });
});

// Since 2026-09-28 (P2, reports/production-audit-2026-09-28.md) the connect step is the
// connectWithInviteCode callable: it checks the code and writes trainerId on the Admin
// SDK. A rules-disabled write is the accurate simulation of it here; the callable's own
// behaviour is covered in functions/test/inviteCodes.test.js.
const connectServerSide = (clientId, trainerId) => testEnv.withSecurityRulesDisabled(
  (context) => updateDoc(doc(context.firestore(), 'users', clientId), { trainerId }),
);

describe('invite code connect flow (end to end)', () => {

  test('a client connected server-side appears in that trainer\'s client list', async () => {
    const resolved = await resolveServerSide(CODE);
    expect(resolved).not.toBeNull();
    await connectServerSide(UNCONNECTED_CLIENT, resolved.id);

    // The trainer's own client-list query returns the student — this is the listener
    // AppContext runs, so passing here means the coach really sees them.
    const trainerDb = testEnv.authenticatedContext(TRAINER).firestore();
    const clients = await getDocs(query(
      collection(trainerDb, 'users'),
      where('trainerId', '==', TRAINER),
    ));
    expect(clients.docs.map(d => d.id)).toContain(UNCONNECTED_CLIENT);
  });

  test('connecting does not put the student in a different trainer\'s client list', async () => {
    await connectServerSide(UNCONNECTED_CLIENT, TRAINER);

    const otherDb = testEnv.authenticatedContext(OTHER_TRAINER).firestore();
    const clients = await getDocs(query(
      collection(otherDb, 'users'),
      where('trainerId', '==', OTHER_TRAINER),
    ));
    expect(clients.empty).toBe(true);
  });
});

describe('P2: nobody points trainerId at a coach from the browser', () => {
  test('a client cannot set their own trainerId — not even with the right code in hand', async () => {
    const clientDb = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await assertFails(updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), { trainerId: TRAINER }));
  });

  test('a removed client cannot reattach and read the coach\'s profile', async () => {
    const clientDb = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await assertFails(updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), { trainerId: TRAINER }));
    await assertFails(getDoc(doc(clientDb, 'users', TRAINER)));
  });

  test('a trainer cannot attach themselves to another coach', async () => {
    const db = testEnv.authenticatedContext(OTHER_TRAINER).firestore();
    await assertFails(updateDoc(doc(db, 'users', OTHER_TRAINER), { trainerId: TRAINER }));
  });

  test('a trainer cannot hand their client to another coach', async () => {
    await connectServerSide(UNCONNECTED_CLIENT, OTHER_TRAINER);
    const db = testEnv.authenticatedContext(OTHER_TRAINER).firestore();
    await assertFails(updateDoc(doc(db, 'users', UNCONNECTED_CLIENT), { trainerId: TRAINER }));
  });

  test('clearing trainerId still works: a client leaving, a trainer removing a client', async () => {
    await connectServerSide(UNCONNECTED_CLIENT, TRAINER);
    await assertSucceeds(updateDoc(
      doc(testEnv.authenticatedContext(TRAINER).firestore(), 'users', UNCONNECTED_CLIENT), { trainerId: null },
    ));
    await connectServerSide(UNCONNECTED_CLIENT, TRAINER);
    await assertSucceeds(updateDoc(
      doc(testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore(), 'users', UNCONNECTED_CLIENT), { trainerId: null },
    ));
  });

  test('a client still cannot escalate to trainer or grant themselves sessions', async () => {
    const clientDb = testEnv.authenticatedContext(UNCONNECTED_CLIENT).firestore();
    await assertFails(updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), { role: 'trainer' }));
    await assertFails(updateDoc(doc(clientDb, 'users', UNCONNECTED_CLIENT), { totalSessions: 100 }));
  });
});

describe('P3: a trainer cannot choose their own invite code', () => {
  test('copying another trainer\'s code is refused', async () => {
    const db = testEnv.authenticatedContext(OTHER_TRAINER).firestore();
    await assertFails(updateDoc(doc(db, 'users', OTHER_TRAINER), { inviteCode: CODE }));
  });

  test('the reservations are invisible to the browser', async () => {
    const db = testEnv.authenticatedContext(TRAINER).firestore();
    await assertFails(getDoc(doc(db, 'inviteCodes', CODE)));
    await assertFails(setDoc(doc(db, 'inviteCodes', 'MINE99'), { trainerId: TRAINER }));
  });
});
