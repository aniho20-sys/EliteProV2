// The few things every Stripe call needs (B49, reports/stripe-subscription-design.md).
//
// No Stripe SDK: the calls ElitePro makes are a handful of form-encoded POSTs and GETs,
// and taking `fetchImpl` as a parameter keeps every rule unit-testable without Stripe —
// the same pattern as the GoCardless modules.
//
// Every call is made with ElitePro's ONE platform secret key. A call about a coach's own
// Stripe account carries `Stripe-Account: acct_…` (a "direct charge"): the money and the
// objects live in the coach's account, never pass through ElitePro's.

const crypto = require('crypto');

const API = 'https://api.stripe.com';

class StripeApiError extends Error {
  constructor(status, body) {
    super(`Stripe API ${status}`);
    this.name = 'StripeApiError';
    this.status = status;
    this.body = body;
  }
}

// Stripe takes application/x-www-form-urlencoded with bracketed keys:
// { line_items: [{ price_data: { currency: 'gbp' } }] } → line_items[0][price_data][currency]=gbp.
// undefined / null are left out entirely (an empty value means "unset" to Stripe).
function formEncode(params, prefix = '', out = []) {
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') formEncode(item, `${key}[${i}]`, out);
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === 'object') {
      formEncode(v, key, out);
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out.join('&');
}

// Every request names the API version it was written for (Grok #31, B81). Without it Stripe
// answers in the version set on each coach's own account, which they can change in their
// dashboard — and a reply in a different shape fails quietly. Basil is the first version with
// the subscription under invoice.parent, which stripeWebhooks.js reads (it still reads the
// older place too). Change it only together with the stripe tests.
const STRIPE_VERSION = '2025-03-31.basil';

async function stripeRequest({ fetchImpl, secretKey, method = 'GET', path, params, account, idempotencyKey }) {
  const headers = { Authorization: `Bearer ${secretKey}`, 'Stripe-Version': STRIPE_VERSION };
  if (account) headers['Stripe-Account'] = account;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  let url = `${API}${path}`;
  let body;
  if (params && method === 'GET') url += `?${formEncode(params)}`;
  else if (params) {
    body = formEncode(params);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  const res = await fetchImpl(url, { method, headers, body });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) throw new StripeApiError(res.status, json || text);
  return json;
}

// What goes into Firestore about a failure: the status and Stripe's own error
// type/code/message — never a key or a request body.
function describeStripeError(err) {
  if (err instanceof StripeApiError) {
    const e = err.body && err.body.error;
    const parts = [`stripe ${err.status}`];
    if (e && e.type) parts.push(e.type);
    if (e && e.code) parts.push(e.code);
    const head = parts.join(' ');
    return e && e.message ? `${head}: ${String(e.message).slice(0, 200)}` : head;
  }
  return String((err && err.message) || err).slice(0, 200);
}

// sk_test_… / rk_test_… → 'sandbox', sk_live_… / rk_live_… → 'live'. Only trusted because
// saveStripeKeys checked the prefix against Stripe's own `livemode` answer when the key
// was saved; a key that disagreed was refused there.
function keyEnvironment(secretKey) {
  const m = /^(?:sk|rk)_(test|live)_/.exec(String(secretKey || ''));
  if (!m) return null;
  return m[1] === 'live' ? 'live' : 'sandbox';
}

// Stripe-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">[,v1=…].
// The raw bytes, never re-serialised JSON. Older than `toleranceSec` is refused, so a
// captured request cannot be replayed later.
function verifyStripeSignature(rawBody, header, secret, nowSec, toleranceSec = 300) {
  if (!rawBody || !header || !secret) return false;
  const parts = String(header).split(',').map(p => p.trim().split('='));
  const t = Number((parts.find(([k]) => k === 't') || [])[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(t) || signatures.length === 0) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const payload = Buffer.concat([Buffer.from(`${t}.`, 'utf8'), Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8')]);
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(payload).digest('hex'), 'utf8');
  return signatures.some((sig) => {
    const given = Buffer.from(String(sig || ''), 'utf8');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

module.exports = { StripeApiError, formEncode, stripeRequest, describeStripeError, keyEnvironment, verifyStripeSignature, STRIPE_VERSION };
