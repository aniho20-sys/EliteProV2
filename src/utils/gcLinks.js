// Where GoCardless sends a trainer's own events (B36): gcWebhook/<their uid>, verified with
// the secret of the webhook endpoint they create in their own GoCardless dashboard. The
// Functions region is the default us-central1 (no .region() in functions/index.js); if
// that ever changes, every trainer's registered address changes with it.
export const FUNCTIONS_BASE = 'https://us-central1-elitepro-16718.cloudfunctions.net';

export function gcWebhookUrl(trainerId) {
  return `${FUNCTIONS_BASE}/gcWebhook/${trainerId}`;
}
