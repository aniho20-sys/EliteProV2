const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, deleteDoc, getDoc } = require('firebase/firestore');

// B35 (2026-09-30): a coach can add a client who does not use the app. What the rules
// must allow is exactly the shape AppContext.addManagedClient writes — and nothing that
// the old, unused "trainer creates a client" branch allowed: any id, any fields.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-managed-client';
const COACH = 'coachA';
const OTHER_COACH = 'coachB';
const STUDENT = 'studentA';
const ID = 'managed-1759200000000-ab12';

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'users', COACH), { id: COACH, role: 'trainer' });
    await setDoc(doc(db, 'users', OTHER_COACH), { id: OTHER_COACH, role: 'trainer' });
    await setDoc(doc(db, 'users', STUDENT), { id: STUDENT, role: 'client', trainerId: null });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
// Exactly what addManagedClient writes.
const record = (over = {}) => ({ id: ID, name: 'Sam Taylor', role: 'client', trainerId: COACH, managed: true, joinDate: '2026-09-30', ...over });
const create = (uid, data = record(), id = ID) => setDoc(doc(as(uid), 'users', id), data);

async function seedManaged() {
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), 'users', ID), record()); });
}

describe('adding a client without the app', () => {
  test('a coach adds one, as addManagedClient writes it', async () => {
    await assertSucceeds(create(COACH));
  });

  test('…and reads it back through the same query the app listens with', async () => {
    await create(COACH);
    await assertSucceeds(getDoc(doc(as(COACH), 'users', ID)));
  });

  test('a student cannot add one', async () => {
    await assertFails(create(STUDENT, record({ trainerId: STUDENT })));
  });

  test('a coach cannot add one for another coach', async () => {
    await assertFails(create(COACH, record({ trainerId: OTHER_COACH })));
  });

  test('no id but a managed- one — never a real account uid', async () => {
    await assertFails(create(COACH, record({ id: 'someFutureUid' }), 'someFutureUid'));
    await assertFails(create(COACH, record({ id: 'managed-x' }), 'managed-x'));
  });

  test('no starting credit, email, tester flag or anything else', async () => {
    for (const extra of [{ totalSessions: 50 }, { email: 'sam@example.test' }, { subscriptionTester: true }, { inviteCode: 'AAAAAA' }]) {
      await assertFails(create(COACH, record(extra)));
    }
  });

  test('must be marked managed, be a client, and have a sensible name', async () => {
    await assertFails(create(COACH, record({ managed: false })));
    await assertFails(create(COACH, record({ role: 'trainer' })));
    await assertFails(create(COACH, record({ name: '' })));
    await assertFails(create(COACH, record({ name: 'x'.repeat(81) })));
  });
});

describe('once added', () => {
  beforeEach(seedManaged);

  test('the coach tops them up like any client', async () => {
    await assertSucceeds(updateDoc(doc(as(COACH), 'users', ID), { totalSessions: 10 }));
  });

  test('the coach cannot detach them — that would leave a record nobody can reach', async () => {
    await assertFails(updateDoc(doc(as(COACH), 'users', ID), { trainerId: null }));
  });

  test('the coach cannot delete them directly (removeManagedClient does, server-side)', async () => {
    await assertFails(deleteDoc(doc(as(COACH), 'users', ID)));
  });

  test('another coach can neither read nor change them', async () => {
    await assertFails(getDoc(doc(as(OTHER_COACH), 'users', ID)));
    await assertFails(updateDoc(doc(as(OTHER_COACH), 'users', ID), { totalSessions: 99 }));
  });
});
