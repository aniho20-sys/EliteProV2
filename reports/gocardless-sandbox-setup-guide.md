# GoCardless Sandbox + Secret Setup Guide

For Ani — everything here is done through a web browser (desktop or mobile),
no terminal/CLI needed. Do these in order. Nothing here touches production
money — this is entirely the GoCardless **sandbox** environment.

A note on accuracy: steps 1–2 are on GoCardless's own website, which I can't
browse live from here — the menu names might differ slightly from what I
describe, but the concept ("create a Partner/OAuth app, get a client ID and
secret") will be there somewhere, usually under Developer/API settings.
Steps 3–5 are on Google's own Firebase/Cloud Console, which is more stable
and I'm confident about the exact paths.

---

## 1. Create a GoCardless sandbox account (if you don't have one)

1. Go to **https://manage-sandbox.gocardless.com/signup**
2. Sign up with your email — this is a completely separate, free sandbox
   account, not connected to any real bank/money.

## 2. Register ElitePro as a GoCardless "Partner" / OAuth app

This is what lets ElitePro create GoCardless mandates on behalf of each
trainer who connects their own account, instead of everyone sharing one
GoCardless login.

1. Log into the sandbox dashboard: **https://manage-sandbox.gocardless.com**
2. Look for a **Developer** or **API** section in the left-hand menu, then
   something like **"Partner integrations"**, **"OAuth apps"**, or
   **"Create app"**. If you can't find it, search GoCardless's help site for
   "OAuth app" or "Partner API" — the sandbox and live dashboards use the
   same layout, so any guide for either applies.
3. Create a new app with:
   - **Name**: `ElitePro`
   - **Redirect URI** (must be typed *exactly*, including `https://`):
     ```
     https://us-central1-elitepro-16718.cloudfunctions.net/gcOAuthCallback
     ```
4. Once created, GoCardless shows you a **Client ID** and **Client Secret**.
   Copy both somewhere safe for the next steps — **do not paste them to me
   in chat**, they go straight into Google's Secret Manager (step 4 below).

## 3. Enable the Secret Manager API on the project

This is the step that was skipped before and broke the deploy — Secret
Manager was never turned on for this Google Cloud project at all.

1. Go to:
   **https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=elitepro-16718**
2. Sign in with the Google account that owns/administers the
   `elitepro-16718` Firebase project.
3. Click the blue **"Enable"** button.
4. Wait about a minute for it to finish — you'll see the page update to show
   the API as enabled.

## 4. Create the three secrets

Still in Google Cloud Console (not GoCardless, not Firebase Console — same
underlying Google account/project, just a different section of the same
console):

1. Go to:
   **https://console.cloud.google.com/security/secret-manager?project=elitepro-16718**
2. Click **"+ Create Secret"**.
3. First secret:
   - **Name**: `GC_CLIENT_ID` (must match exactly — capital letters, underscores)
   - **Secret value**: paste the Client ID from step 2.4
   - Leave everything else as default, click **"Create Secret"**.
4. Repeat **"+ Create Secret"** two more times:
   - **Name**: `GC_CLIENT_SECRET` → value: the Client Secret from step 2.4
   - **Name**: `GC_REDIRECT_URI` → value: the exact same redirect URI from
     step 2.3 (`https://us-central1-elitepro-16718.cloudfunctions.net/gcOAuthCallback`)

You should end up with exactly three secrets listed on that page.

## 5. Give Cloud Functions permission to read/write secrets

1. Go to:
   **https://console.cloud.google.com/iam-admin/iam?project=elitepro-16718**
2. Look down the list for a row whose email ends in
   **`@appspot.gserviceaccount.com`** (this is the account Cloud Functions
   actually runs as) — it's usually named something like "App Engine default
   service account".
3. Click the **pencil (edit)** icon on that row.
4. Click **"+ Add Another Role"**.
5. In the role picker, search for and add:
   - **Secret Manager Admin** (covers reading the app-level credentials
     *and* creating/writing/deleting the per-trainer connection tokens the
     app manages automatically — a single broad role is simpler to set up
     correctly than juggling several narrow ones for a first pass; can be
     tightened later once everything's confirmed working)
6. Click **"Save"**.

## 6. Trigger a redeploy

Once steps 1–5 are done, the next push to the `claude/fitness-app-features-LbxtG`
branch will pick everything up automatically (Cloud Functions reads these
secrets fresh on each call, no redeploy of the *code* is actually required —
but if you want to double check it's all working, just ask and a small
no-op commit can be pushed to re-trigger the CI deploy and confirm green).

## What "done" looks like

- Google Cloud Console's Secret Manager page shows exactly 3 secrets:
  `GC_CLIENT_ID`, `GC_CLIENT_SECRET`, `GC_REDIRECT_URI`.
- In the app, Profile page (as a trainer) → "GoCardless Connection" card →
  tapping **"Connect GoCardless"** takes you to a real GoCardless sandbox
  consent page (not an error toast).
- After approving on GoCardless's page, you land back on the Profile page
  with a "GoCardless connected" confirmation and the card shows
  **Connected · sandbox**.

If "Connect GoCardless" still shows *"GoCardless isn't set up yet"* after
all this, the most likely culprits are: a typo in one of the three secret
names (must match exactly, all-caps with underscores), or the IAM role in
step 5 not having propagated yet (can take a few minutes) — let me know and
I'll check the Cloud Functions logs for the specific error.
