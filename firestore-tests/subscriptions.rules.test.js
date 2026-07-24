const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

// Distinct from exerciseOverrides.rules.test.js's PROJECT_ID — Jest runs test
// files in parallel workers by default, and sharing one project ID meant one
// file's clearFirestore() in beforeEach could race the other file's in-flight
// test against the same emulator-hosted project, causing flaky failures.
const PROJECT_ID = 'elitepro-rules-test-subscriptions';
const TRAINER_A = 'trainerA';
const TRAINER_B = 'trainerB';
const STUDENT_OF_A = 'studentA';
const STUDENT_OF_B = 'studentB';
const SUB_A_ID = 'sub-studentA';

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
    await setDoc(doc(db, 'users', TRAINER_B), { id: TRAINER_B, role: 'trainer', name: 'Trainer B' });
    await setDoc(doc(db, 'users', STUDENT_OF_A), { id: STUDENT_OF_A, role: 'client', trainerId: TRAINER_A, name: 'Student of A' });
    await setDoc(doc(db, 'users', STUDENT_OF_B), { id: STUDENT_OF_B, role: 'client', trainerId: TRAINER_B, name: 'Student of B' });
    await setDoc(doc(db, 'subscriptions', SUB_A_ID), {
      id: SUB_A_ID, clientId: STUDENT_OF_A, trainerId: TRAINER_A,
      tier: 8, ratePerSession: 65, monthlyAmount: 563.33, status: 'active',
      startDate: '2026-07-20', gcMandateId: 'MD001', gcSubscriptionId: 'SB001',
      currentPeriodStart: '2026-07-20', currentPeriodEnd: '2026-08-19',
      rolloverBanked: 0, pausedAt: null, pauseResumeDate: null, pauseHistory: [],
      cancelRequestedAt: null, cancelEffectiveDate: null,
      paymentFailedAt: null, lastPaymentStatus: null,
    });
    await setDoc(doc(db, 'gcConnections', TRAINER_A), {
      trainerId: TRAINER_A, gcOrganisationId: 'OR001', environment: 'sandbox', status: 'connected',
    });
  });
});

function dbAs(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

describe('subscriptions — trainer and their own client can read', () => {
  test('trainer A can read their client\'s subscription', async () => {
    const db = dbAs(TRAINER_A);
    await assertSucceeds(getDoc(doc(db, 'subscriptions', SUB_A_ID)));
  });

  test('student of A can read their own subscription', async () => {
    const db = dbAs(STUDENT_OF_A);
    await assertSucceeds(getDoc(doc(db, 'subscriptions', SUB_A_ID)));
  });
});

describe('subscriptions — a second trainer/client is fully locked out of reads', () => {
  test('trainer B cannot read trainer A\'s client subscription', async () => {
    const db = dbAs(TRAINER_B);
    await assertFails(getDoc(doc(db, 'subscriptions', SUB_A_ID)));
  });

  test('student of B cannot read trainer A\'s client subscription', async () => {
    const db = dbAs(STUDENT_OF_B);
    await assertFails(getDoc(doc(db, 'subscriptions', SUB_A_ID)));
  });
});

describe('subscriptions — no client-side writes at all, not even by the owner', () => {
  test('trainer A cannot create a subscription for their own client', async () => {
    const db = dbAs(TRAINER_A);
    await assertFails(setDoc(doc(db, 'subscriptions', 'sub-new'), {
      id: 'sub-new', clientId: STUDENT_OF_A, trainerId: TRAINER_A,
      tier: 4, ratePerSession: 65, monthlyAmount: 281.67, status: 'active',
    }));
  });

  test('trainer A cannot update their client\'s subscription (e.g. to grant sessions)', async () => {
    const db = dbAs(TRAINER_A);
    await assertFails(updateDoc(doc(db, 'subscriptions', SUB_A_ID), { rolloverBanked: 999 }));
  });

  test('student of A cannot update their own subscription (e.g. to fake-cancel)', async () => {
    const db = dbAs(STUDENT_OF_A);
    await assertFails(updateDoc(doc(db, 'subscriptions', SUB_A_ID), { status: 'cancelled' }));
  });

  test('trainer A cannot delete their client\'s subscription', async () => {
    const db = dbAs(TRAINER_A);
    await assertFails(deleteDoc(doc(db, 'subscriptions', SUB_A_ID)));
  });
});

describe('gcConnections — only the owning trainer can read, never their clients', () => {
  test('trainer A can read their own GC connection', async () => {
    const db = dbAs(TRAINER_A);
    await assertSucceeds(getDoc(doc(db, 'gcConnections', TRAINER_A)));
  });

  test('trainer B cannot read trainer A\'s GC connection', async () => {
    const db = dbAs(TRAINER_B);
    await assertFails(getDoc(doc(db, 'gcConnections', TRAINER_A)));
  });

  test('student of A cannot read trainer A\'s GC connection', async () => {
    const db = dbAs(STUDENT_OF_A);
    await assertFails(getDoc(doc(db, 'gcConnections', TRAINER_A)));
  });
});

describe('gcConnections — no client-side writes, not even by the owning trainer', () => {
  test('trainer A cannot create their own GC connection doc directly', async () => {
    const db = dbAs(TRAINER_A);
    await assertFails(setDoc(doc(db, 'gcConnections', TRAINER_B), {
      trainerId: TRAINER_B, gcOrganisationId: 'OR-fake', environment: 'sandbox', status: 'connected',
    }));
  });

  test('trainer A cannot update their own GC connection doc directly', async () => {
    const db = dbAs(TRAINER_A);
    await assertFails(updateDoc(doc(db, 'gcConnections', TRAINER_A), { status: 'disconnected' }));
  });
});
