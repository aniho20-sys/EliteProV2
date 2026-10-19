const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

// B49 Stripe. What the browser may NOT do, whoever is signed in:
//   - read or write processed webhook events (stripeEvents — server-only, like gcEvents);
//   - write their own Stripe connection (paymentConnections.stripe — only Stripe's answer,
//     via the server, may say a coach can take payments);
//   - set users.stripeEnvironment, which tells the coach's clients whether plans are real.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-stripe';
const COACH = 'coachA';
const STUDENT = 'studentA';

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
    await setDoc(doc(db, 'users', COACH), { id: COACH, role: 'trainer', name: 'Coach' });
    await setDoc(doc(db, 'users', STUDENT), { id: STUDENT, role: 'client', trainerId: COACH, name: 'Student' });
    await setDoc(doc(db, 'paymentConnections', COACH), { trainerId: COACH, stripe: { accountId: 'acct_A', status: 'onboarding' } });
    await setDoc(doc(db, 'stripeEvents', 'evt_1'), { outcome: 'granted' });
    await setDoc(doc(db, 'gcEvents', 'EV1'), { outcome: 'granted' });
    await setDoc(doc(db, 'sessionReminders', 's1_soon'), { kind: 'soon' });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();

describe('processed webhook events are server-only', () => {
  test.each([COACH, STUDENT])('%s can neither read nor write stripeEvents / gcEvents', async (uid) => {
    await assertFails(getDoc(doc(as(uid), 'stripeEvents', 'evt_1')));
    await assertFails(setDoc(doc(as(uid), 'stripeEvents', 'evt_2'), { outcome: 'x' }));
    await assertFails(getDoc(doc(as(uid), 'gcEvents', 'EV1')));
    await assertFails(setDoc(doc(as(uid), 'gcEvents', 'EV2'), { outcome: 'x' }));
    // B51: reminder markers — a client writing one would silence their own reminders.
    await assertFails(getDoc(doc(as(uid), 'sessionReminders', 's1_soon')));
    await assertFails(setDoc(doc(as(uid), 'sessionReminders', 's2_soon'), { kind: 'soon' }));
  });
});

describe('a coach’s Stripe connection', () => {
  test('the coach reads their own; their client does not', async () => {
    await assertSucceeds(getDoc(doc(as(COACH), 'paymentConnections', COACH)));
    await assertFails(getDoc(doc(as(STUDENT), 'paymentConnections', COACH)));
  });
  test('the coach cannot mark themselves connected', async () => {
    await assertFails(updateDoc(doc(as(COACH), 'paymentConnections', COACH), { 'stripe.status': 'connected' }));
  });
  test('the coach cannot set stripeEnvironment on their own profile', async () => {
    await assertFails(updateDoc(doc(as(COACH), 'users', COACH), { stripeEnvironment: 'live' }));
    // …while an ordinary profile edit still works, so the refusal above is about the field.
    await assertSucceeds(updateDoc(doc(as(COACH), 'users', COACH), { name: 'Coach A' }));
  });
});
