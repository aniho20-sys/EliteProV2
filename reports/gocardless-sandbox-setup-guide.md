# GoCardless Sandbox + Secret Setup Guide

For Ani — everything here is done in a web browser (phone is fine), no
terminal needed. Do the steps in order. Nothing here touches real money: it is
entirely the GoCardless **sandbox** environment.

**Last verified 2026-08-18.** Steps 1–2 were rewritten that day against
GoCardless's own documentation after the original version sent Ani looking for
a "Developer section somewhere" and she ended up on the live signup flow and
its pricing page instead — see `reports/gocardless-access-findings-2026-08-18.md`.
Every URL below was requested and confirmed to respond.

> **You do NOT need GoCardless to approve anything to do this.** Approval
> (compliance checks + a self-assessment review) is a **go-live** gate. Sandbox
> partner apps are self-serve and instant.

---

## 1. Create a GoCardless sandbox account

⚠️ **Do not start from `gocardless.com`.** The Sign up button there is the
**real merchant** signup — it asks for company details and makes you pick a
paid plan. That is the wrong door, and it is what blocked this for two weeks.

The sandbox lives on a completely different host:

1. Go to **https://manage-sandbox.gocardless.com/signup**
   (`/sign-up` works too — both confirmed responding)
2. Enter an email and password
3. Click the verification link in the email
4. You land in the sandbox dashboard

There is **no plan to choose, no card, no price** anywhere in this flow.

Three things to remember:

- **Log back in at `manage-sandbox.gocardless.com`** — the login on the main
  site is the live environment
- **Sandbox data cannot be reset or deleted.** It behaves exactly like a live
  account. To start clean you have to create a whole new sandbox account. Cancel
  test mandates when you are done or the sandbox keeps emailing you
- Sandbox has **all features enabled** by default (live accounts are limited by
  plan)

Test bank details, for later:

| Field | Value |
|---|---|
| Sort code | `20-00-00` |
| Account number | `55779911` |

## 2. Register ElitePro as a partner (OAuth) app

This is what lets ElitePro act on behalf of each trainer who connects their own
GoCardless account, instead of everyone sharing one login.

1. Go straight to
   **https://manage-sandbox.gocardless.com/developers/partners/apps/create**
2. Fill in:
   - **App name**: `ElitePro`
   - **Description**: `Coaching management platform` — Ani's wording
     (2026-09-23). It describes what ElitePro *is*, not one feature of it,
     and a trainer may see it when they connect their own account
   - **Homepage URL**: `https://elitepro-16718.web.app`
   - **Redirect URL** — type/paste it **exactly**, including `https://`:
     ```
     https://us-central1-elitepro-16718.cloudfunctions.net/gcOAuthCallback
     ```
   - **Leave blank** (all marked Optional on the form as of 2026-09-23):
     **Post onboarding URL**, **Payment setup URL**, **Webhook URL**, and leave
     **Webhook client certificate** unticked. None of them is read by any code
     in this repo. The Webhook URL matters most: there is **no GoCardless
     webhook endpoint** in `functions/index.js` yet (checked 2026-09-23), so any
     URL typed there would have GoCardless delivering events to a 404.
     Add it when the webhook handler is built, not before.
   - **"I agree to the terms of the partner agreement"** — required to submit.
     It is a real agreement between Ani's business and GoCardless, even in
     sandbox, and nobody on the agent side has read it. Ani's call.
3. Create the app. You are returned to
   **https://manage-sandbox.gocardless.com/developers/partners**, where the app
   now appears
4. Open it and copy the **Client ID** and **Client Secret**. Keep them somewhere
   safe for step 4 — **do not paste them into chat**; they go straight into
   Google's Secret Manager

> **The redirect URL has to match byte-for-byte.** GoCardless compares the
> `redirect_uri` we send against the list you registered here, as an exact
> string. A trailing slash, `http` instead of `https`, or a different region in
> the hostname all fail the same way. The URL above is not a guess — it was
> requested on 2026-08-18 and again on 2026-09-19, and both times answered with
> a redirect back into our own app, so that is confirmed to be where the
> function is deployed.
>
> ⚠️ **Correction (2026-09-19).** The 2026-08-18 version of this note said that
> request answered `?gc=not-configured` and read that as proof of the
> credentials path. A plain request with no query string cannot reach that
> path: `gcOAuthCallback` checks `if (!code || !state)` and redirects to
> `?gc=error` *before* it ever looks at the credentials
> (`functions/index.js`). So the old note drew the right conclusion about the
> URL from the wrong evidence — and, worse, it would have made a real
> "not configured" state look already-verified. See **How to check whether
> steps 3–5 are already done** below for a probe that actually distinguishes
> the two.
>
> Why that hostname: `gcOAuthCallback` is a 1st-gen HTTP function
> (`functions.https.onRequest` in `functions/index.js`) with no `.region()`
> call, so it sits in the default region **`us-central1`**. If anyone ever adds
> a region setting or moves it to 2nd gen, this URL changes and both this
> registration and the `GC_REDIRECT_URI` secret must be updated with it.

## 3. Enable the Secret Manager API on the project

This is the step that was skipped originally and broke the whole Functions
deploy — Secret Manager had never been turned on for this Google Cloud project.

1. Go to
   **https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=elitepro-16718**
2. Sign in with the Google account that administers the `elitepro-16718`
   Firebase project
3. Click the blue **Enable** button
4. Wait about a minute for the page to show the API as enabled

## 4. Create the three secrets

Still in Google Cloud Console (same Google account as Firebase, different
section of the console):

1. Go to
   **https://console.cloud.google.com/security/secret-manager?project=elitepro-16718**
2. Click **+ Create Secret** three times, once for each row below. Names must
   match exactly — all caps, underscores:

| Secret name | Value |
|---|---|
| `GC_CLIENT_ID` | Client ID from step 2.4 |
| `GC_CLIENT_SECRET` | Client Secret from step 2.4 |
| `GC_REDIRECT_URI` | `https://us-central1-elitepro-16718.cloudfunctions.net/gcOAuthCallback` |

Leave every other option at its default. You should end up with exactly three
secrets on that page.

> `GC_REDIRECT_URI` must be the **same string** you registered in step 2 —
> that is the value the app sends to GoCardless, and GoCardless matches it
> against its own list. Two different strings that both "look right" will fail.

## 5. Give Cloud Functions permission to read/write secrets

1. Go to
   **https://console.cloud.google.com/iam-admin/iam?project=elitepro-16718**
2. Find the row whose email ends in **`@appspot.gserviceaccount.com`** — this is
   the identity Cloud Functions runs as, usually shown as "App Engine default
   service account"
3. Click the **pencil (edit)** icon on that row
4. Click **+ Add Another Role**
5. Add **Secret Manager Admin** — the app both reads the three app-level
   credentials and creates/writes/deletes a per-trainer token secret, so one
   broad role is easier to get right on a first pass than several narrow ones.
   It can be tightened once everything is confirmed working
6. Click **Save**

## 6. No redeploy needed

The functions read these secrets fresh on every call (CLAUDE.md #29), so there
is nothing to redeploy. The moment steps 3–5 are done, `Connect GoCardless`
starts working.

If you want a green CI run to confirm anyway, ask and a no-op commit can be
pushed.

---

## How to check whether steps 3–5 are already done

Before working through this guide, it is worth 10 seconds to find out whether
the secrets already exist. Open this URL in any browser (phone is fine) — it is
a deliberately invalid request, so nothing is created, connected or charged:

```
https://us-central1-elitepro-16718.cloudfunctions.net/gcOAuthCallback?code=probe&state=probe
```

It bounces you to the app's Profile page with one of two markers in the
address bar:

| Where you land | What it means |
|---|---|
| `…/#/profile?gc=not-configured` | The three secrets do **not** exist. Steps 1–5 still to do. |
| `…/#/profile?gc=error` | The secrets **do** exist. The request was rejected later, at the nonce check, which is the correct response to a made-up `state`. |

**Checked 2026-09-19: `?gc=not-configured`** — so as of that date none of
steps 1–5 had been done, and the `Connect GoCardless` button in the app could
only ever have answered "GoCardless isn't set up yet".

---

## What "done" looks like

- Secret Manager lists exactly three secrets: `GC_CLIENT_ID`,
  `GC_CLIENT_SECRET`, `GC_REDIRECT_URI`
- In the app, as a trainer: Profile → **GoCardless Connection** card → tapping
  **Connect GoCardless** opens a real GoCardless sandbox consent page, not an
  error toast
- After approving, you land back on Profile with a confirmation and the card
  reads **Connected · sandbox**

## Traps hit for real on 2026-09-23 (read before the live setup)

The sandbox connection took four attempts. None of the failures was in the
code; all three were in getting the right value from one console to the other.
The live environment will present the same pages, so these will recur:

| Attempt | What went into Secret Manager | Symptom |
|---|---|---|
| 1 | Nothing yet — secrets not created | Connect toast: "not set up yet" |
| 2 | The **label** "Client ID" instead of its value | GoCardless page: "An app with the provided client_id does not exist" |
| 3 | Client secret still wrong — on the app page the secret shows only a **"Reveal" link**, so there is no value on screen until it is tapped | In-app toast (since d128430): *invalid_client* |
| 4 | Revealed secret, copied whole | ✅ Connected · sandbox |

Also on that page: the `AP01M3…` string at the top **with a copy icon** is the
App ID, not a credential. It is the only value with a copy button, which makes
it the most tempting wrong one.

Since d128430 a failed Connect names its cause in the app itself (see the
table below), so none of this needs Cloud Logging any more.

## If it does not work

| Symptom | Likely cause |
|---|---|
| "GoCardless isn't set up yet" | A typo in one of the three secret names, or the step 5 IAM role has not propagated yet (a few minutes) |
| GoCardless shows a redirect-URI error before you approve | The string in step 2 and the `GC_REDIRECT_URI` secret are not identical |
| You land back on Profile with `?gc=error` | The callback ran but something failed server-side — ask and the Cloud Functions logs will say which |
| The signup page asks you to pick a plan | You are on `gocardless.com`, not `manage-sandbox.gocardless.com` — see step 1 |

---

## Sources

- [Partners: connecting your users](https://developer.gocardless.com/partners/connecting-your-users/)
- [Partners introduction](https://developer.gocardless.com/getting-started/partners/introduction/)
- [Sandbox accounts (support)](https://support.gocardless.com/hc/en-us/articles/212553869-Sandbox-accounts)
- `reports/gocardless-access-findings-2026-08-18.md` — the fuller write-up of
  what was verified, including what could not be established (GoCardless
  publishes no timeline for live approval)
