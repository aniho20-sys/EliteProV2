const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where } = require('firebase/firestore');

// B38 public booking page. A stranger's trial request holds their name and phone number:
// only the coach it was sent to may read it, and only the server writes or deletes it.
// The page settings (publicBooking) and the link reservation are server-written too —
// otherwise a coach could point their link at another coach's reservation.
// Own PROJECT_ID per the note in subscriptions.rules.test.js.
const PROJECT_ID = 'elitepro-rules-test-public-booking';
const COACH = 'coachA';
const OTHER_COACH = 'coachB';
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
    await setDoc(doc(db, 'users', OTHER_COACH), { id: OTHER_COACH, role: 'trainer' });
    await setDoc(doc(db, 'users', STUDENT), { id: STUDENT, role: 'client', trainerId: COACH });
    await setDoc(doc(db, 'trialRequests', 'r1'), { id: 'r1', trainerId: COACH, name: 'Jo', contact: '07700 900123', date: '2026-10-20', time: '10:00' });
    await setDoc(doc(db, 'bookingPages', 'abcdefgh23'), { trainerId: COACH });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const stranger = () => env.unauthenticatedContext().firestore();

describe('trial requests', () => {
  test('the coach reads their own, singly and by the query the app uses', async () => {
    await assertSucceeds(getDoc(doc(as(COACH), 'trialRequests', 'r1')));
    await assertSucceeds(getDocs(query(collection(as(COACH), 'trialRequests'), where('trainerId', '==', COACH))));
  });

  test('another coach, a student and a stranger cannot read them', async () => {
    await assertFails(getDoc(doc(as(OTHER_COACH), 'trialRequests', 'r1')));
    await assertFails(getDocs(collection(as(OTHER_COACH), 'trialRequests')));
    await assertFails(getDoc(doc(as(STUDENT), 'trialRequests', 'r1')));
    await assertFails(getDoc(doc(stranger(), 'trialRequests', 'r1')));
  });

  test('nobody writes one from the browser — not even the coach, not even a stranger', async () => {
    await assertFails(setDoc(doc(stranger(), 'trialRequests', 'r2'), { trainerId: COACH, name: 'Spam' }));
    await assertFails(setDoc(doc(as(STUDENT), 'trialRequests', 'r2'), { trainerId: COACH, name: 'Spam' }));
    await assertFails(updateDoc(doc(as(COACH), 'trialRequests', 'r1'), { name: 'x' }));
    await assertFails(deleteDoc(doc(as(COACH), 'trialRequests', 'r1')));
  });
});

describe('the page link and the daily budgets are server-only', () => {
  test('no reads, no writes', async () => {
    await assertFails(getDoc(doc(as(COACH), 'bookingPages', 'abcdefgh23')));
    await assertFails(setDoc(doc(as(OTHER_COACH), 'bookingPages', 'zzzzzzzzzz'), { trainerId: OTHER_COACH }));
    await assertFails(getDoc(doc(as(COACH), 'trialBudget', 'x')));
    await assertFails(setDoc(doc(stranger(), 'trialBudget', 'x'), { count: 0 }));
  });

  test('a coach cannot write their page settings directly', async () => {
    await assertFails(updateDoc(doc(as(COACH), 'users', COACH), {
      publicBooking: { enabled: true, price: 0, days: [1], slug: 'abcdefgh23' },
    }));
  });
});

describe('a client confirmed from a request', () => {
  test('the contact field is written only by the server — a coach cannot add or change it', async () => {
    await assertFails(setDoc(doc(as(COACH), 'users', 'managed-1759200000000-ab12'), {
      id: 'managed-1759200000000-ab12', name: 'Jo', role: 'client', trainerId: COACH, managed: true,
      joinDate: '2026-10-04', contact: '07700 900123',
    }));
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'users', 'managed-1759200000000-cd34'), {
        id: 'managed-1759200000000-cd34', name: 'Jo', role: 'client', trainerId: COACH, managed: true, contact: '07700 900123',
      });
    });
    await assertSucceeds(getDoc(doc(as(COACH), 'users', 'managed-1759200000000-cd34')));
    await assertFails(updateDoc(doc(as(COACH), 'users', 'managed-1759200000000-cd34'), { contact: '07700 900999' }));
  });
});
