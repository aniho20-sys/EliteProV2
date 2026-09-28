const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, deleteDoc } = require('firebase/firestore');

// Error reports (functions/clientErrors.js) carry stack traces and user ids: the owner
// reads them, the reportClientError function writes them, nobody else does either.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-client-errors';
const OWNER = { email: 'aniho20@gmail.com', email_verified: true };

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => { await testEnv.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'clientErrors', 'e1'), { message: 'boom', count: 1 });
    await setDoc(doc(context.firestore(), 'clientErrorBudget', '2026-09-28'), { reports: 1 });
  });
});

const db = (uid, token) => (uid ? testEnv.authenticatedContext(uid, token) : testEnv.unauthenticatedContext()).firestore();

test('the owner can read error reports', async () => {
  await assertSucceeds(getDoc(doc(db('owner', OWNER), 'clientErrors', 'e1')));
});

test('nobody else can — including the owner address unverified, and signed out', async () => {
  await assertFails(getDoc(doc(db('trainer', { email: 'coach@example.test', email_verified: true }), 'clientErrors', 'e1')));
  await assertFails(getDoc(doc(db('impostor', { email: OWNER.email, email_verified: false }), 'clientErrors', 'e1')));
  await assertFails(getDoc(doc(db(null), 'clientErrors', 'e1')));
});

test('no one writes from the app, not even the owner — only the function does', async () => {
  await assertFails(setDoc(doc(db('owner', OWNER), 'clientErrors', 'e2'), { message: 'fake' }));
  await assertFails(setDoc(doc(db('someone', { email: 'x@example.test' }), 'clientErrors', 'e1'), { count: 0 }));
  await assertFails(deleteDoc(doc(db('owner', OWNER), 'clientErrors', 'e1')));
});

test('the daily budget is server-only', async () => {
  await assertFails(getDoc(doc(db('owner', OWNER), 'clientErrorBudget', '2026-09-28')));
  await assertFails(setDoc(doc(db('someone', { email: 'x@example.test' }), 'clientErrorBudget', '2026-09-28'), { reports: 0 }));
});
