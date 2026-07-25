/* global require, exports, process, Buffer */
// Per-trainer GoCardless OAuth access tokens — dynamic, created one-per-trainer
// at connect time, so they can't use Firebase's static defineSecret() (that's
// for a fixed set of secrets known at deploy time, e.g. GC_CLIENT_SECRET in
// index.js). This talks to Secret Manager directly instead.
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

async function writeGcAccessToken(trainerId, accessToken) {
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

exports.writeGcAccessToken = writeGcAccessToken;
exports.readGcAccessToken = readGcAccessToken;
