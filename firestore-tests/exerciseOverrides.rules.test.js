const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'elitepro-rules-test';
const TRAINER_A = 'trainerA';
const TRAINER_B = 'trainerB';
const STUDENT_OF_A = 'studentA';
const STUDENT_OF_B = 'studentB';
const OVERRIDE_A_ID = `${TRAINER_A}_bench-press`;

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
    await setDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID), {
      id: OVERRIDE_A_ID, trainerId: TRAINER_A, exerciseId: 'bench-press',
      videoMode: 'custom', videoUrl: 'https://youtube.com/watch?v=abc', instructionsMode: 'default', instructions: '',
    });
  });
});

function dbAs(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

describe('exerciseOverrides — trainer owns their own overrides', () => {
  test('trainer A can create a new override for their own trainerId', async () => {
    const db = dbAs(TRAINER_A);
    await assertSucceeds(setDoc(doc(db, 'exerciseOverrides', `${TRAINER_A}_squat`), {
      id: `${TRAINER_A}_squat`, trainerId: TRAINER_A, exerciseId: 'squat',
      videoMode: 'hidden', videoUrl: '', instructionsMode: 'default', instructions: '',
    }));
  });

  test('trainer A can read their own override', async () => {
    const db = dbAs(TRAINER_A);
    await assertSucceeds(getDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID)));
  });

  test('trainer A can update their own override', async () => {
    const db = dbAs(TRAINER_A);
    await assertSucceeds(setDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID), {
      id: OVERRIDE_A_ID, trainerId: TRAINER_A, exerciseId: 'bench-press',
      videoMode: 'hidden', videoUrl: '', instructionsMode: 'default', instructions: '',
    }, { merge: true }));
  });

  test('trainer A can delete their own override', async () => {
    const db = dbAs(TRAINER_A);
    await assertSucceeds(deleteDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID)));
  });
});

describe('exerciseOverrides — a second trainer is fully locked out', () => {
  test('trainer B cannot read trainer A\'s override', async () => {
    const db = dbAs(TRAINER_B);
    await assertFails(getDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID)));
  });

  test('trainer B cannot update trainer A\'s override', async () => {
    const db = dbAs(TRAINER_B);
    await assertFails(setDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID), {
      id: OVERRIDE_A_ID, trainerId: TRAINER_A, exerciseId: 'bench-press',
      videoMode: 'hidden', videoUrl: '', instructionsMode: 'default', instructions: '',
    }, { merge: true }));
  });

  test('trainer B cannot delete trainer A\'s override', async () => {
    const db = dbAs(TRAINER_B);
    await assertFails(deleteDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID)));
  });

  test('trainer B cannot create an override claiming trainer A\'s trainerId', async () => {
    const db = dbAs(TRAINER_B);
    await assertFails(setDoc(doc(db, 'exerciseOverrides', `${TRAINER_A}_deadlift`), {
      id: `${TRAINER_A}_deadlift`, trainerId: TRAINER_A, exerciseId: 'deadlift',
      videoMode: 'custom', videoUrl: 'https://evil.example', instructionsMode: 'default', instructions: '',
    }));
  });
});

describe('exerciseOverrides — students can read their own trainer\'s overrides only, never write', () => {
  test('student of trainer A can read trainer A\'s override', async () => {
    const db = dbAs(STUDENT_OF_A);
    await assertSucceeds(getDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID)));
  });

  test('student of trainer B cannot read trainer A\'s override', async () => {
    const db = dbAs(STUDENT_OF_B);
    await assertFails(getDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID)));
  });

  test('student cannot create an override', async () => {
    const db = dbAs(STUDENT_OF_A);
    await assertFails(setDoc(doc(db, 'exerciseOverrides', `${STUDENT_OF_A}_hack`), {
      id: `${STUDENT_OF_A}_hack`, trainerId: TRAINER_A, exerciseId: 'squat',
      videoMode: 'custom', videoUrl: 'https://evil.example', instructionsMode: 'default', instructions: '',
    }));
  });

  test('student cannot update their trainer\'s override', async () => {
    const db = dbAs(STUDENT_OF_A);
    await assertFails(setDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID), {
      id: OVERRIDE_A_ID, trainerId: TRAINER_A, exerciseId: 'bench-press',
      videoMode: 'hidden', videoUrl: '', instructionsMode: 'default', instructions: '',
    }, { merge: true }));
  });

  test('student cannot delete their trainer\'s override', async () => {
    const db = dbAs(STUDENT_OF_A);
    await assertFails(deleteDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID)));
  });
});

describe('exerciseOverrides — trainerId/exerciseId immutability', () => {
  test('trainer A cannot hijack the override to a different trainerId', async () => {
    const db = dbAs(TRAINER_A);
    await assertFails(setDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID), {
      id: OVERRIDE_A_ID, trainerId: TRAINER_B, exerciseId: 'bench-press',
      videoMode: 'hidden', videoUrl: '', instructionsMode: 'default', instructions: '',
    }, { merge: true }));
  });

  test('trainer A cannot repoint the override to a different exerciseId', async () => {
    const db = dbAs(TRAINER_A);
    await assertFails(setDoc(doc(db, 'exerciseOverrides', OVERRIDE_A_ID), {
      id: OVERRIDE_A_ID, trainerId: TRAINER_A, exerciseId: 'squat',
      videoMode: 'hidden', videoUrl: '', instructionsMode: 'default', instructions: '',
    }, { merge: true }));
  });
});
