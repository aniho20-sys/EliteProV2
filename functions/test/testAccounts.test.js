'use strict';

/**
 * Which accounts the cleanup tool would delete.
 *
 * Pure selection logic, so this suite needs no emulator — `npx jest test/testAccounts`
 * runs it on its own, and `npm run test:emulator` picks it up with the rest.
 *
 * The bug it exists for: until 2026-08-31 the list came from Firestore profiles alone. An
 * account can exist as a Firebase Auth login with no profile document at all, and those
 * were invisible — the tool reported the sweep complete while the Auth user list was still
 * full of testtrainer…@example.com. Firebase Auth is the register of who exists; Firestore
 * only knows who finished signing up.
 */

const { selectTestAccounts, isDeletableTestAccount } = require('../testAccounts');

const authUser = (uid, email) => ({ uid, email });
const profile = (id, email, extra = {}) => ({ id, email, ...extra });

describe('isDeletableTestAccount', () => {
  test('@example.com is the only thing that qualifies', () => {
    expect(isDeletableTestAccount({ email: 'testtrainer1750000000@example.com' })).toBe(true);
    expect(isDeletableTestAccount({ email: 'someone@gmail.com' })).toBe(false);
  });

  test('case and stray whitespace do not let one through or hold one back', () => {
    expect(isDeletableTestAccount({ email: '  TestTrainer@Example.COM ' })).toBe(true);
  });

  test('the owner is never deletable, whatever else is true', () => {
    expect(isDeletableTestAccount({ email: 'aniho20@gmail.com' })).toBe(false);
    expect(isDeletableTestAccount({ email: 'ANIHO20@GMAIL.COM' })).toBe(false);
  });

  test('an account with no address is never touched', () => {
    // No address means no evidence. Guessing at that point is how a real account dies.
    for (const email of [undefined, null, '', '   ']) {
      expect(isDeletableTestAccount({ email })).toBe(false);
    }
    expect(isDeletableTestAccount({})).toBe(false);
    expect(isDeletableTestAccount(undefined)).toBe(false);
  });

  test('the permanent QA accounts on @elitepro.test survive', () => {
    // CLAUDE.md keeps these two on purpose for multi-tenant testing.
    expect(isDeletableTestAccount({ email: 'test-coach-b@elitepro.test' })).toBe(false);
    expect(isDeletableTestAccount({ email: 'test-student-b@elitepro.test' })).toBe(false);
  });

  test('a lookalike domain does not qualify', () => {
    // endsWith on the full "@example.com" — not a substring match that would also hit
    // notexample.com or example.com.evil.net.
    expect(isDeletableTestAccount({ email: 'a@notexample.com' })).toBe(false);
    expect(isDeletableTestAccount({ email: 'a@example.com.evil.net' })).toBe(false);
    expect(isDeletableTestAccount({ email: 'a@example.co' })).toBe(false);
  });
});

describe('selectTestAccounts', () => {
  test('nothing in, nothing out', () => {
    const { doomed, strandedClients } = selectTestAccounts([], []);
    expect(doomed).toEqual([]);
    expect(strandedClients).toEqual([]);
  });

  test('one account with both a login and a profile is listed once', () => {
    const { doomed } = selectTestAccounts(
      [authUser('u1', 'testtrainer1@example.com')],
      [profile('u1', 'testtrainer1@example.com', { role: 'trainer', name: 'Test T' })],
    );
    expect(doomed).toHaveLength(1);
    expect(doomed[0]).toMatchObject({ id: 'u1', role: 'trainer', name: 'Test T', hasProfile: true });
  });

  test('many, mixed with real accounts, picks out only the test ones', () => {
    const { doomed } = selectTestAccounts(
      [
        authUser('u1', 'testtrainer1@example.com'),
        authUser('u2', 'testclient2@example.com'),
        authUser('real', 'aniho20@gmail.com'),
        authUser('qa', 'test-coach-b@elitepro.test'),
      ],
      [profile('real', 'aniho20@gmail.com', { role: 'trainer' })],
    );
    expect(doomed.map(d => d.id).sort()).toEqual(['u1', 'u2']);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
describe('GUARDIAN: the 2026-08-31 miss', () => {
  test('a login with no profile document is still selected', () => {
    // The exact shape that survived the first sweep: present in Firebase Auth, absent from
    // Firestore. A Firestore-only search returns nothing here and reports success.
    const { doomed } = selectTestAccounts(
      [authUser('ghost', 'testtrainer1750000000@example.com')],
      [],
    );
    expect(doomed).toHaveLength(1);
    expect(doomed[0]).toMatchObject({ id: 'ghost', hasProfile: false, role: '' });
  });

  test('a profile whose login is already gone is still selected', () => {
    // The mirror image, left behind by a partial cleanup.
    const { doomed } = selectTestAccounts([], [profile('orphan', 'testclient9@example.com', { role: 'client' })]);
    expect(doomed).toHaveLength(1);
    expect(doomed[0]).toMatchObject({ id: 'orphan', hasProfile: true });
  });

  test('an account in both registers is not counted twice', () => {
    const { doomed } = selectTestAccounts(
      [authUser('u1', 'testtrainer1@example.com')],
      [profile('u1', 'testtrainer1@example.com', { role: 'trainer' })],
    );
    expect(doomed).toHaveLength(1);
  });
});

describe('real clients attached to a test trainer', () => {
  test('are detached, never deleted', () => {
    const { doomed, strandedClients } = selectTestAccounts(
      [authUser('testT', 'testtrainer1@example.com'), authUser('realC', 'someone@gmail.com')],
      [
        profile('testT', 'testtrainer1@example.com', { role: 'trainer' }),
        profile('realC', 'someone@gmail.com', { role: 'client', trainerId: 'testT' }),
      ],
    );
    expect(doomed.map(d => d.id)).toEqual(['testT']);
    expect(strandedClients.map(c => c.id)).toEqual(['realC']);
  });

  test('a test client of a test trainer is deleted, not listed as stranded', () => {
    const { doomed, strandedClients } = selectTestAccounts(
      [authUser('testT', 'testtrainer1@example.com'), authUser('testC', 'testclient1@example.com')],
      [
        profile('testT', 'testtrainer1@example.com', { role: 'trainer' }),
        profile('testC', 'testclient1@example.com', { role: 'client', trainerId: 'testT' }),
      ],
    );
    expect(doomed.map(d => d.id).sort()).toEqual(['testC', 'testT']);
    expect(strandedClients).toEqual([]);
  });

  test('a real client of a real trainer is left entirely alone', () => {
    const { doomed, strandedClients } = selectTestAccounts(
      [authUser('realT', 'coach@gmail.com'), authUser('realC', 'student@gmail.com')],
      [
        profile('realT', 'coach@gmail.com', { role: 'trainer' }),
        profile('realC', 'student@gmail.com', { role: 'client', trainerId: 'realT' }),
      ],
    );
    expect(doomed).toEqual([]);
    expect(strandedClients).toEqual([]);
  });
});
