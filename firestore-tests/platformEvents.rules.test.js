const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');

// Who may read platformEvents (signups, founding-member count — owner only).
//
// Until 2026-09-27 the rule checked the token's email alone. A token carries whatever address
// the account signed up with, proven or not, so the rule now also requires email_verified.
// The owner signs in with Google, whose Gmail tokens are always verified. Own PROJECT_ID per
// the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-platform-events';
const OWNER = 'aniho20@gmail.com';

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
    await setDoc(doc(context.firestore(), 'platformEvents', 'e1'), { type: 'trainer_signup' });
  });
});

const read = (uid, token) => getDoc(doc(testEnv.authenticatedContext(uid, token).firestore(), 'platformEvents', 'e1'));

test('the owner with a verified email can read', async () => {
  await assertSucceeds(read('owner', { email: OWNER, email_verified: true }));
});

test("the owner's address without verification cannot", async () => {
  await assertFails(read('impostor', { email: OWNER, email_verified: false }));
});

test('anyone else cannot, verified or not', async () => {
  await assertFails(read('someone', { email: 'someone@gmail.com', email_verified: true }));
});

test('nobody can write, not even the owner', async () => {
  const db = testEnv.authenticatedContext('owner', { email: OWNER, email_verified: true }).firestore();
  await assertFails(setDoc(doc(db, 'platformEvents', 'e2'), { type: 'forged' }));
});
