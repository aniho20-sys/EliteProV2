'use strict';

/**
 * CSRF-protection tests for the GoCardless OAuth connect flow's nonce
 * mechanism (functions/gcOAuthNonce.js), added after a security review
 * found the original design trusted `state` = trainerId directly — anyone
 * who knew a trainer's UID could forge a valid-looking callback request.
 *
 * These exercise createNonce()/consumeNonce() directly against the real
 * Firestore emulator (same harness as bookSession.test.js) — no mocking.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-16718';

const admin = require('firebase-admin');
admin.initializeApp();

const { createNonce, consumeNonce } = require('../gcOAuthNonce');
const db = admin.firestore();

const TRAINER_ID = 'test-trainer-nonce-1';

async function clearNonces() {
  const snap = await db.collection('gcOAuthNonces').get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

beforeEach(async () => {
  await clearNonces();
});

afterAll(async () => {
  await clearNonces();
});

describe('createNonce', () => {
  test('generates a crypto-random 256-bit hex value, not a predictable one', async () => {
    const a = await createNonce(TRAINER_ID);
    const b = await createNonce(TRAINER_ID);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toEqual(b);
  });

  test('records the trainerId and a 10-minute expiry', async () => {
    const before = Date.now();
    const nonce = await createNonce(TRAINER_ID);
    const snap = await db.doc(`gcOAuthNonces/${nonce}`).get();
    const data = snap.data();
    expect(data.trainerId).toBe(TRAINER_ID);
    expect(data.used).toBe(false);
    const ttlMs = new Date(data.expiresAt).getTime() - before;
    expect(ttlMs).toBeGreaterThan(9 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(10 * 60 * 1000 + 5000);
  });
});

describe('consumeNonce — the three required attack scenarios', () => {
  test('forged state (no matching nonce doc at all) is rejected', async () => {
    const result = await consumeNonce('0'.repeat(64));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not_found');
  });

  test('malformed state (path-shaped value, wrong length, non-hex) is rejected before any lookup', async () => {
    const malformed = ['not-a-nonce', 'a/b/c', `${TRAINER_ID}`, '', 'g'.repeat(64), '0'.repeat(63)];
    for (const value of malformed) {
      const result = await consumeNonce(value);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('not_found');
    }
  });

  test('reused state (already consumed once) is rejected on the second attempt', async () => {
    const nonce = await createNonce(TRAINER_ID);
    const first = await consumeNonce(nonce);
    expect(first.ok).toBe(true);
    expect(first.trainerId).toBe(TRAINER_ID);

    const second = await consumeNonce(nonce);
    expect(second.ok).toBe(false);
    // one-time use deletes the doc on success, so the replay attempt sees
    // "not_found" rather than "already_used" — either way, it's rejected.
    expect(second.reason).toBe('not_found');
  });

  test('expired state is rejected even though the nonce doc still exists', async () => {
    const nonce = await createNonce(TRAINER_ID);
    // Simulate the 10-minute window having passed.
    await db.doc(`gcOAuthNonces/${nonce}`).update({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const result = await consumeNonce(nonce);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('expired');
  });
});

describe('consumeNonce — happy path', () => {
  test('a fresh, unexpired, unused nonce for a real trainer is accepted exactly once', async () => {
    const nonce = await createNonce(TRAINER_ID);
    const result = await consumeNonce(nonce);
    expect(result.ok).toBe(true);
    expect(result.trainerId).toBe(TRAINER_ID);

    const snap = await db.doc(`gcOAuthNonces/${nonce}`).get();
    expect(snap.exists).toBe(false); // one-time use — deleted on consumption
  });
});
