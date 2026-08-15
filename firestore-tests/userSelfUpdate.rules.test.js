const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');

// Regression test for the 2026-07-29 bug: intakeCompleted (and, it turned out,
// businessName/currency) were missing from the users/{userId} self-update
// field allowlist, so every new client got silently stuck on the intake form
// forever — saveIntakeForm()'s users doc write was rejected by rules on every
// attempt, submit or skip alike. Own PROJECT_ID per the note in
// subscriptions.rules.test.js (parallel Jest workers + shared project = races).
const PROJECT_ID = 'elitepro-rules-test-user-self-update';
const TRAINER_A = 'trainerA';
const CLIENT_A = 'clientA';

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
    await setDoc(doc(db, 'users', TRAINER_A), { id: TRAINER_A, role: 'trainer', name: 'Trainer A' });
    await setDoc(doc(db, 'users', CLIENT_A), { id: CLIENT_A, role: 'client', trainerId: TRAINER_A, name: 'Client A' });
  });
});

describe('users/{userId} self-update allowlist', () => {
  // 2026-08-15: the client-side renewal snooze. Same class of bug as intakeCompleted
  // above — a field missing from this allowlist fails silently at runtime, and the only
  // thing that catches it is a rules test against the emulator.
  test('client can snooze their own renewal prompt', async () => {
    const db = testEnv.authenticatedContext(CLIENT_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', CLIENT_A), { renewalPromptSnoozedUntil: '2026-08-18' }));
  });

  test('client cannot snooze somebody else\'s renewal prompt', async () => {
    const db = testEnv.authenticatedContext(CLIENT_A).firestore();
    await assertFails(updateDoc(doc(db, 'users', TRAINER_A), { renewalPromptSnoozedUntil: '2026-08-18' }));
  });

  test('the renewal snooze cannot smuggle in extra sessions', async () => {
    const db = testEnv.authenticatedContext(CLIENT_A).firestore();
    await assertFails(updateDoc(doc(db, 'users', CLIENT_A), {
      renewalPromptSnoozedUntil: '2026-08-18',
      totalSessions: 999,
    }));
  });

  test('client can set intakeCompleted on their own profile', async () => {
    const db = testEnv.authenticatedContext(CLIENT_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', CLIENT_A), { intakeCompleted: true }));
  });

  test('trainer can set businessName on their own profile', async () => {
    const db = testEnv.authenticatedContext(TRAINER_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', TRAINER_A), { businessName: 'Ani Ho Personal Training' }));
  });

  test('trainer can set currency on their own profile', async () => {
    const db = testEnv.authenticatedContext(TRAINER_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', TRAINER_A), { currency: 'HKD' }));
  });

  test('client still cannot self-grant totalSessions/sessionOffset', async () => {
    const db = testEnv.authenticatedContext(CLIENT_A).firestore();
    await assertFails(updateDoc(doc(db, 'users', CLIENT_A), { totalSessions: 999 }));
    await assertFails(updateDoc(doc(db, 'users', CLIENT_A), { sessionOffset: -999 }));
  });
});
