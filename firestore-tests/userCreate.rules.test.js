const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');

// Who may create a users/{uid} document, and with what in it.
//
// P1 (reports/production-audit-2026-09-28.md): self-create accepted any document, so a new
// account could make itself an 'operator' or start with 1000 free sessions — reproduced on
// the emulator. The two "real signup" tests below use exactly the shape completeProfile()
// in src/context/AppContext.jsx writes; if that function gains a field, the rule's
// allowlist must gain it too, or every signup fails (the 2026-07-29 intake bug, again).
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-user-create';
const COACH = 'coachA';
const NEW = 'newUser';

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
    await setDoc(doc(c.firestore(), 'users', COACH), { id: COACH, role: 'trainer', inviteCode: 'AAAAAA' });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const common = { id: NEW, name: 'New Person', email: 'new@example.test', avatar: null, joinDate: '2026-09-28' };
const clientSignup = { ...common, role: 'client', trainerId: COACH, goals: '', age: '', height: '' };
const trainerSignup = { ...common, role: 'trainer', speciality: '', inviteCode: 'NEWCDE' };
const create = (data, uid = NEW) => setDoc(doc(as(uid), 'users', NEW), data);

describe('real signups still work', () => {
  test('client signup, as completeProfile writes it', async () => {
    await assertSucceeds(create(clientSignup));
  });

  test('client signup with no coach yet', async () => {
    await assertSucceeds(create({ ...clientSignup, trainerId: null }));
  });

  test('trainer signup, as completeProfile writes it', async () => {
    await assertSucceeds(create(trainerSignup));
  });
});

describe('P1: self-create cannot grant itself anything', () => {
  test('no operator role, or any role but trainer/client', async () => {
    await assertFails(create({ ...clientSignup, role: 'operator' }));
    await assertFails(create({ ...clientSignup, role: 'admin' }));
  });

  test('no starting credit', async () => {
    await assertFails(create({ ...clientSignup, totalSessions: 1000 }));
    await assertFails(create({ ...clientSignup, sessionOffset: -50 }));
  });

  test('no sandbox tester flag', async () => {
    await assertFails(create({ ...clientSignup, subscriptionTester: true }));
  });

  test('id must be the signed-in uid', async () => {
    await assertFails(create({ ...clientSignup, id: 'someoneElse' }));
  });

  test("cannot create someone else's profile", async () => {
    await assertFails(create(clientSignup, 'intruder'));
  });
});

describe('trainer creating a managed client is unchanged', () => {
  test('a trainer may create a client of their own, with credit', async () => {
    await assertSucceeds(setDoc(doc(as(COACH), 'users', 'ghost1'), {
      id: 'ghost1', role: 'client', trainerId: COACH, name: 'Ghost', totalSessions: 10,
    }));
  });

  test("a trainer may not create a client for another trainer", async () => {
    await assertFails(setDoc(doc(as(COACH), 'users', 'ghost2'), {
      id: 'ghost2', role: 'client', trainerId: 'coachB', name: 'Ghost',
    }));
  });
});
