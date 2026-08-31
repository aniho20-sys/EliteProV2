'use strict';

/**
 * resolveInviteCode — the invite-code lookup, moved server-side on 2026-08-27.
 *
 * It exists so `users` could stop being world-readable to signed-in accounts. That rule
 * was open only because the browser had to run this query itself, and a user document
 * carries an email address, a session balance and (for trainers) bank details.
 *
 * These tests matter more than most: this function is now the ONLY path by which a new
 * student can reach their coach. If it returns nothing, onboarding is dead and the app
 * says "Invalid invite code" for every valid code — which is precisely what happened for
 * weeks in 2026-08 (CLAUDE.md #34).
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
// Its own project id, not elitepro-16718. Jest runs suites in parallel workers against one
// emulator, and bookSession.test.js clears the entire `users` collection between its tests
// — which deletes this suite's fixtures mid-run. Sharing a project makes the two suites
// fight; a separate project inside the same emulator keeps them independent. Same reasoning
// as the per-file PROJECT_ID note in firestore-tests/subscriptions.rules.test.js.
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-invite';

const functionsTest = require('firebase-functions-test')({ projectId: 'elitepro-fn-test-invite' });
const admin = require('firebase-admin');
const myFunctions = require('../index');

const db = admin.firestore();
const resolve = functionsTest.wrap(myFunctions.resolveInviteCode);

const TRAINER = 'trainer-invite-1';
const OTHER_TRAINER = 'trainer-invite-2';
const CLIENT_WITH_CODE = 'client-invite-1';
const CALLER = { auth: { uid: 'someone-signing-up', token: { email: 'new@student.test' } } };

// Deletes THIS suite's fixtures by id, never the whole collection. Jest runs suites in
// parallel workers against one shared emulator project, so a collection-wide wipe here
// deletes bookSession.test.js's fixtures mid-run — which is exactly what happened when
// this file was first written, and it failed that suite, not this one. Unique ids, and
// targeted deletes, are what keep the suites independent.
const FIXTURES = [TRAINER, OTHER_TRAINER, CLIENT_WITH_CODE];

async function wipeFixtures() {
  await Promise.all(FIXTURES.map(id => db.doc(`users/${id}`).delete()));
}

beforeEach(async () => {
  await wipeFixtures();
  await db.doc(`users/${TRAINER}`).set({
    id: TRAINER,
    role: 'trainer',
    name: 'Coach Ani',
    email: 'ani@coach.test',
    inviteCode: '3XQPKM',
    renewalRate: 400,
    bankDetails: { accountName: 'A Ho', sortCode: '00-00-00', accountNumber: '12345678' },
  });
  await db.doc(`users/${OTHER_TRAINER}`).set({
    id: OTHER_TRAINER, role: 'trainer', name: 'Other Coach', inviteCode: 'ZZZZZZ',
  });
});

afterAll(async () => {
  await wipeFixtures();
  functionsTest.cleanup();
});

describe('resolving a code', () => {
  test('a valid code returns the trainer who owns it', async () => {
    const res = await resolve({ code: '3XQPKM' }, CALLER);
    expect(res.found).toBe(true);
    expect(res.trainer.id).toBe(TRAINER);
    expect(res.trainer.name).toBe('Coach Ani');
  });

  test('the code is normalised, so what a phone keyboard produces still matches', async () => {
    // Lower case, a hyphen the student invented, and surrounding whitespace. Each of these
    // arrives in practice; each would miss on an exact string comparison.
    for (const typed of ['3xqpkm', '3XQ-PKM', '  3XQPKM  ', '3xq pkm']) {
      const res = await resolve({ code: typed }, CALLER);
      expect(res.found).toBe(true);
      expect(res.trainer.id).toBe(TRAINER);
    }
  });

  test('an unknown code is a plain "not found", not an error', async () => {
    // The distinction the UI depends on: not-found means "check the code with your coach",
    // a thrown error means "something is broken, do not send them hunting for a typo".
    const res = await resolve({ code: 'NOPE99' }, CALLER);
    expect(res.found).toBe(false);
  });

  test('a code belonging to a client account does not resolve', async () => {
    // Only trainers hand out codes. A client document carrying an inviteCode field — by
    // accident or on purpose — must not become a connectable "coach".
    await db.doc(`users/${CLIENT_WITH_CODE}`).set({
      id: CLIENT_WITH_CODE, role: 'client', name: 'Not A Coach', inviteCode: 'CLIENT1',
    });
    const res = await resolve({ code: 'CLIENT1' }, CALLER);
    expect(res.found).toBe(false);
  });
});

describe('what it refuses to hand back', () => {
  test('only id and name — never the email, rate or bank details', async () => {
    const res = await resolve({ code: '3XQPKM' }, CALLER);
    expect(Object.keys(res.trainer).sort()).toEqual(['id', 'name']);
    // Stated explicitly as well as by the key list, because this is the entire reason the
    // function exists: the caller is a stranger to this trainer at the moment they ask.
    const serialised = JSON.stringify(res);
    expect(serialised).not.toContain('ani@coach.test');
    expect(serialised).not.toContain('12345678');
  });

  test('a trainer with no name still resolves, with a usable placeholder', async () => {
    await db.doc(`users/${TRAINER}`).set({ id: TRAINER, role: 'trainer', inviteCode: '3XQPKM' });
    const res = await resolve({ code: '3XQPKM' }, CALLER);
    expect(res.found).toBe(true);
    expect(res.trainer.name).toBe('Coach');
  });
});

describe('who may call it', () => {
  test('an unauthenticated caller is rejected', async () => {
    await expect(resolve({ code: '3XQPKM' }, {})).rejects.toThrow(/signed in/i);
  });

  test('an empty or junk code is rejected before it reaches Firestore', async () => {
    for (const code of ['', '   ', '---', null, undefined, 12345]) {
      await expect(resolve({ code }, CALLER)).rejects.toThrow(/code required/i);
    }
  });

  test('a missing payload is rejected rather than throwing on undefined', async () => {
    await expect(resolve({}, CALLER)).rejects.toThrow(/code required/i);
    await expect(resolve(undefined, CALLER)).rejects.toThrow(/code required/i);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
// The 2026-08-04 bug was a lookup that could never succeed, and nothing failed to say so.
describe('GUARDIAN: the lookup query stays index-safe', () => {
  test('two trainers, two codes, each resolves to its own owner', async () => {
    expect((await resolve({ code: '3XQPKM' }, CALLER)).trainer.id).toBe(TRAINER);
    expect((await resolve({ code: 'ZZZZZZ' }, CALLER)).trainer.id).toBe(OTHER_TRAINER);
  });

  test('the query filters on one field only, so it cannot need a composite index', () => {
    // A second equality filter (role == "trainer") would require a composite index that
    // does not exist in production, and a missing index fails at runtime looking exactly
    // like a wrong code. Role is filtered in JS instead; this pins that choice.
    const src = require('fs').readFileSync(require('path').join(__dirname, '../index.js'), 'utf8');
    const fn = src.slice(src.indexOf('exports.resolveInviteCode'));
    const body = fn.slice(0, fn.indexOf('\n});'));
    expect(body).toMatch(/\.where\('inviteCode', '==', code\)/);
    expect(body.match(/\.where\(/g)).toHaveLength(1);
  });
});
