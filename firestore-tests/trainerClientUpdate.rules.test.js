const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');

// What a coach may change on their own client's profile, and a trainer on their own.
//
// Production audit 2026-09-28, High-value 3: a coach could change any field of a client's
// profile — email, name, anything — short of role and coach. The allowlist below is every
// field the app itself writes to a client as the coach (ClientDetailPage, TrainerDashboard,
// addCreditLedgerEntry, WorkoutLogPage badges, removeClient). A new field the app starts
// writing must be added to the rule too, or that write fails — which this file catches.
//
// Also: workingHours (Profile → working hours) and badges were never in the self-update
// allowlist, so both writes were being refused. Found writing this suite.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-trainer-client-update';
const COACH = 'coachA';
const CLIENT = 'client1';

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
    await setDoc(doc(db, 'users', COACH), { id: COACH, role: 'trainer', name: 'Ani' });
    await setDoc(doc(db, 'users', CLIENT), {
      id: CLIENT, role: 'client', trainerId: COACH, name: 'Sam', email: 'sam@example.test', totalSessions: 10, sessionOffset: 2,
    });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const coachWrites = (data) => updateDoc(doc(as(COACH), 'users', CLIENT), data);

describe('a coach updating their client — everything the app does', () => {
  test.each([
    ['session balance (ClientDetailPage)', { totalSessions: 12, sessionOffset: 3 }],
    ['top-up (addCreditLedgerEntry)', { totalSessions: 20, renewalPrompt3Shown: false, renewalPrompt1Shown: false, renewalPromptSnoozedUntil: null }],
    ['renewal reminder snooze (TrainerDashboard)', { renewalSnoozedUntil: '2026-10-06' }],
    ['churn snooze (TrainerDashboard)', { churnSnoozedUntil: '2026-10-06' }],
    ['tags (ClientDetailPage)', { tags: ['vip'] }],
    ['monthly-plan tester (ClientDetailPage)', { subscriptionTester: true }],
    ['badges, when the coach logs the session (WorkoutLogPage)', { badges: ['first_session'] }],
    ['removing the client (removeClient)', { trainerId: null }],
  ])('%s', async (_label, data) => {
    await assertSucceeds(coachWrites(data));
  });
});

describe('a coach updating their client — what it may not', () => {
  test.each([
    ['email', { email: 'coach-controlled@example.test' }],
    ['name', { name: 'Someone else' }],
    ['language', { language: 'zh-HK' }],
    ['intake status', { intakeCompleted: false }],
    ['an invented field', { isAdmin: true }],
  ])('%s', async (_label, data) => {
    await assertFails(coachWrites(data));
  });

  test('an allowed field does not carry a forbidden one with it', async () => {
    await assertFails(coachWrites({ totalSessions: 12, email: 'x@example.test' }));
  });

  test('still cannot hand the client to another coach', async () => {
    await assertFails(coachWrites({ trainerId: 'coachB' }));
  });
});

describe('a trainer updating their own profile', () => {
  test('working hours can be saved (Profile → Working hours)', async () => {
    await assertSucceeds(updateDoc(doc(as(COACH), 'users', COACH), { workingHours: { start: '07:00', end: '20:00' } }));
  });

  test('working hours must be two times', async () => {
    await assertFails(updateDoc(doc(as(COACH), 'users', COACH), { workingHours: 'always' }));
    await assertFails(updateDoc(doc(as(COACH), 'users', COACH), { workingHours: { start: '07:00' } }));
  });
});

describe('a client updating their own profile', () => {
  test('badges from their own workout log can be saved', async () => {
    await assertSucceeds(updateDoc(doc(as(CLIENT), 'users', CLIENT), { badges: ['first_session'] }));
  });
});
