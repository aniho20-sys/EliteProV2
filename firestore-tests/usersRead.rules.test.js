const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, getDocs, collection, query, where } = require('firebase/firestore');

// Who may read a user document.
//
// Until 2026-08-27 the rule was `allow read: if isAuth()`. Any signed-in account — every
// student on the platform, and anyone who could sign up, which is now anyone at all since
// the landing page went self-serve — could list the whole `users` collection and read every
// name, email address, session balance and set of bank details on it.
//
// It stayed open that long because the invite-code lookup depended on it (CLAUDE.md #34),
// and closing it without moving that lookup first would have killed student onboarding for
// the second time. So the order mattered: resolveInviteCode first, then this.
//
// The rule now allows exactly three relationships, and this suite is the proof that all
// three still work and nothing else does. Own PROJECT_ID per the note in
// subscriptions.rules.test.js (parallel Jest workers + shared project = clearFirestore races).
const PROJECT_ID = 'elitepro-rules-test-users-read';
const TRAINER = 'trainerA';
const OTHER_TRAINER = 'trainerB';
const MY_CLIENT = 'clientOfA';
const SIBLING_CLIENT = 'clientOfA2';
const OTHER_CLIENT = 'clientOfB';
const STRANGER = 'clientUnconnected';

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
      id: TRAINER, role: 'trainer', name: 'Coach A', email: 'a@coach.test', inviteCode: 'AAAAAA',
    });
    await setDoc(doc(db, 'users', OTHER_TRAINER), {
      id: OTHER_TRAINER, role: 'trainer', name: 'Coach B', email: 'b@coach.test', inviteCode: 'BBBBBB',
    });
    await setDoc(doc(db, 'users', MY_CLIENT), {
      id: MY_CLIENT, role: 'client', name: 'Student One', email: 'one@s.test', trainerId: TRAINER,
    });
    await setDoc(doc(db, 'users', SIBLING_CLIENT), {
      id: SIBLING_CLIENT, role: 'client', name: 'Student Two', email: 'two@s.test', trainerId: TRAINER,
    });
    await setDoc(doc(db, 'users', OTHER_CLIENT), {
      id: OTHER_CLIENT, role: 'client', name: 'Student Three', email: 'three@s.test', trainerId: OTHER_TRAINER,
    });
    await setDoc(doc(db, 'users', STRANGER), {
      id: STRANGER, role: 'client', name: 'Nobody', email: 'nobody@s.test', trainerId: null,
    });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

describe('the three relationships that ARE allowed', () => {
  test('anyone reads their own document', async () => {
    await assertSucceeds(getDoc(doc(as(STRANGER), 'users', STRANGER)));
  });

  test('a trainer reads their own client', async () => {
    await assertSucceeds(getDoc(doc(as(TRAINER), 'users', MY_CLIENT)));
  });

  test('a client reads their own coach', async () => {
    await assertSucceeds(getDoc(doc(as(MY_CLIENT), 'users', TRAINER)));
  });
});

describe('everything else is refused', () => {
  test('a client cannot read a coach they are not connected to', async () => {
    // The unconnected-student case: this is what the invite-code query used to rely on.
    await assertFails(getDoc(doc(as(STRANGER), 'users', TRAINER)));
  });

  test('a client cannot read another of their own coach\'s clients', async () => {
    // They share a coach and can see each other's schedule slots, but a user document
    // carries an email address and that is not part of sharing a gym.
    await assertFails(getDoc(doc(as(MY_CLIENT), 'users', SIBLING_CLIENT)));
  });

  test('a trainer cannot read another trainer\'s client', async () => {
    await assertFails(getDoc(doc(as(TRAINER), 'users', OTHER_CLIENT)));
  });

  test('a trainer cannot read another trainer', async () => {
    await assertFails(getDoc(doc(as(TRAINER), 'users', OTHER_TRAINER)));
  });

  test('an unauthenticated visitor reads nothing', async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'users', TRAINER)));
  });
});

describe('queries: the two AppContext listeners pass, an open sweep does not', () => {
  // Rules are not filters. A query is allowed only when its constraints guarantee every
  // document it could return satisfies the rule, so these assertions are really about the
  // query shapes AppContext uses — change a listener's filter and this suite notices.
  test('own-document listener (where id == uid)', async () => {
    await assertSucceeds(getDocs(query(
      collection(as(MY_CLIENT), 'users'), where('id', '==', MY_CLIENT),
    )));
  });

  test('own-clients listener (where trainerId == uid)', async () => {
    const snap = await getDocs(query(
      collection(as(TRAINER), 'users'), where('trainerId', '==', TRAINER),
    ));
    expect(snap.docs.map(d => d.id).sort()).toEqual([MY_CLIENT, SIBLING_CLIENT].sort());
  });

  test('listing the whole collection is refused', async () => {
    await assertFails(getDocs(collection(as(TRAINER), 'users')));
  });

  test('harvesting by role is refused', async () => {
    await assertFails(getDocs(query(
      collection(as(STRANGER), 'users'), where('role', '==', 'trainer'),
    )));
  });

  test('asking for someone else\'s client list is refused', async () => {
    await assertFails(getDocs(query(
      collection(as(TRAINER), 'users'), where('trainerId', '==', OTHER_TRAINER),
    )));
  });
});
