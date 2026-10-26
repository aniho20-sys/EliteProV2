const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, getDoc, getDocs, collection, addDoc } = require('firebase/firestore');

// B79 (Grok #27, Ani 2026-10-26): a client decides whether their coach sees their health
// information — body stats and the training profile, injuries included. "No" keeps them
// connected but hides it; not answered yet reads as shared (Ani's choice for the clients
// who were connected before the question existed).
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-health-sharing';
const COACH = 'coachA';
const STUDENT = 'studentA';
const MANAGED = 'managed-1759200000000-ab12';

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => { await env.cleanup(); });

async function seed(studentFields = {}) {
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'users', COACH), { id: COACH, role: 'trainer' });
    await setDoc(doc(db, 'users', STUDENT), { id: STUDENT, role: 'client', trainerId: COACH, ...studentFields });
    await setDoc(doc(db, 'users', MANAGED), { id: MANAGED, name: 'Sam', role: 'client', trainerId: COACH, managed: true, joinDate: '2026-09-30' });
    for (const id of [STUDENT, MANAGED]) {
      await setDoc(doc(db, 'bodyStats', id), { clientId: id });
      await setDoc(doc(db, 'bodyStats', id, 'entries', 'e1'), { date: '2026-10-01', weight: 70 });
      await setDoc(doc(db, 'intakeForms', id), { clientId: id, injuries: 'Left knee' });
    }
  });
}

beforeEach(async () => { await env.clearFirestore(); });

const as = (uid) => env.authenticatedContext(uid).firestore();
// Each read started only when asserted, so a refusal is never left unhandled.
const coachReads = (id = STUDENT) => [
  () => getDoc(doc(as(COACH), 'bodyStats', id)),
  () => getDocs(collection(as(COACH), 'bodyStats', id, 'entries')),
  () => getDoc(doc(as(COACH), 'intakeForms', id)),
];

describe('what the coach sees', () => {
  test('not answered yet: shared', async () => {
    await seed();
    for (const r of coachReads()) await assertSucceeds(r());
  });

  test('"yes": shared', async () => {
    await seed({ healthSharing: 'yes' });
    for (const r of coachReads()) await assertSucceeds(r());
  });

  test('"no": body stats and the training profile are hidden, and the coach cannot add to them', async () => {
    await seed({ healthSharing: 'no' });
    for (const r of coachReads()) await assertFails(r());
    await assertFails(addDoc(collection(as(COACH), 'bodyStats', STUDENT, 'entries'), { date: '2026-10-02', weight: 71 }));
    await assertFails(updateDoc(doc(as(COACH), 'bodyStats', STUDENT, 'entries', 'e1'), { weight: 72 }));
  });

  test('"no": the client still sees their own', async () => {
    await seed({ healthSharing: 'no' });
    await assertSucceeds(getDocs(collection(as(STUDENT), 'bodyStats', STUDENT, 'entries')));
    await assertSucceeds(getDoc(doc(as(STUDENT), 'intakeForms', STUDENT)));
  });

  test('a client without the app: the coach keeps what they entered', async () => {
    await seed();
    for (const r of coachReads(MANAGED)) await assertSucceeds(r());
  });
});

describe('who answers', () => {
  test('the client sets it, with when', async () => {
    await seed();
    await assertSucceeds(updateDoc(doc(as(STUDENT), 'users', STUDENT), { healthSharing: 'no', healthSharingAt: '2026-10-26T12:00:00.000Z' }));
    await assertSucceeds(updateDoc(doc(as(STUDENT), 'users', STUDENT), { healthSharing: 'yes', healthSharingAt: '2026-10-27T12:00:00.000Z' }));
  });

  test('not agreeing leaves the coach in the same write (Ani 2026-10-26)', async () => {
    await seed();
    await assertSucceeds(updateDoc(doc(as(STUDENT), 'users', STUDENT), { trainerId: null, healthSharing: 'no', healthSharingAt: '2026-10-26T12:00:00.000Z' }));
  });

  test('only "yes" or "no"', async () => {
    await seed();
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT), { healthSharing: true }));
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT), { healthSharing: 'maybe' }));
  });

  test('the coach cannot answer for the client', async () => {
    await seed({ healthSharing: 'no' });
    await assertFails(updateDoc(doc(as(COACH), 'users', STUDENT), { healthSharing: 'yes' }));
  });
});
