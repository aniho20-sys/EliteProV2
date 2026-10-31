const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');

// B82 (Ani 2026-10-29): each coach sets their own cancellation rule. Only the coach, only on
// their own profile, only the values the app offers — the server refunds by it.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-cancel-policy';
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
    await setDoc(doc(db, 'users', COACH), { id: COACH, role: 'trainer' });
    await setDoc(doc(db, 'users', STUDENT), { id: STUDENT, role: 'client', trainerId: COACH });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const set = (uid, target, cancelPolicy) => updateDoc(doc(as(uid), 'users', target), { cancelPolicy });

describe('a coach’s cancellation rule', () => {
  test('the coach sets their own: any offered notice, cap or no cap, a short note', async () => {
    await assertSucceeds(set(COACH, COACH, { noticeHours: 12, freePerMonth: 3, note: 'Text me if you are ill.' }));
    await assertSucceeds(set(COACH, COACH, { noticeHours: 48, freePerMonth: null, note: '' }));
    await assertSucceeds(set(COACH, COACH, { noticeHours: 6, freePerMonth: 0, note: '' }));
  });
  test('values the app does not offer are refused', async () => {
    await assertFails(set(COACH, COACH, { noticeHours: 0, freePerMonth: 2, note: '' }));
    await assertFails(set(COACH, COACH, { noticeHours: 24, freePerMonth: 99, note: '' }));
    await assertFails(set(COACH, COACH, { noticeHours: 24, freePerMonth: 2, note: 'x'.repeat(301) }));
    await assertFails(set(COACH, COACH, { noticeHours: 24, freePerMonth: 2, note: '', refundAll: true }));
  });
  test('a client cannot set one — not on themselves, not on their coach', async () => {
    await assertFails(set(STUDENT, STUDENT, { noticeHours: 6, freePerMonth: null, note: '' }));
    await assertFails(set(STUDENT, COACH, { noticeHours: 6, freePerMonth: null, note: '' }));
  });
});

describe('how late a coach’s clients may book (B83)', () => {
  const setNotice = (uid, target, v) => updateDoc(doc(as(uid), 'users', target), { bookingNoticeHours: v });
  test('the coach sets any offered value', async () => {
    for (const v of [0, 2, 6, 12, 24, 48]) await assertSucceeds(setNotice(COACH, COACH, v));
  });
  test('other values, and anyone but the coach, are refused', async () => {
    await assertFails(setNotice(COACH, COACH, 1));
    await assertFails(setNotice(COACH, COACH, '12'));
    await assertFails(setNotice(STUDENT, STUDENT, 0));
    await assertFails(setNotice(STUDENT, COACH, 0));
  });
});
