# Phase 3 — Subscription Billing Design (GoCardless)

Status: **DRAFT — awaiting Ani's approval before any implementation work begins.**
Author: 員工A (SA), per business terms confirmed by Ani on 2026-07-20.

This document is a design/scoping proposal only. No code has been written yet.
Once approved, implementation will follow in small, separately-committed
chunks (schema → Cloud Functions → rules + rules tests → dashboard
integration → UI), each verified with `npm run build` + the credit test
suite before merging, matching how every other feature has shipped this
session.

---

## 1. Business Terms (as confirmed)

### Pricing

| Tier | Weekly cadence | Monthly session quota | Annual sessions (×52) | Annual value (×£65) | Monthly Direct Debit |
|---|---|---|---|---|---|
| Starter | ~1/week | 4 | 52 | £3,380 | **£281.67/month** |
| Standard | ~2/week | 8 | 104 | £6,760 | **£563.33/month** |
| Committed | ~3/week | 12 | 156 | £10,140 | **£845.00/month** |

- Base rate **£65/session**, locked at signup (same "rate lock" precedent as
  the existing `renewalRate`/`renewalRateNext` pack fields — a rate change
  a trainer makes later must not retroactively alter an already-active
  subscriber's monthly amount).
- Non-subscription pack/pay-as-you-go stays at **£75/session**, no
  commitment. This is a *deliberate* £10/session (~15%) premium for
  flexibility — not a bug, not a pricing inconsistency to "fix".
- **Positioning correction:** `ROADMAP.md` currently says subscriptions
  "replace" pack billing. That's wrong per Ani's direction — the two are a
  permanent dual-mode structure: pack is the low-commitment entry point,
  subscription is the discounted upgrade for clients who commit. Both
  stay. (Corrected in `ROADMAP.md` alongside this doc.)

### Roll-over

- Unused sessions in a billing period carry into the next period,
  **capped at half the tier's monthly quota** (4→2, 8→4, 12→6). Anything
  unused beyond that cap is forfeited, not banked.
- Client-facing copy: *"Unused sessions roll over, up to half your
  monthly plan."*

### Pause

- Up to **2 pauses per year**, **1 month's notice**, free.
- While paused: no charge, no sessions granted, subscribed rate is
  preserved (not renegotiated) for when it resumes.
- In-app flow: client or trainer taps **Pause** → picks a **resume date**
  → subscription **auto-resumes** on that date with no further action
  needed.
- Framed as a retention tool (the explicit use case is HK clients on
  extended overseas trips), not an edge case to minimize — the flow
  should feel like a normal, first-class action, not a hidden "cancel and
  we'll miss you" dead end.

### Cancellation

- **1 month's notice, zero penalty, no exit fee.** This is a marketing
  point ("no hidden fees"), not just a policy — copy should say so
  explicitly wherever cancellation is presented.

### GoCardless integration scope

- **Sandbox only for now.** Full loop must work end-to-end in sandbox
  before any conversation about going live: mandate creation, monthly
  charge, failed-payment retry, refund, and pause-month skip-charge.
- **Multi-tenant from day one.** GoCardless credentials are never
  hardcoded to a single ElitePro-wide merchant account. Architecture uses
  GoCardless's **Partner/OAuth Connect** model — each trainer connects
  their *own* GoCardless account to ElitePro via OAuth; ElitePro acts as
  the platform making API calls on that trainer's behalf using their
  connection. Ani is the first trainer to connect (i.e., there is no
  "house" GC account — every trainer, including Ani, goes through the
  same connect flow).

---

## 2. Data Model

### `subscriptions/{subscriptionId}`

```js
{
  id: string,
  clientId: string,
  trainerId: string,
  tier: 4 | 8 | 12,             // monthly session quota
  ratePerSession: 65,           // £, locked at signup — immutable after creation
  monthlyAmount: 281.67 | 563.33 | 845.00,  // derived at creation, stored for display/audit (not recomputed live, so a later base-rate change never retroactively touches active subscribers)
  status: 'active' | 'paused' | 'past_due' | 'cancelled',
  startDate: string,            // 'YYYY-MM-DD'

  // GoCardless linkage
  gcMandateId: string,
  gcSubscriptionId: string,

  // Billing period tracking (drives rollover + credit grants)
  currentPeriodStart: string,
  currentPeriodEnd: string,

  // Rollover
  rolloverBanked: number,        // sessions carried in from the previous period, already capped

  // Pause
  pausedAt: string | null,
  pauseResumeDate: string | null,
  pauseHistory: [                // for enforcing the 2-per-year cap
    { pausedAt: string, resumeDate: string, requestedAt: string }
  ],

  // Cancellation (1-month notice)
  cancelRequestedAt: string | null,
  cancelEffectiveDate: string | null,   // = requestedAt + 1 month; billing/grants continue until this date

  // Payment health (feeds Needs Attention — see §5)
  paymentFailedAt: string | null,
  lastPaymentStatus: 'confirmed' | 'failed' | null,

  createdAt: string,
  updatedAt: string,
}
```

Immutable after creation (Firestore rules, §6): `clientId`, `trainerId`,
`ratePerSession`, `tier`, `startDate` — matches the existing immutability
pattern already used everywhere else in this schema (`trainerId` on
`workoutPlans`, `exercises`, etc.).

**Why a new top-level collection instead of fields on `users/{clientId}`:**
a client only ever has one active pack-credit balance today
(`totalSessions`/`sessionOffset`), but subscriptions have their own
lifecycle (pause/cancel/period dates) that doesn't belong on the user
profile doc, and a client could plausibly have subscription history
(cancelled one, started a new one later) — a separate collection keeps
that history instead of overwriting it in place.

### `gcConnections/{trainerId}`

```js
{
  trainerId: string,
  gcOrganisationId: string,     // GoCardless organisation id for this trainer
  environment: 'sandbox' | 'live',
  status: 'connected' | 'disconnected',
  connectedAt: string,
}
```

**The GoCardless OAuth access token itself does NOT go in this document.**
It's a bearer credential, not app data — it belongs in **Google Secret
Manager**, one secret per trainer (e.g. `gc-token-{trainerId}`), written
and read only by Cloud Functions via the Admin SDK / Secret Manager
client library, never touched by client-side code or exposed through any
Firestore read path. `gcConnections` itself stays readable by the owning
trainer (so the Profile page can show "Connected ✓ / sandbox") but is
**never client-writable** — the OAuth callback that creates/updates it
runs entirely server-side (a Cloud Function HTTP endpoint handling the
GoCardless OAuth redirect).

### `creditLedger` (existing collection — reused, not replaced)

Subscription monthly grants and rollover both write into the *existing*
append-only `creditLedger` collection (`clientId`, `trainerId`, `date`,
`qty`, `rate`, `addedBy`), the same one pack top-ups already use. This
keeps one single "where did this client's session count come from"
history a trainer can review, instead of a second parallel ledger. New
`addedBy` values (`'subscription-period'`, `'subscription-rollover'` —
though rollover isn't really a separate grant, it's folded into the
period's total qty, see §3) distinguish subscription-driven entries from
manual top-ups.

---

## 3. Monthly Credit Auto-Grant Mechanism (Req 1)

Triggered by a new Cloud Function, `onGcPaymentConfirmed`, listening to
GoCardless's payment-confirmed webhook (via a Cloud Functions HTTPS
endpoint that verifies the GoCardless webhook signature, then processes
the event — GoCardless webhooks are push, not Firestore-triggered, so
this is an HTTP function rather than a `firestore.document()` trigger
like the existing ones).

On each confirmed monthly payment for a subscription:

1. Look up the `subscriptions/{id}` doc via the GC subscription id in the
   webhook payload.
2. If `status === 'paused'` for this period, **skip entirely** — see §4
   for how a paused period never reaches this point in the first place.
3. Compute this period's grant:
   ```
   grant = subscription.tier + subscription.rolloverBanked
   ```
4. Write one `creditLedger` entry: `{ clientId, trainerId, date: today,
   qty: grant, rate: subscription.ratePerSession, addedBy:
   'subscription-period' }` (reusing `addCreditLedgerEntry`'s existing
   shape/semantics).
5. `users/{clientId}.totalSessions += grant` (same pattern
   `addCreditLedgerEntry` already uses for pack top-ups — no new
   mechanism here, just a second caller of the same effect).
6. Advance `subscription.currentPeriodStart`/`currentPeriodEnd` to the
   next month, reset `rolloverBanked` to `0` (the *next* period's rollover
   gets computed fresh at the *end* of the period that's just starting —
   see §4).

---

## 4. Roll-over Calculation (Req 2)

Rollover is computed **at the moment the next period's payment is
confirmed** (i.e., inside the same `onGcPaymentConfirmed` handler, right
before step 3 above overwrites `rolloverBanked`), by looking at the
*period that just ended*:

```
periodBooked = count of schedule docs for this client where
               date >= previousPeriodStart AND date <= previousPeriodEnd
               AND status != 'cancelled'
               (i.e. sessions that actually consumed credit that period —
               reuses the existing deductedAtBooking-aware booking logic,
               no new counter field needed)

unusedThisPeriod = max(0, (subscription.tier + previousRolloverBanked) - periodBooked)
newRollover = min(unusedThisPeriod, floor(subscription.tier / 2))
```

`newRollover` becomes the `rolloverBanked` used in this period's grant
(§3 step 3), and this period's *own* leftover gets computed the same way
one period later. This deliberately derives usage from the existing
`schedule` collection instead of introducing a separate "sessions used
this period" counter — one less piece of state to keep in sync, and it's
exactly the kind of soft/derived computation `CLAUDE.md`'s existing
conventions favor over redundant stored counters.

**Cap examples:** a 4-session tier client who used 0 sessions banks 2
(not 4) into next month; an 8-session tier client who used 5 (3 unused)
banks all 3 since 3 ≤ 4 (the cap); a 12-session tier client who used 2
(10 unused) banks 6 (the cap), forfeiting the other 4.

---

## 5. Pause Data Model & Skip-Charge Mechanism (Req 3)

- **Initiating a pause** (client-facing action, or trainer-assisted):
  writes `status: 'paused'`, `pausedAt: <today>`,
  `pauseResumeDate: <chosen date>`, and appends to `pauseHistory`. Cap
  enforcement (max 2/year) is checked at request time by counting
  `pauseHistory` entries with `requestedAt` in the trailing 12 months
  (rolling window from the request date, not calendar-year, so a client
  who signed up mid-year isn't advantaged/disadvantaged by where Jan 1
  falls — **flagging this as an assumption to confirm with Ani**, since
  the existing early-cancel cap in the credit system instead resets by
  calendar month; a rolling year is the more defensible reading of
  "2 per year" but it's worth her explicit sign-off since it's a policy
  detail, not a technical one).
- **Skipping the charge:** GoCardless subscriptions don't have a
  first-class "skip one payment" API call as far as the public docs
  describe — the two realistic options are (a) call GoCardless's
  subscription-pause endpoint if their Subscriptions API supports it, or
  (b) cancel the current GC subscription and create a fresh one
  scheduled to start on `pauseResumeDate`. **This needs to be verified
  against GoCardless's actual sandbox API during implementation** — it's
  the one part of this design that depends on capabilities I can't
  confirm without hitting their sandbox directly, so I'm not committing
  to one approach yet. Either way, the *Firestore-side* contract is the
  same: while `status === 'paused'`, `onGcPaymentConfirmed` never fires
  for this subscription (because no GC charge occurs), so no code path
  needs an explicit "is this paused" check beyond what naturally follows
  from no webhook arriving.
- **Auto-resume:** a scheduled Cloud Function (`pubsub.schedule` running
  daily) queries `subscriptions` where `status == 'paused' AND
  pauseResumeDate <= today`, flips `status` back to `'active'`, and
  triggers whichever GC mechanism (re-activate vs. recreate, per above)
  was used to pause it.

---

## 6. Cancellation (1-month notice)

- Request writes `cancelRequestedAt: <today>`,
  `cancelEffectiveDate: <today + 1 month>`. Status stays `'active'` — the
  subscription keeps billing and granting credit normally through the
  notice period; this isn't an immediate stop.
- A daily scheduled function flips `status` to `'cancelled'` and cancels
  the GC subscription/mandate once `cancelEffectiveDate` is reached.
- No penalty fields exist because there's no penalty to model — the
  "no exit fee" policy means cancellation just... ends the subscription
  on schedule.

---

## 7. Test Coverage Expansion (Req 4)

New Jest emulator tests, added to `functions/test/` alongside the
existing 12 credit tests (all against the real Firestore emulator, same
harness):

1. Monthly grant, no rollover — base case, `tier + 0` sessions granted,
   `creditLedger` entry written, `totalSessions` incremented correctly.
2. Rollover under the cap — partial usage, next grant = `tier + actual
   unused` (unused < cap).
3. Rollover at the cap — near-zero usage, next grant = `tier + cap`
   (excess forfeited, not banked).
4. Paused period — `onGcPaymentConfirmed` never invoked (or invoked and
   short-circuits) for a paused subscription; zero `creditLedger` writes,
   `totalSessions` unchanged.
5. Auto-resume — scheduled function flips a subscription back to
   `'active'` exactly on `pauseResumeDate`, not before/after.
6. Cancellation notice period — subscription keeps granting credit for
   the full notice month, then the scheduled function correctly flips it
   to `'cancelled'` on `cancelEffectiveDate` and stops.
7. Multi-tenant isolation — a webhook event tagged with trainer A's GC
   connection must never read/write trainer B's `gcConnections` or any
   of trainer B's clients' `subscriptions`/`creditLedger` docs.

This brings the Cloud Functions suite from 12 to roughly 19 tests. Same
`emulators:exec --only firestore ... npm test` harness, no new tooling
needed.

---

## 8. Needs Attention Integration (Req 5)

When a GC payment fails (`payments.failed` webhook event):

- `subscriptions/{id}.lastPaymentStatus = 'failed'`,
  `paymentFailedAt = <today>`.
- Push notification to the trainer immediately (reusing the existing
  `sendPush` helper — same mechanism as `onSessionsLow`), not waiting for
  a dashboard visit.
- `TrainerDashboard.jsx`'s Needs Attention panel gets a new category
  (alongside the existing churn-risk category), styled with the same
  `needs-attention-category`/`needs-attention-item` markup and a `danger`
  severity dot, showing clients whose subscription has
  `lastPaymentStatus === 'failed'`. This reuses the panel's existing
  category-grouping design rather than inventing a new widget — Needs
  Attention already owns "this needs the trainer's action now."

---

## 9. Firestore Rules (Req 6)

```
match /subscriptions/{subId} {
  allow read: if isAuth() && (resource.data.trainerId == request.auth.uid
                                || resource.data.clientId == request.auth.uid);
  allow write: if false;  // Cloud Functions / Admin SDK only — money-moving
                          // state must never be client-writable, including
                          // by the owning trainer
}

match /gcConnections/{trainerId} {
  allow read: if isAuth() && isOwner(trainerId);
  allow write: if false;  // OAuth callback (server-side) only
}
```

New `firestore-tests/` suite (mirroring the `exerciseOverrides.rules.test.js`
pattern already in place): verifies a trainer/client can read their own
`subscriptions` doc, cannot read another trainer's, and that *no* client
context — not even the owning trainer — can write to either collection
directly (only the Admin SDK context in the test, simulating a Cloud
Function, can).

---

## 10. Open Questions For Ani

1. **Pause cap window:** rolling 12 months from request date (my
   assumption above), or calendar year? Doesn't block starting the build,
   but needs an answer before the pause-cap test (§7.5) is finalized.
2. **GC pause mechanism:** sandbox exploration will settle whether
   GoCardless supports pausing a subscription natively vs.
   cancel-and-recreate — no decision needed from Ani here, just flagging
   that this is genuinely unverified until we're in the sandbox.
3. Nothing else blocks starting — pricing, rollover, cancellation, and
   the multi-tenant OAuth direction are all clear enough to build against.

---

## 11. Build Order (once approved)

1. `subscriptions` + `gcConnections` schema, Firestore rules + rules
   tests (no GC calls yet — pure data model, verifiable in isolation).
2. GoCardless OAuth connect flow (Profile page "Connect GoCardless"
   button → Cloud Function HTTP endpoint → Secret Manager write).
3. Mandate creation UI (client-facing "Subscribe" flow → tier picker →
   GC hosted mandate page redirect).
4. `onGcPaymentConfirmed` + `onGcPaymentFailed` webhook handlers +
   Jest emulator tests (§7).
5. Pause/cancel UI + the two scheduled functions (auto-resume,
   auto-cancel-after-notice).
6. Needs Attention integration (§8).
7. Full sandbox UAT pass (mandate → charge → rollover → pause → resume →
   cancel) before any conversation about going live.

Each numbered step ships as its own small commit with build + test
verification, same as every other feature this session — not one large
diff.
