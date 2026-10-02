// Which GoCardless a trainer's money goes through (B36, 2026-10-02).
//
// Sandbox and live are two separate GoCardless worlds: different hosts, different
// accounts, different tokens. Until Ani chose the "own account" route, every call was
// hard-wired to sandbox in three places. Now each trainer's paymentConnections doc says
// which world their connection lives in, and every API call is built from that — never
// from a constant, so connecting a live account is a data change, not a deploy.
//
// A subscription records the environment it was created in, so a plan made against the
// sandbox is never sent to the live API (or the reverse) after the trainer reconnects.

const API_BASE = {
  sandbox: 'https://api-sandbox.gocardless.com',
  live: 'https://api.gocardless.com',
};

const ENVIRONMENTS = Object.keys(API_BASE);

// Documents written before environments existed are all sandbox (index.js wrote the
// literal 'sandbox'), so a missing value means sandbox — never live by accident.
function environmentOf(doc) {
  const env = doc && doc.environment;
  return ENVIRONMENTS.includes(env) ? env : 'sandbox';
}

function apiBase(environment) {
  if (!ENVIRONMENTS.includes(environment)) throw new Error(`Unknown GoCardless environment: ${environment}`);
  return API_BASE[environment];
}

async function connectionEnvironment(db, trainerId) {
  const snap = await db.doc(`paymentConnections/${trainerId}`).get();
  return environmentOf(snap.exists ? snap.data() : null);
}

module.exports = { API_BASE, ENVIRONMENTS, environmentOf, apiBase, connectionEnvironment };
