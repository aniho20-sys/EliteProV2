/* global jest, describe, test, expect */
// No emulator needed: Secret Manager is mocked, which is the whole point —
// this tests what gcSecrets does with the bytes it gets back.

const stored = {};
jest.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
    accessSecretVersion: jest.fn(async ({ name }) => {
      const key = name.split('/secrets/')[1].split('/')[0];
      if (!(key in stored)) throw new Error(`NOT_FOUND: ${key}`);
      return [{ payload: { data: Buffer.from(stored[key], 'utf8') } }];
    }),
  })),
}));

process.env.GCLOUD_PROJECT = 'elitepro-16718';
const { readGcAppCredentials } = require('../gcSecrets');

// ---------------------------------------------------------------------------
// GUARDIAN: app credentials pasted from a phone survive invisible whitespace.
// ---------------------------------------------------------------------------
// The three app-level secrets are typed into the Google Cloud console by hand,
// on a phone. Mobile copy-paste routinely carries a trailing space or newline,
// and nothing on screen shows it. Untrimmed, a client_id of "abc123 " is a
// different client to GoCardless, and a redirect_uri with a trailing newline
// fails the byte-for-byte match — both surfacing as an opaque OAuth error with
// nothing to say the cause was a character nobody can see.
describe('GUARDIAN: readGcAppCredentials trims what was pasted', () => {
  test('trailing newline and spaces are removed', async () => {
    stored.GC_CLIENT_ID = 'client-abc  \n';
    stored.GC_CLIENT_SECRET = '  secret-xyz\n';
    stored.GC_REDIRECT_URI = 'https://us-central1-elitepro-16718.cloudfunctions.net/gcOAuthCallback\n';
    await expect(readGcAppCredentials()).resolves.toEqual({
      clientId: 'client-abc',
      clientSecret: 'secret-xyz',
      redirectUri: 'https://us-central1-elitepro-16718.cloudfunctions.net/gcOAuthCallback',
    });
  });

  test('a missing secret still reads as "not configured" (null), never a throw', async () => {
    delete stored.GC_CLIENT_SECRET;
    await expect(readGcAppCredentials()).resolves.toBeNull();
  });

  test('a secret that is only whitespace counts as not configured', async () => {
    stored.GC_CLIENT_ID = 'client-abc';
    stored.GC_CLIENT_SECRET = '   \n';
    stored.GC_REDIRECT_URI = 'https://example.test/cb';
    await expect(readGcAppCredentials()).resolves.toBeNull();
  });
});
