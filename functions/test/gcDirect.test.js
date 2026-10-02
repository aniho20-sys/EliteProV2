/**
 * functions/gcDirect.js — a trainer connects their own GoCardless account (B36).
 * Firestore emulator; GoCardless and Secret Manager faked.
 *
 * HOW TO RUN
 * ──────────
 * cd functions && npm run test:emulator
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'elitepro-fn-test-gcdirect';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'elitepro-fn-test-gcdirect' });
const db = admin.firestore();
const { connectDirect } = require('../gcDirect');

const LIVE_TOKEN = 'live_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
const SANDBOX_TOKEN = 'sandbox_AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const SECRET = 'whsec_0123456789abcdefABCDEF';
const CREDITOR = { id: 'CR123', name: "Ani's Studio", verification_status: 'successful' };

// GoCardless: each API accepts only its own token.
let calls;
const fetchImpl = async (url, opts) => {
  calls.push(url);
  const token = opts.headers.Authorization.replace('Bearer ', '');
  const live = url.startsWith('https://api.gocardless.com/');
  const accepted = live ? token === LIVE_TOKEN : token === SANDBOX_TOKEN;
  if (!accepted) return { ok: false, status: 401, text: async () => '{}' };
  return { ok: true, status: 200, text: async () => JSON.stringify({ creditors: [CREDITOR] }) };
};

let secrets;
const deps = (over = {}) => ({
  db, trainerId: 'coachA', accessToken: LIVE_TOKEN, webhookSecret: SECRET, fetchImpl,
  writeToken: async (id, v) => { secrets[`token:${id}`] = v; },
  writeWebhookSecret: async (id, v) => { secrets[`webhook:${id}`] = v; },
  now: () => new Date('2026-10-02T10:00:00Z'),
  ...over,
});
const connection = async () => (await db.doc('paymentConnections/coachA').get()).data();

beforeEach(async () => {
  calls = [];
  secrets = {};
  for (const col of ['users', 'paymentConnections']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
  await db.doc('users/coachA').set({ id: 'coachA', role: 'trainer' });
  await db.doc('users/clientA').set({ id: 'clientA', role: 'client', trainerId: 'coachA' });
});
afterAll(async () => { await admin.app().delete(); });

test('a live token connects as live; both values go to Secret Manager; nothing secret reaches Firestore', async () => {
  const out = await connectDirect(deps());
  expect(out).toEqual({ environment: 'live', creditorName: "Ani's Studio", verificationStatus: 'successful' });
  expect(secrets).toEqual({ 'token:coachA': LIVE_TOKEN, 'webhook:coachA': SECRET });
  const conn = await connection();
  expect(conn).toMatchObject({ mode: 'direct', environment: 'live', status: 'connected', providerAccountId: 'CR123' });
  const stored = JSON.stringify(conn);
  expect(stored).not.toContain(LIVE_TOKEN);
  expect(stored).not.toContain(SECRET);
});

test('a sandbox token is recognised as sandbox — by GoCardless, not by its name', async () => {
  const out = await connectDirect(deps({ accessToken: SANDBOX_TOKEN }));
  expect(out.environment).toBe('sandbox');
  expect(calls).toEqual(['https://api.gocardless.com/creditors', 'https://api-sandbox.gocardless.com/creditors']);
  expect((await connection()).environment).toBe('sandbox');
});

test('a token neither GoCardless accepts is refused, and nothing is stored', async () => {
  await expect(connectDirect(deps({ accessToken: 'live_ThisTokenWasRevokedLongAgo0000' })))
    .rejects.toMatchObject({ code: 'invalid-argument' });
  expect(secrets).toEqual({});
  expect(await connection()).toBeUndefined();
});

test('pasted with spaces and a newline (a phone), it still works', async () => {
  await connectDirect(deps({ accessToken: `  ${LIVE_TOKEN}\n`, webhookSecret: `${SECRET} ` }));
  expect(secrets).toEqual({ 'token:coachA': LIVE_TOKEN, 'webhook:coachA': SECRET });
});

test('obviously wrong input is refused before GoCardless is asked', async () => {
  for (const over of [{ accessToken: '' }, { accessToken: 'Access token' }, { accessToken: 'x'.repeat(10) },
    { webhookSecret: '' }, { webhookSecret: 'short' }, { accessToken: 42 }]) {
    await expect(connectDirect(deps(over))).rejects.toMatchObject({ code: 'invalid-argument' });
  }
  expect(calls).toEqual([]);
});

test('only a trainer can connect', async () => {
  await expect(connectDirect(deps({ trainerId: 'clientA' }))).rejects.toMatchObject({ code: 'permission-denied' });
  expect(calls).toEqual([]);
});

test('GoCardless down: nothing stored, and it says "try again", not "wrong token"', async () => {
  const down = async () => ({ ok: false, status: 503, text: async () => '{}' });
  await expect(connectDirect(deps({ fetchImpl: down }))).rejects.toMatchObject({ code: 'unavailable' });
  expect(secrets).toEqual({});
});
