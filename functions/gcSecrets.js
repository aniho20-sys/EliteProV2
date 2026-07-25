/* global require, exports, process, Buffer */
// Per-trainer GoCardless OAuth access tokens — dynamic, created one-per-trainer
// at connect time. This module also reads ElitePro's own static app-level
// GoCardless credentials (readGcAppCredentials, below) — both talk to Secret
// Manager directly at CALL TIME rather than via Firebase's defineSecret()
// deploy-time binding. defineSecret()/.runWith({secrets:[...]}) was the
// original design for the app-level credentials, but it validates secrets
// at DEPLOY time: when Secret Manager wasn't even enabled yet on this
// project, that one binding failed the *entire* `firebase deploy --only
// functions` step, taking every other function down with it (see
// reports/gocardless-sandbox-setup-guide.md). Reading at call time instead
// means deploy always succeeds regardless of Secret Manager's state; the
// GoCardless-dependent functions just return a graceful "not configured"
// result until the secrets actually exist.
//
// WRITE PATH: only gcOAuthCallback (index.js) calls writeGcAccessToken(),
// immediately after exchanging a GoCardless OAuth code for a token.
// READ PATH: only future Phase 3 functions that call the GoCardless API on a
// trainer's behalf (mandate creation, subscription management — not yet
// built) will call readGcAccessToken(). No client-reachable code path calls
// either function — both are plain Node exports, never registered as an
// onCall/onRequest handler themselves.
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const secretClient = new SecretManagerServiceClient();

function projectId() {
  return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
}

function secretId(trainerId) {
  return `gc-token-${trainerId}`;
}

const WRITE_RETRY_ATTEMPTS = 3;
const WRITE_RETRY_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries transient Secret Manager failures (network blips, brief
// throttling) within this single request before giving up — so a trainer's
// already-obtained GoCardless token isn't thrown away over something that
// would have succeeded a moment later. gcOAuthCallback only needs to treat
// this as a hard failure (and release the OAuth nonce for a clean retry —
// see gcOAuthNonce.js) once every attempt here has been exhausted.
async function writeGcAccessToken(trainerId, accessToken) {
  let lastErr;
  for (let attempt = 1; attempt <= WRITE_RETRY_ATTEMPTS; attempt++) {
    try {
      await writeGcAccessTokenOnce(trainerId, accessToken);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < WRITE_RETRY_ATTEMPTS) await sleep(WRITE_RETRY_DELAY_MS * attempt);
    }
  }
  throw lastErr;
}

async function writeGcAccessTokenOnce(trainerId, accessToken) {
  const parent = `projects/${projectId()}`;
  const fullName = `${parent}/secrets/${secretId(trainerId)}`;

  try {
    await secretClient.getSecret({ name: fullName });
  } catch (err) {
    if (err.code !== 5 /* NOT_FOUND */) throw err;
    await secretClient.createSecret({
      parent,
      secretId: secretId(trainerId),
      secret: { replication: { automatic: {} } },
    });
  }

  await secretClient.addSecretVersion({
    parent: fullName,
    payload: { data: Buffer.from(accessToken, 'utf8') },
  });
}

async function readGcAccessToken(trainerId) {
  const name = `projects/${projectId()}/secrets/${secretId(trainerId)}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload.data.toString('utf8');
}

// Called only by gcDisconnect (index.js). Deletes the secret entirely —
// there's no reason to keep a disconnected trainer's token around. Note:
// this only removes ElitePro's copy; whether GoCardless's own OAuth
// revocation endpoint should also be called here is flagged as unverified
// in reports/phase3-subscription-design.md, same as the pause-mechanism
// unknown — not committing to that API shape without confirming it in
// sandbox first.
async function deleteGcAccessToken(trainerId) {
  const fullName = `projects/${projectId()}/secrets/${secretId(trainerId)}`;
  try {
    await secretClient.deleteSecret({ name: fullName });
  } catch (err) {
    if (err.code !== 5 /* NOT_FOUND */) throw err;
  }
}

// ElitePro's own GoCardless Partner app credentials — one app, shared across
// all trainers (not a per-trainer secret). Set up via
// reports/gocardless-sandbox-setup-guide.md: three Secret Manager secrets
// named exactly GC_CLIENT_ID, GC_CLIENT_SECRET, GC_REDIRECT_URI.
const APP_SECRET_NAMES = {
  clientId: 'GC_CLIENT_ID',
  clientSecret: 'GC_CLIENT_SECRET',
  redirectUri: 'GC_REDIRECT_URI',
};

async function readAppSecret(name) {
  const fullName = `projects/${projectId()}/secrets/${name}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name: fullName });
  return version.payload.data.toString('utf8');
}

// Called by gcOAuthStart/gcOAuthCallback (index.js). Returns null — never
// throws — if Secret Manager isn't enabled yet, or any of the three secrets
// don't exist yet: either case means "not configured", which the caller
// turns into a graceful failed-precondition response rather than a crash.
async function readGcAppCredentials() {
  try {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
      readAppSecret(APP_SECRET_NAMES.clientId),
      readAppSecret(APP_SECRET_NAMES.clientSecret),
      readAppSecret(APP_SECRET_NAMES.redirectUri),
    ]);
    return { clientId, clientSecret, redirectUri };
  } catch (err) {
    console.warn('[gcSecrets] GoCardless app credentials not configured yet:', err.message);
    return null;
  }
}

exports.writeGcAccessToken = writeGcAccessToken;
exports.readGcAccessToken = readGcAccessToken;
exports.deleteGcAccessToken = deleteGcAccessToken;
exports.readGcAppCredentials = readGcAppCredentials;
