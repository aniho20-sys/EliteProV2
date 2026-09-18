# ElitePro - Fitness Training Platform

## Project Overview
ElitePro is a web-based fitness training platform for personal trainers and their clients. Trainers manage clients, create workout plans, schedule sessions, and communicate with clients. Clients view workouts, log training sessions, track body stats, and message their coach.

See `ROADMAP.md` for the source of truth on development phases (current and future).

## Tech Stack
- **Framework**: React 19 + Vite 8
- **Routing**: React Router v7 (HashRouter)
- **Icons**: Lucide React
- **Backend**: Firebase (Firestore + Firebase Auth)
- **Offline**: IndexedDB persistence via `enableIndexedDbPersistence`
- **Styling**: Custom CSS with CSS variables (light/dark theme)
- **PDF generation**: `pdf-lib` (dynamically imported client-side — see `src/utils/invoicePdf.js`; `window.print()` does not work on iOS Safari, see convention #30)
- **Deployment**: Firebase Hosting via GitHub Actions CI

## Commands
- `npm install` — Install dependencies
- `npm run dev` — Start dev server (port 5173)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint
- `npm run deploy` — Build + `firebase deploy` (all services)
- `npm run deploy:hosting` — Build + deploy Firebase Hosting only
- `npm run deploy:rules` — Deploy Firestore security rules only
- `cd functions && npm run test:emulator` — Cloud Functions Jest suite (credit/booking logic) against the Firestore emulator
- `cd firestore-tests && npm run test:emulator` — `firestore.rules` verification suite (`@firebase/rules-unit-testing`) against the Firestore emulator; separate tooling from the Cloud Functions suite above, run this after any `firestore.rules` change

## Project Structure
```
src/
├── components/
│   ├── EmptyState.jsx        # Reusable empty state (icon + title + desc + CTA action)
│   ├── ErrorBoundary.jsx     # React class error boundary (wraps entire app)
│   ├── ExerciseDetailModal.jsx # Exercise detail/instructions modal (video link, muscle, equipment)
│   ├── ExerciseProgress.jsx  # Per-exercise strength progression chart (auto-selects most-logged exercise; dropdown sorted by session count; Recharts AreaChart + PR badges in history table)
│   ├── GlobalSearch.jsx      # Search bar: clients, exercises, plans
│   ├── InstallPrompt.jsx     # PWA install prompt banner (beforeinstallprompt + iOS fallback)
│   ├── MovementPatternScanner.jsx # Trainer (Profile): runs inferMovementPattern() over the trainer's own unclassified exercises, groups by confidence, writes only the rows they tick
│   ├── MonthlyReportModal.jsx # Trainer: generate monthly progress report (sessions, volume, PRs, body comp, optional fee summary) → browser print to PDF
│   ├── MuscleSelector.jsx    # Muscle group chip selector for exercise targeting
│   ├── Navigation.jsx        # Desktop sidebar (primary + collapsible More with secondary) + mobile top header + bottom nav (primary + More sheet); driven by LINK_DEFS/NAV_CONFIG
│   ├── NotesSection.jsx      # Client notes section component
│   ├── OfflineBanner.jsx     # Banner shown when useOnlineStatus() detects offline
│   ├── PaymentSheetModal.jsx # Client: renewal payment sheet — trainer's bank details (per-row + Copy all), auto reference, rate-lock disclaimer
│   ├── ProgressView.jsx      # Body composition chart + stats grid + history table; shared by ProgressPage & ClientDetailPage
│   ├── SessionDateList.jsx   # Renders a list of session dates (used in monthly report / progress views)
│   ├── Skeleton.jsx          # Loading skeleton components (SkeletonLine/Card/List/StatGrid)
│   └── workout/
│       ├── ActiveWorkoutView.jsx     # In-progress workout UI: exercise list, set inputs, rest timer pill
│       ├── ExerciseSwapModal.jsx     # Swap/add an exercise within a plan or log (incl. Custom tab)
│       ├── SetInputs.jsx             # Per-set input row for all unit types, with remove-set support
│       └── WorkoutCompleteScreen.jsx # Post-save summary: volume, exercises, RPE, new PRs, closing message
├── context/
│   ├── AppContext.jsx         # Global state + all Firestore/Auth operations
│   ├── badgeUtils.js          # Session-count milestone badges (BADGE_MILESTONES, getNewBadges); written to `users/{clientId}.badges` on every workout log save — no UI reads/displays it yet (minimal display UI backlogged, see PROGRESS.md)
│   ├── NotificationContext.jsx # FCM push notifications (code ready; Blaze restored 2026-06-22, Functions deployed and live)
│   ├── ThemeContext.jsx       # Light/dark theme toggle (persisted to localStorage)
│   └── ToastContext.jsx       # Toast notification system (3s auto-dismiss; error toasts 6s)
├── data/
│   ├── exercises.js          # Static exercise library (seeded into Firestore)
│   ├── intakeOptions.js      # Shared GOALS/FREQUENCIES/EXPERIENCES constants for IntakeFormPage + TrainingProfilePage
│   ├── metrics.js            # Body stat metric definitions: METRICS array + EMPTY_STAT_FORM
│   └── sampleData.js         # Demo seed data (ghost clients, plans, logs, etc.)
├── hooks/
│   ├── useOnlineStatus.js    # Tracks navigator.onLine + online/offline events
│   └── useRestTimer.js       # Wall-clock rest timer: sessionStorage persistence, wake listeners, WAV beep via AudioBufferSource + iOS keep-alive
├── pages/
│   ├── LoginPage.jsx                 # Auth: Google, email/password, forgot password
│   ├── RoleSelectPage.jsx            # Post-auth profile creation (role + invite code)
│   ├── LandingPage.jsx               # No-auth marketing landing page at /landing (CSS UI mockups)
│   ├── TrainerDashboard.jsx          # Trainer home: stats overview
│   ├── ClientDashboard.jsx           # Client home: workout summary + body stats
│   ├── ClientsPage.jsx               # Trainer: client list
│   ├── ClientDetailPage.jsx          # Trainer: client detail tabs (overview, progress, plans, logs, notes)
│   ├── ClientProgressOverviewPage.jsx # Trainer: all-clients progress overview with volume, sessions, PR stats + sorting
│   ├── InvoicePage.jsx               # Trainer: invoice creation, management, status tracking
│   ├── BusinessAnalyticsPage.jsx     # Trainer: /analytics — monthly revenue, sessions, 30-day retention, top clients
│   ├── WorkoutPlansPage.jsx          # Create/view workout plans + save-as-template
│   ├── SchedulePage.jsx              # Session scheduling + calendar view
│   ├── MessagesPage.jsx              # In-app messaging (full page)
│   ├── ExerciseLibraryPage.jsx       # Exercise database with search/filter
│   ├── MyWorkoutsPage.jsx            # Client: assigned workout plans
│   ├── WorkoutLogPage.jsx            # Client: log workout sessions (rest timer, unit types, custom exercises, localStorage draft)
│   ├── ProgressPage.jsx              # Client: body composition tab + exercise progression tab
│   ├── IntakeFormPage.jsx            # Client: onboarding questionnaire (PAR-Q style), gated at first login by !intakeCompleted
│   ├── TrainingProfilePage.jsx       # Client: revisit/edit intake answers anytime (route `/training-profile`, linked from Profile) — same questions as IntakeFormPage but single-scroll, no Skip
│   ├── ProfilePage.jsx               # User profile, invite code, account management
│   ├── OperatorDashboard.jsx         # gym啦 (operator): home — gated behind GYMLA_ENABLED
│   ├── StudioManagementPage.jsx      # gym啦 (operator): manage studios + slots — gated behind GYMLA_ENABLED
│   ├── StudioBookingPage.jsx         # gym啦 (trainer): book studio slots — gated behind GYMLA_ENABLED
│   ├── TrainerApplicationPage.jsx    # gym啦: trainer application flow — gated behind GYMLA_ENABLED
│   ├── PrivacyPolicyPage.jsx         # Static privacy policy (no auth required)
│   └── TermsPage.jsx                 # Static terms of service (no auth required)
├── styles/
│   └── index.css             # Global styles (CSS variables, skeleton, empty states)
├── utils/
│   ├── authErrors.js         # Firebase Auth error code → friendly message map
│   ├── currencyUtils.js      # formatCurrency(amount, currencyCode) — single source of truth for money display, see convention #31
│   ├── dateUtils.js          # Local timezone-safe date helpers: localToday, localDateAdd, parseLocalDate
│   ├── exerciseUtils.js      # resolveExerciseName / canonicalExercise (follows mergedInto) / liveExercises (hides tombstones) / inferMovementPattern + explainMovementPattern (keyword classifier, see convention #35)
│   ├── invoicePdf.js         # Client-side PDF generation via pdf-lib (dynamically imported) — see convention #30
│   ├── sessionUtils.js       # Session colour/label helpers
│   ├── urlUtils.js           # URL safety validators: isSafeUrl(url), isYouTube(url)
│   ├── workoutShareUtils.js  # Post-workout share text builder (buildWorkoutShareText, pickClosingMessage) for WorkoutCompleteScreen's native share button
│   └── workoutUtils.js       # Workout set normalisation helpers (UNIT_OPTIONS, emptySet, hasValue, formatSet, etc.)
├── firebase.js               # Firebase init (db, auth exports)
├── App.jsx                   # Root: provider tree + routing + invite code URL parsing + GYMLA_ENABLED flag
└── main.jsx                  # Entry point

functions/                    # Cloud Functions (deployed and live on Blaze) — 13 functions:
├── index.js                  # onAccountDelete, onNewMessage, onNewSchedule, onScheduleUpdate,
│                              # onNewWorkoutPlan, onNewWorkoutLog, onSessionsLow (push to client when
│                              # sessions remaining ≤ 3, push to trainer when ≤ 2), onScheduleBooked +
│                              # onScheduleCreditUpdate (server-side session credit accounting — see
│                              # "Session credit accounting" below); Phase 3 GoCardless: gcOAuthStart
│                              # (callable, builds authorize URL), gcOAuthCallback (public onRequest
│                              # HTTP endpoint — no Firebase Auth context, CSRF-protected via
│                              # gcOAuthNonce.js), gcDisconnect (callable), cleanupExpiredGcNonces
│                              # (daily scheduled function)
├── gcOAuthNonce.js            # CSRF nonce lifecycle for the OAuth flow: createNonce/consumeNonce/
│                              # releaseNonce/finalizeNonce (claim → release-on-failure → finalize-on-success)
├── gcSecrets.js               # Per-trainer GoCardless access tokens + app-level Partner credentials,
│                              # read/written via Secret Manager SDK at call time (never defineSecret —
│                              # see convention #29)
└── package.json

firestore-tests/              # firestore.rules verification (separate from functions/'s Jest suite)
├── exerciseOverrides.rules.test.js  # @firebase/rules-unit-testing — trainer/student read/write matrix
└── package.json

public/
├── firebase-messaging-sw.js  # FCM background notification Service Worker
├── manifest.json             # PWA manifest
├── sounds/                   # timer-done.wav (rest timer completion sound, generated by scripts/generate-beep.cjs)
└── splash/                   # iOS PWA splash screens (auto-generated by scripts/generate-splash.cjs)

scripts/
├── generate-beep.cjs         # Generates public/sounds/timer-done.wav (3-beep ascending pattern)
└── generate-splash.cjs       # Generates iOS splash PNGs into public/splash/ (runs in prebuild)
```

Top-level config files:
- `firebase.json` — Firebase Hosting + Firestore rules + Functions config
- `firestore.rules` — Firestore security rules
- `.github/workflows/firebase-hosting.yml` — CI deploy on push to `claude/fitness-app-features-LbxtG`
- `vite.config.js` — Vite config
- `eslint.config.js` — ESLint flat config

## Firebase Configuration
- **Project ID**: `elitepro-16718`
- **Config**: hardcoded in `src/firebase.js` (public API key — safe for client-side apps)
- **Billing plan**: Blaze (pay-as-you-go) — restored 2026-06-22 after the Free Trial billing account was upgraded to a full paid account and relinked; Cloud Functions deploy verified working again
- **Services used**: Firestore (database), Firebase Auth (authentication), Cloud Messaging/FCM (deployed, live), Cloud Functions (deployed, live)
- **Offline**: IndexedDB persistence enabled; app works without internet after first load

## Authentication Flow
1. **LoginPage** shows: Google Sign-In, email/password (sign-in or sign-up), forgot password
2. After Firebase Auth, `onAuthStateChanged` fires → sets `firebaseUser`
3. If `firebaseUser` exists but no Firestore profile (`needsProfile === true`) → **RoleSelectPage** shown
4. **RoleSelectPage**: user picks trainer or client, enters name, optionally enters trainer invite code → calls `completeProfile()` → creates Firestore `users` doc
5. Once profile exists → `currentUser` is set from Firestore → main app renders

## Firestore Data Model

### Collections

#### `users/{uid}`
```js
{
  id: string,           // = Firebase Auth UID
  name: string,
  email: string,
  role: 'trainer' | 'client',
  avatar: string | null,    // photoURL from Google, or null
  joinDate: string,         // 'YYYY-MM-DD'
  // trainer-only:
  speciality: string,
  inviteCode: string,       // 6-char uppercase alphanumeric
  businessName: string,     // optional — shown on printed invoices, falls back to `name` when unset
  renewalRate: number,      // current rate shown to clients renewing early (unit = `currency` below)
  renewalRateNext: number,  // rate once a client's sessions run out first (unit = `currency` below)
  currency: string,         // one of CURRENCIES (utils/currencyUtils.js) — defaults to 'GBP' when absent, see convention #31
  bankDetails: { accountName: string, sortCode: string, accountNumber: string },
  // client-only:
  trainerId: string | null, // UID of trainer
  age: number,
  height: number,           // cm
  goals: string,
  notes: string,
  totalSessions: number,           // purchased session credit (Top-Up)
  sessionOffset: number,           // used credit — see "Session credit accounting" below
  renewalPrompt3Shown: boolean,    // one-time "3 sessions left" prompt already shown
  renewalPrompt1Shown: boolean,    // one-time "1 session left" prompt already shown
}
```

#### `bodyStats/{clientId}`
```js
{
  entries: [
    {
      date: string,      // 'YYYY-MM-DD'
      weight: number,    // kg
      bodyFat: number,   // %
      chest: number,     // cm
      waist: number,     // cm
      hips: number,      // cm
      arms: number,      // cm
      legs: number,      // cm
    }
  ]
}
```

#### `intakeForms/{clientId}`
Written by `saveIntakeForm(clientId, data)` — both the one-time onboarding gate (`IntakeFormPage.jsx`, forced when `!intakeCompleted`) and `TrainingProfilePage.jsx` (revisit/edit anytime via Profile → Training Profile) write to this same doc/function. Re-saving does not duplicate the `bodyStats` entry — `saveIntakeForm` only auto-logs one on the client's first-ever completion.
```js
{
  clientId: string,
  goals: string[],       // may include the literal 'other'; free text is goalsOther
  goalsOther: string,
  frequency: string,     // one of '1x'..'5x or more'
  experience: string,    // 'Beginner' | 'Intermediate' | 'Advanced' | 'other'
  experienceOther: string,
  injuries: string,       // optional — safety info the trainer should see
  height: number | null,  // cm, optional
  weight: number | null,  // kg, optional
  skipped: boolean,       // true if the client skipped rather than filled it in
  completedAt: string,    // 'YYYY-MM-DD' — last-saved date, overwritten on each edit
}
```

#### `workoutPlans/{planId}`
```js
{
  id: string,
  name: string,
  trainerId: string,
  clientId: string,
  day: string,           // e.g. 'Monday', 'Day 1'
  exercises: [
    {
      exerciseId: string,
      sets: number,
      reps: string,      // e.g. '8-12'
      rest: number,      // seconds
      notes: string,
    }
  ]
}
```

#### `workoutLogs/{logId}`
```js
{
  id: string,
  clientId: string,
  planId: string,        // '' for free workouts
  date: string,          // 'YYYY-MM-DD'
  entries: [
    {
      exerciseId: string,
      unit: 'weight_reps' | 'reps_only' | 'time' | 'distance' | 'weight_distance',  // defaults to 'weight_reps'
      sets: [
        // weight_reps:     { weight: number, reps: number, completed: boolean }
        // reps_only:       { reps: number, completed: boolean }
        // time:            { seconds: number, completed: boolean }
        // distance:        { metres: number, completed: boolean }
        // weight_distance: { weight: number, metres: number, completed: boolean }
      ],
    }
  ],
  notes: string,
  rpe: number,           // 1-10 rate of perceived exertion
  trainerNotes: string,  // trainer-only annotation (trainers can always add this field)
}
```

#### `schedule/{schedId}`
```js
{
  id: string,
  trainerId: string,
  clientId: string,
  date: string,          // 'YYYY-MM-DD'
  time: string,          // 'HH:MM'
  type: string,          // e.g. 'Training Session'
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  notes: string,
}
```

#### `messages/{msgId}`
```js
{
  id: string,
  from: string,          // sender UID
  to: string,            // recipient UID
  text: string,
  timestamp: string,     // ISO datetime
  read: boolean,
}
```

#### `exercises/{exId}`
```js
{
  id: string,
  name: string,
  trainerId: string,     // owning trainer's UID — see note below on docs that omit this field
  muscle: string,        // comma-joined from muscleGroups list
  equipment: string,     // from equipmentTypes list
  movementPattern: string,  // optional: Hinge/Squat/Push/Pull/Carry/Core/Locomotion/Rotation, '' = unclassified
                            // ('Core' added 2026-08-13 with inferMovementPattern(); '' is a legitimate
                            //  answer — e.g. Calf Raise, where the ankle fits none of the eight)
  aliases: string[],     // optional alt. names (e.g. Chinese name/abbreviation) so search matches either
  description: string,
  instructions: string,  // shown to students as "動作要點" (reused as formCues — no separate field)
  commonMistakes: string, // optional, shown to students as "常見錯誤" only when populated
  unit: 'weight_reps' | 'reps_only' | 'time' | 'distance' | 'weight_distance',  // defaults to 'weight_reps' when absent
  videoUrl: string,      // YouTube link plays in-app via iframe embed in ExerciseDetailModal; non-YouTube links open in a new tab
}
```
**Shared default exercises (intentional) — corrected 2026-07-14:** the 22 exercises in `data/exercises.js` (`bench-press`, `squat`, etc.) are **static frontend data, not Firestore documents at all**. `AppContext.jsx`'s exercises listener queries `where('trainerId','==',targetTrainerId)` and appends the imported `defaultExercises` array in-memory to every result (`[...snap.docs..., ...defaultExercises]`) — the 22 never round-trip through Firestore, so there is no document for any trainer to edit or delete. (An earlier version of this note wrongly attributed this to a `firestore.rules` `null == null` loophole — there's no Firestore doc involved at all, so no rule is even evaluated.) Attempting `updateExercise`/`deleteExercise` on one of these 22 ids fails because the target document doesn't exist. This is by design — new trainers get a shared starter library that can't be individually edited — but as of Session 34 trainers can layer personal video/instructions content on top via `exerciseOverrides` (below), without touching the shared base.

#### `exerciseOverrides/{overrideId}`
Lets a trainer customize video/instructions for one of the 22 static seed exercises without a base document to edit directly. Doc ID convention: `${trainerId}_${exerciseId}`. No document exists for an exercise a trainer hasn't customized. Only applies to seed exercises — trainer-created exercises (which have a real `exercises` doc) are edited directly instead.
```js
{
  id: string,
  trainerId: string,        // owning trainer's UID, immutable after creation
  exerciseId: string,       // static seed id (e.g. 'bench-press'), immutable after creation
  videoMode: 'default' | 'custom' | 'hidden',   // absent doc = 'default' for both fields
  videoUrl: string,          // only meaningful when videoMode === 'custom'
  instructionsMode: 'default' | 'custom' | 'hidden',
  instructions: string,      // only meaningful when instructionsMode === 'custom'
}
```
`AppContext.getExercises()` merges the current trainer's (or client's own trainer's) overrides onto the 22 seed exercises at read time, so every page that lists exercises via `getExercises()` picks up the customization automatically — no per-page changes needed.

#### `invoices/{invoiceId}`
```js
{
  id: string,
  trainerId: string,
  clientId: string,
  clientName: string,
  amount: number,        // in currency units (e.g. HKD)
  currency: string,      // e.g. 'HKD'
  status: 'draft' | 'sent' | 'paid' | 'overdue',
  issueDate: string,     // 'YYYY-MM-DD'
  dueDate: string,       // 'YYYY-MM-DD'
  description: string,
  items: [{ description: string, quantity: number, unitPrice: number }],
}
```

#### `templates/{templateId}`
```js
{
  id: string,
  trainerId: string,
  name: string,
  day: string,
  exercises: [
    { exerciseId: string, sets: number, reps: string, rest: number, notes: string }
  ],
}
```

#### `creditLedger/{entryId}`
Append-only top-up history — one entry per top-up, never updated/deleted (corrections are a new entry).
```js
{
  id: string,
  clientId: string,
  trainerId: string,
  date: string,      // 'YYYY-MM-DD'
  qty: number,        // sessions added
  rate: number | null,// £/session charged for this top-up
  addedBy: string,    // trainer UID
}
```

#### `subscriptions/{subscriptionId}` (Phase 3 — schema + rules live, no creation UI yet)
Firestore-Function-write-only (`allow write: if false`); see `reports/phase3-subscription-design.md` for the full design. No documents exist yet — subscription creation/mandate flow is unbuilt.
```js
{
  id: string,
  clientId: string,
  trainerId: string,
  tier: 4 | 8 | 12,             // monthly session quota
  ratePerSession: number,       // locked at signup — immutable after creation
  monthlyAmount: number,        // derived at creation, stored for display/audit
  status: 'active' | 'paused' | 'past_due' | 'cancelled',
  startDate: string,            // 'YYYY-MM-DD'
  provider: 'gocardless' | 'stripe',   // which processor holds this subscription
  providerAuthorisationId: string,     // GoCardless: mandate id · Stripe: payment_method id
  providerSubscriptionId: string,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  rolloverBanked: number,
  pausedAt: string | null,
  pauseResumeDate: string | null,
  pauseHistory: [{ pausedAt: string, resumeDate: string, requestedAt: string }],
}
```

#### `paymentConnections/{trainerId}` (Phase 3 — live)
Non-sensitive GoCardless connection metadata, written server-side only by `gcOAuthCallback`/`gcDisconnect` via the Admin SDK (bypasses `allow write: if false`). The actual OAuth access token never touches Firestore — see `functions/gcSecrets.js`.
```js
{
  trainerId: string,
  provider: 'gocardless' | 'stripe',
  providerAccountId: string | null,   // GoCardless: organisation id · Stripe: stripe_user_id
  environment: 'sandbox' | 'live',
  status: 'connected' | 'disconnected',
  connectedAt: string,      // ISO datetime
  disconnectedAt: string,   // ISO datetime, present after a disconnect
}
```

#### `oauthNonces/{nonce}` (Phase 3 — live)
CSRF protection for the OAuth flow — never client-readable or writable (`allow read, write: if false`), created/consumed entirely server-side via `functions/gcOAuthNonce.js`'s claim → release-on-failure → finalize-on-success lifecycle. Doc id is the 256-bit random nonce itself.
```js
{
  trainerId: string,
  createdAt: string,     // ISO datetime
  expiresAt: string,     // ISO datetime, 10 minutes after createdAt
  used: boolean,         // true once claimed by gcOAuthCallback
  claimedAt: string | null,
}
```

## State Management (AppContext)
`AppContext` is the single source of truth. It subscribes to all Firestore collections with real-time `onSnapshot` listeners when a user is authenticated. All reads and writes go through context functions.

### Auth state
- `firebaseUser` — raw Firebase Auth user (undefined = checking, null = unauthenticated, object = authenticated)
- `currentUser` — Firestore profile object (null when not logged in)
- `authReady` — `firebaseUser !== undefined` (auth check complete)
- `needsProfile` — `firebaseUser` exists but no Firestore profile yet → show RoleSelectPage
- `loading` — true while Firestore listeners are fetching initial data (tracks 8 collections: users, bodyStats, workoutPlans, workoutLogs, schedule, messages, exercises, invoices)

### Available context functions
```js
// Auth
signInWithGoogle()           // popup with redirect fallback for iOS Safari
signUpEmail(email, password)
signInEmail(email, password)
sendPasswordReset(email)
completeProfile(role, name, inviteCode)  // creates Firestore user doc
logout()
deleteAccount()              // deletes Firestore profile + bodyStats + Firebase Auth user

// Users
getClients(trainerId)        // returns client users for a trainer
getClient(clientId)
updateClient(clientId, updates)
removeClient(clientId)       // sets trainerId to null (detaches client from trainer)

// Credit Ledger
getCreditLedger(clientId)    // async — fetches append-only top-up history, newest first
addCreditLedgerEntry(clientId, { qty, rate })  // logs a top-up, adds sessions, resets renewal prompt flags

// GoCardless Connection (Phase 3, trainer-only)
getPaymentConnection(trainerId)  // async — one-off fetch of paymentConnections/{trainerId}, not a live listener
startGcConnect()             // calls gcOAuthStart, returns the GoCardless authorize URL to redirect to
disconnectGc()                // calls gcDisconnect

// Badges (write path only — see src/context/badgeUtils.js, no display UI yet)
checkAndAwardBadges(clientId) // async — called from WorkoutLogPage on every log save; returns newly-earned badges

// Intake Forms (client's own training profile — onboarding + TrainingProfilePage edits)
saveIntakeForm(clientId, data)  // async — sets intakeCompleted:true; only auto-logs a bodyStat entry on first-ever completion
getIntakeForm(clientId)          // async — fetches the client's saved intakeForms doc, or null

// Body Stats
getBodyStats(clientId)       // returns entries array (sorted by date)
addBodyStat(clientId, stat)
updateBodyStat(clientId, entryId, updates)
deleteBodyStat(clientId, entryId)

// Workout Plans
getWorkoutPlans({ clientId?, trainerId? })
addWorkoutPlan(plan)
updateWorkoutPlan(planId, updates)
deleteWorkoutPlan(planId)

// Workout Logs
getWorkoutLogs(clientId)
addWorkoutLog(log)
updateWorkoutLog(logId, updates)  // trainer adds trainerNotes; clients edit their own logs

// Schedule
getSchedule({ trainerId?, clientId?, date? })
getTrainerSchedule(trainerId)    // returns all schedule items for a trainer
addScheduleItem(item)
updateScheduleItem(itemId, updates)
deleteScheduleItem(itemId)

// Messages
getMessages(userId)          // returns all messages involving userId
sendMessage(from, to, text)
getUnreadCount(userId)
markMessagesRead(userId, otherUserId)

// Session Stats (for session quota tracking)
getSessionStats(clientId)    // returns { used, total, offset, colour, label }

// Personal Records
getPersonalRecords(clientId) // returns { exerciseId: { weight, date } }

// Exercises
getExercises()               // returns Firestore + static exercises, merged with the current trainer's exerciseOverrides
addExercise(exercise)
updateExercise(exerciseId, updates)
deleteExercise(exerciseId)
upsertExerciseOverride(exerciseId, { videoMode?, videoUrl?, instructionsMode?, instructions? })  // trainer-only; only applies to the 22 static seed exercises
deleteExerciseOverride(exerciseId)  // "reset to default" — removes the override doc entirely
muscleGroups                 // string[] constant
equipmentTypes               // string[] constant

// Invoices (trainer-only write; client can read their own)
getInvoices(trainerId)
addInvoice(invoice)
updateInvoice(invoiceId, updates)
deleteInvoice(invoiceId)

// Templates (trainer-only)
getTemplates()               // returns all templates for current trainer
saveAsTemplate(plan)         // saves a workout plan as a reusable template
deleteTemplate(templateId)

// Invite Codes
getInviteCode(trainerId)     // generates + saves if missing
findTrainerByCode(code)
connectToTrainer(clientId, inviteCode)

data                         // raw { users, bodyStats, workoutPlans, workoutLogs, schedule, messages, exercises, invoices }
```

### Other contexts
- **ThemeContext**: `{ theme, toggleTheme }` — `'light'` | `'dark'`, persisted to `localStorage` key `elitepro_theme`, applied via `data-theme` attribute on `<html>`
- **ToastContext**: `addToast(message, type?, duration?)` — `type` is `'success'` (default), `'error'`, or `'info'`; auto-dismisses after 3s, except `'error'` toasts which dismiss after 6s (override either with explicit `duration`)
- **NotificationContext**: FCM push notification management — token registration, foreground message handling, permission request. Blaze billing was restored 2026-06-22 and Cloud Functions deploy succeeded; push notifications are live

## Routing
Uses `HashRouter` (required for Firebase Hosting SPA compatibility).

| Route | Trainer | Client |
|-------|---------|--------|
| `/` | TrainerDashboard | ClientDashboard |
| `/clients` | ClientsPage | — |
| `/clients/:clientId` | ClientDetailPage | — |
| `/progress-overview` | ClientProgressOverviewPage | — |
| `/invoices` | InvoicePage | — |
| `/analytics` | BusinessAnalyticsPage | — |
| `/plans` | WorkoutPlansPage | WorkoutPlansPage |
| `/schedule` | SchedulePage | SchedulePage |
| `/messages` | MessagesPage | MessagesPage |
| `/exercises` | ExerciseLibraryPage | ExerciseLibraryPage |
| `/profile` | ProfilePage | ProfilePage |
| `/my-workouts` | — | MyWorkoutsPage |
| `/log` | — | WorkoutLogPage |
| `/progress` | — | ProgressPage |
| `/training-profile` | — | TrainingProfilePage |
| `/privacy` | PrivacyPolicyPage (no auth) | PrivacyPolicyPage (no auth) |
| `/terms` | TermsPage (no auth) | TermsPage (no auth) |

gym啦 (operator) routes — `/operator/studios`, `/apply`, `/studios/book` — are gated behind `GYMLA_ENABLED` in `App.jsx` (currently `false`); see convention #25.

Routes are conditionally rendered based on `currentUser.role`. Unknown routes redirect to `/`.

## Firestore Security Rules Summary
- **Auth required** for all reads and writes
- **users**: Any auth can read; self-create own profile; trainer can create/update their clients. `role` field is **immutable after creation** — prevents client→trainer privilege escalation
- **bodyStats**: Only the client or their trainer can read/write; only the client can delete
- **intakeForms**: Owner client or their trainer can read; only the owner client can create/update. **Delete is disabled**
- **workoutPlans**: Owner trainer or assigned client can read; trainer creates/updates/deletes own plans. `trainerId` is immutable after creation
- **workoutLogs**: Owner client or their trainer can read; clients create and update their own logs; trainers can update logs they created (full fields) or add `trainerNotes` to any client log; **delete is disabled**
- **schedule**: Trainer, client, or any client of the same trainer can read; trainer books for own clients only, client books with own trainer only; `trainerId`+`clientId` are immutable after creation
- **messages**: Sender and recipient can read; sender creates; recipient can only update `read` field; **delete is disabled**
- **exercises**: Trainer reads own; client reads trainer's + personal; any auth can create with valid trainerId; trainer can update/delete own exercises. `trainerId` is immutable after creation
- **exerciseOverrides**: Trainer reads/writes own; client reads their own trainer's (read-only, never writes). `trainerId`+`exerciseId` are immutable after creation
- **templates**: Trainer-only access to own templates. `trainerId` is immutable after creation
- **invoices**: Trainer reads/writes own; client reads invoices addressed to them. `trainerId` is immutable after creation
- **subscriptions**: Trainer or client owner can read; Cloud-Function-only writes (`allow write: if false`)
- **paymentConnections**: Owner trainer only can read; Cloud-Function-only writes (Admin SDK bypasses the rule)
- **oauthNonces**: No client read or write at all — created/consumed entirely server-side

## Styling Conventions
- All styles live in `src/styles/index.css`
- CSS variables defined on `:root` and overridden for `[data-theme="dark"]`
- Key variables: `--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--primary`, `--accent`, `--danger`
- Utility classes: `card`, `btn`, `btn-primary`, `btn-outline`, `btn-danger`, `btn-sm`, `btn-icon`, `form-input`, `form-textarea`, `form-label`, `form-group`, `form-row`, `tag`, `tag-primary`, `tag-accent`, `modal`, `modal-overlay`, `modal-actions`, `page-header`, `page-title`
- Empty state classes: `empty-state`, `empty-state-compact`, `empty-state-icon-wrap`, `empty-state-title`, `empty-state-desc`, `empty-state-action`
- Skeleton classes: `skeleton-line`, `skeleton-circle`, `skeleton-card` (uses `skeleton-shimmer` keyframe animation)
- Layout: `.app-layout` (sidebar + main), `.sidebar`, `.mobile-header`, `.bottom-nav`
- No CSS-in-JS, no Tailwind — extend `index.css` for new styles

## Component Patterns
- All components are function components (except `ErrorBoundary` which is a class component)
- State: local `useState` for UI state, `useApp()` for data
- Always call `useApp()` to access data and actions — never import `db` or `auth` directly in pages
- Async operations in event handlers: `setLoading(true)` → `try/catch` → `setLoading(false)` in `finally`
- **All Firestore writes MUST be awaited** with try/catch — never fire-and-forget (audited in Phase 1 Step 8)
- **Double-submit protection**: use `saving`/`sending` state to disable buttons during async ops
- Errors shown inline (not thrown) in forms; use `useToast()` for non-form feedback
- `useNavigate` from react-router-dom for programmatic navigation
- **Empty states**: use `<EmptyState icon={...} title="..." description="..." action={{...}} />` — never inline empty markup
- **Loading states**: use `<SkeletonCard />`, `<SkeletonList />`, `<SkeletonStatGrid />` from `Skeleton.jsx`

## Invite Code System
- Trainers have a unique 6-char uppercase alphanumeric invite code (stored on their Firestore profile)
- Clients enter the code during registration (RoleSelectPage) or later (ProfilePage)
- `connectToTrainer(clientId, code)` sets `trainerId` on the client's profile
- **Shareable link**: `https://elitepro-16718.web.app/#/?invite=XXXXXX` — App.jsx parses `?invite=` from hash on startup and saves to `sessionStorage`; RoleSelectPage reads it on mount to auto-fill the code and pre-select the client role

## Deployment
- **Primary**: Firebase Hosting at `https://elitepro-16718.web.app`
- **CI branch**: `claude/fitness-app-features-LbxtG` — this is the single source of truth
- **Auto-deploy**: GitHub Actions (`.github/workflows/firebase-hosting.yml`) triggers on every push to `claude/fitness-app-features-LbxtG` → builds + deploys to Firebase Hosting
- **Firestore rules**: deploy with `npm run deploy:rules`
- **Required secrets** (GitHub): `FIREBASE_SERVICE_ACCOUNT`

## QA Test Accounts (permanent — do not delete)
Created 2026-07-14 to verify multi-tenant isolation (e.g. `exerciseOverrides`) with a second real trainer identity, since Ani only has her own production account. Both are real accounts in the live `elitepro-16718` project (not the emulator) — created via the same client-side self-signup + self-profile-write flow any real user goes through (`createUserWithEmailAndPassword` + `users/{uid}` self-create), so they behave exactly like genuine accounts.

| Role | Email | UID | Notes |
|---|---|---|---|
| Trainer | `test-coach-b@elitepro.test` | `zY3mbXFAXoaYvGxEQwH15zTZtOF3` | Invite code `QATEST` |
| Client | `test-student-b@elitepro.test` | `fuV7SB6tBAVcCYKSiU20Yv9fwdk1` | `trainerId` set to the coach account above |

Passwords were shared with Ani directly in chat, not recorded here — store in a password manager. Keep these two accounts permanently for future multi-tenant/isolation testing (required before any Phase 5 venue-marketplace work, where a second trainer identity becomes load-bearing for testing cross-tenant boundaries).

## Git Workflow Rules
- **Work directly on `claude/fitness-app-features-LbxtG`** — do NOT create new branches
- All changes must be committed and pushed to `claude/fitness-app-features-LbxtG`
- If work was done on a separate branch, merge it into `claude/fitness-app-features-LbxtG` before considering it complete
- Pushing to `claude/fitness-app-features-LbxtG` automatically triggers Firebase Hosting deployment via CI

## Key Conventions for AI Assistants
1. **Never bypass AppContext** — all Firestore reads/writes must go through context functions, not direct `db` imports in components
2. **Check Firestore rules** before adding new write operations — rules enforce role and ownership constraints
3. **Demo data is scoped** — when adding new collections, seed data should be prefixed with `${trainerUid}-` for demo isolation
4. **IDs are `Date.now()` strings** — e.g. `plan-${Date.now()}`, `log-${Date.now()}`; not UUIDs
5. **`markLoaded` tracks 8 collections** — current set: users, bodyStats (manual), workoutPlans, workoutLogs, schedule, messages, exercises (manual), invoices. If adding a new Firestore collection listener, increment the threshold in `markLoaded` (`loadedRef.current.size >= N`)
6. **Toast not alert** — use `useToast()` for user feedback, never `alert()`
7. **HashRouter** — links must be hash-compatible; no server-side route handling
8. **Theme** — respect CSS variables; add new color values as variables, not hardcoded hex
9. **No localStorage for app data** — `ThemeContext` uses localStorage for theme; `WorkoutLogPage` uses it for in-progress draft only. All persisted app state lives in Firestore
10. **workoutLogs and messages cannot be deleted** — Firestore rules set `allow delete: if false`; handle this in reset/cleanup flows
11. **Always await Firestore writes** — wrap in try/catch with error toast; never fire-and-forget
12. **Use EmptyState component** for empty data views — import from `components/EmptyState.jsx`; pass Lucide icon, contextual description, and actionable CTA
13. **Use Skeleton components** for loading states — import from `components/Skeleton.jsx`
14. **Double-submit protection** — all forms/buttons that trigger Firestore writes must use a `saving`/`sending` state to disable during async ops
15. **Push notifications active** — `NotificationContext` + Cloud Functions are deployed and live since Blaze billing was restored on 2026-06-22 (Free Trial billing account upgraded to paid and relinked). CI's "Deploy Functions" step (`firebase-hosting.yml`) hard-fails the workflow again on deploy errors
16. **Exercise unit types** — exercises and log entries carry a `unit` field (`'weight_reps' | 'reps_only' | 'time' | 'distance' | 'weight_distance'`); set shapes differ per unit. Use `normalizeSets` from `workoutUtils.js` to normalise legacy sets
17. **Unit type UI** — use `.log-unit-pill` / `.log-unit-picker` CSS classes for pill-button unit selectors; never use a `<select>` for unit type
18. **Date helpers** — always use `localToday()` / `localDateAdd()` / `parseLocalDate()` from `utils/dateUtils.js` for date strings; never use `new Date().toISOString().split('T')[0]` (returns UTC, wrong for non-UTC timezones)
19. **URL safety** — always validate external URLs with `isSafeUrl(url)` from `utils/urlUtils.js` before rendering links or iframes
20. **Body composition UI** — use `<ProgressView clientId={...} canDelete onAdd={...} onEdit={...} />` as the canonical body composition view; never inline duplicate chart/table/modal markup
21. **Exercise progression UI** — use `<ExerciseProgress clientId={...} />` for per-exercise strength charts; it reads logs internally via `useApp()`, auto-selects the most-logged exercise, and sorts the dropdown by session count
22. **Immutable fields in Firestore updates** — `trainerId`, `clientId`, and `role` must never change after creation; all update rules in `firestore.rules` enforce this
23. **Navigation architecture** — `Navigation.jsx` defines a single `LINK_DEFS` map (icon + label per route) and a per-role `NAV_CONFIG` (`trainer`/`client`/`operator`, each with `desktop.{primary,secondary}` and `mobile.{primary,more}` route arrays). Desktop sidebar renders `primary` links plus a collapsible "More" section for `secondary`; mobile bottom nav renders `primary` (4 items) plus a "More" sheet for `more`. Keep primary nav to ≤4-5 items; add new features to `secondary`/`more`
24. **Workout utilities** — `UNIT_OPTIONS`, `emptySet(unit)`, `hasValue(s, unit)`, `formatSet(s, unit)` are all exported from `utils/workoutUtils.js`; never redefine them locally in pages
25. **gym啦 feature flag** — gym啦 (operator role, studios, slot booking, trainer applications) is gated behind `GYMLA_ENABLED` in `App.jsx`. While `false`, operator routes/`/apply`/`/studios/book` are hidden and `operator` users get the `client`/trainer-equivalent nav. Code is preserved — flip the flag to re-enable
26. **Never assume Ani has terminal/CLI access** — Ani uses the app on mobile only. Any feature that would otherwise require Ani to run a script, export via Firebase CLI, or use `firebase-admin` locally must instead be built as an in-app UI action (e.g. a button that copies data to clipboard as JSON for Ani to paste back). Do not propose or build terminal-dependent workflows for Ani
27. **Historical Firestore data is never batch-rewritten** — features that consolidate/rename records referenced elsewhere (e.g. merging duplicate exercises referenced by `workoutPlans`/`workoutLogs`) must use a soft-merge + read-time-resolution pattern (mark the old doc with a pointer like `mergedInto: <winningId>`, then have lookups follow that pointer) instead of rewriting `exerciseId`-style references across existing documents. This keeps the operation reversible and never mutates historical logs
28. **All UI text is rendered through `t()` from an English source dictionary; Chinese exists only in `src/i18n/zh-HK.js`.** (Revised 2026-09-02 for the Traditional Chinese rollout — see `reports/i18n-proposal-2026-09-02.md`. Until then this rule read "all UI text is English, no exceptions", and every string in the app still *is* English at source.) Every string a user can see — buttons, labels, placeholders, toasts, errors, empty states, modal copy — is a key in `src/i18n/en.js`, written in English, and rendered via `t('key')` from `useLanguage()`. **Never hardcode Chinese in a component**, and in a file listed in `TRANSLATED_FILES` (`eslint.config.js`) never hardcode English either — `react/jsx-no-literals` is enforced there, because a bare string in a translated page is a sentence the Chinese user will never see translated. `zh-HK.js` holds only translations Ani has approved line by line (written Traditional Chinese, Hong Kong vocabulary — the register rules are in that file's header and `src/i18n/dictionary.test.js` checks them mechanically); a key missing from it falls back to English by design, and a raw key is never rendered (`t()` returns English, else `''` in production). Cantonese remains the language of internal communication — reports, commit messages, role-play — and never reaches a dictionary. **One documented exception to "never hardcode Chinese":** the language picker's own options (`src/components/LanguagePicker.jsx`) are written literally as `English` and `繁體中文`, because each option must be readable in the language it selects — a person who cannot read the current language still has to be able to switch away from it, and putting those two labels through `t()` would rename them both into whichever language they are already stuck in. `src/i18n/dictionary.test.js` pins this so nobody "fixes" it
29. **External-service config must never be a deploy-time dependency** — missing/unset credentials for a third-party integration (API keys, OAuth client secrets, webhook signing secrets, etc.) may only ever fail at *call time* (a graceful "not configured yet" error/toast), never at deploy time. Concretely: never use `defineSecret()`/`.runWith({secrets: [...]})` or any other deploy-time-validated binding for a secret whose existence isn't already guaranteed — read it via the SDK (e.g. Secret Manager's `accessSecretVersion`) inside the function body instead, and treat a read failure as "not configured", not a crash. Firebase deploys all Cloud Functions in one codebase as a single unit; one function's deploy-time secret validation failure fails the *entire* `deploy --only functions` step, taking every unrelated function down with it — this happened for real on 2026-07-25 (GoCardless/Phase 3: Secret Manager was never enabled on the project, and `gcOAuthStart`'s `defineSecret()` binding blocked deployment of all 9 pre-existing functions, while Hosting and Firestore Rules deployed fine independently). Same category of rule as #26 (no terminal access) and #27 (no batch-rewrite) — a structural constraint to design around from the start, not a bug to fix after the fact
30. **`window.print()` does not work on iOS Safari — never propose it for mobile print/PDF/export features.** iOS Safari (both regular tabs and standalone home-screen PWAs alike) has never implemented `window.print()` as a JS-callable API — calling it is a silent no-op with zero feedback, on every iOS version, confirmed for real on 2026-07-29 while fixing the invoice Print button. Only desktop browsers (Mac/Windows Safari, Chrome, Firefox, Edge) support triggering print via JS. Since Ani is mobile-only (see #26), any "print" or "save as PDF" feature must use client-side PDF generation instead: `src/utils/invoicePdf.js` is the established pattern — builds a real PDF with `pdf-lib` (dynamically `import()`-ed so it isn't bundled into the route's main chunk, only fetched when a PDF is actually requested), then hands the file to `navigator.share({ files: [...] })` where supported (iOS incl. standalone, most Android) to pop the native Share sheet, falling back to a plain `<a download>` Blob link where file-sharing isn't available (e.g. desktop Chrome). Reuse this module/pattern for any future print/export feature rather than reaching for `window.print()` or writing a second PDF pipeline
31. **Money must always be displayed via `formatCurrency(amount, currencyCode)` from `utils/currencyUtils.js`** — never hand-roll `.toFixed(2)` or `.toLocaleString()` for an amount, and never hardcode a currency symbol (a 2026-07-29 audit found a real bug: `PaymentSheetModal.jsx` hardcoded "£" regardless of the trainer's actual invoicing currency). A trainer's default currency lives on their profile as `currency` (defaults to `'GBP'` when absent — see `users/{uid}` schema above) and is editable in Profile → Renewal Pricing. Invoices carry their own per-invoice `currency` field instead, since a trainer's invoices aren't assumed to share one currency. `CURRENCIES` (the supported list) is also exported from `currencyUtils.js` — don't redeclare it locally
32. **Workout logs and session status are two completely independent things — neither may ever trigger the other.** A client logging a workout in `WorkoutLogPage` is *their own* training record, including sessions they did alone at the gym with no coach involved. It must **never** mark a `schedule` doc `completed`, and must **never** spend a session credit. The one and only path that completes a session is the trainer pressing **Mark Complete** in the recap modal (`SchedulePage.jsx` / `TrainerDashboard.jsx` — both `isTrainer`-gated); from there the existing credit logic in `onScheduleCreditUpdate` applies. This is deliberate product design by Ani, not an oversight: the client-side log is a personal training diary, the session is a paid commercial appointment, and conflating them would silently charge clients for workouts they did on their own time. Reject "optimisations" of the form *"the client logged a workout that day, so let's auto-complete the matching session"* — a 2026-08-01 audit confirmed there is currently **zero** coupling (`WorkoutLogPage.jsx` never imports `updateScheduleItem`; `addWorkoutLog()` writes only `workoutLogs`; `onNewWorkoutLog` only sends a push), and the `GUARDIAN:` describe block in `functions/test/bookSession.test.js` fails loudly if anyone reintroduces it. That failure is correct — revert the change, don't update the test.

33. **Credit overdraft is capped at exactly one session, and the debt is always recorded server-side.** A client at `remaining === 0` may book one more session on credit; at `remaining === -1` booking is blocked (`OVERDRAFT_LIMIT` in `utils/sessionUtils.js`). Overdraft is represented purely as `remaining` (= `totalSessions - sessionOffset`) going negative — no separate "owed" field. Repayment therefore needs no code: a top-up raises `totalSessions`, so `remaining` moves from `-1` to `qty - 1` by the existing arithmetic. The debt entry (`creditLedger` `{type:'overdraft', qty:-1}`) is written by `onScheduleBooked` **inside the same transaction as the deduction** — never client-side, because `firestore.rules` only lets a trainer create `creditLedger` docs and a client recording their own debt would be wrong regardless. Early-cancelling an overdrawn booking appends `{type:'overdraft_reversed', qty:+1}` rather than deleting the debt entry, keeping the ledger append-only (#27) while still summing to the client's real balance. The cap is enforced **server-side in `onScheduleBooked`** (a booking that would exceed it is deleted and never charged), with the `SchedulePage.jsx` checks kept as the UX layer only. It was briefly client-side-only; real-device testing on 2026-08-02 showed that is not sufficient even for honest users — `remaining` there comes from a listener that lags the trigger, so two quick taps both pass the check and reach -2. Do not remove the server-side check on the grounds that "the UI already blocks it".

34. **`AppContext`'s `users` array holds only people already related to the signed-in user — never treat it as a directory of all users.** It is assembled from two listeners, `where('id','==',uid)` (own doc) and `where('trainerId','==',uid)` (own clients), plus a separate listener for a client's own trainer that is itself gated on `currentUser.trainerId` already being set. So for a trainer it means *me + my clients*, and for a client it means *me + my coach* — and for a client who hasn't connected to anyone yet it means **just me, one document**. Any feature that has to find a user the current user has **no relationship with yet** therefore cannot resolve it from this array and must issue a real Firestore query. This is not a style preference: `connectToTrainer()` looked codes up in the in-memory array, which for an unconnected client can never contain the trainer, so every valid invite code returned "Invalid invite code" and **no new student could ever connect to a coach** — the bug shipped in the original implementation and survived until real-device testing on 2026-08-04 (see `reports/invite-code-bug-2026-08-04.md`). Phase 5's venue marketplace is the next thing that will walk into this, since browsing studios, discovering coaches, and booking a venue are all by definition lookups of users/venues you have no relationship with yet — design those against Firestore queries from the start, not against `data.users`. When you do add such a query, prefer a **single-field** equality query (Firestore auto-indexes every single field) over multiple equality filters, which can require a composite index that won't exist in production and will fail at runtime exactly like a missing record; filter the remaining conditions in JS.

35. **Any inference or auto-classification must turn "confidently wrong" into "I don't know — ask".** When a heuristic (keyword matcher, auto-tagger, smart default, suggested value) can produce a wrong answer that is indistinguishable from a right one, suppress it and return "no result" instead. A blank that reaches a human is cheap; a confident wrong answer that gets bulk-approved is silent bad data. This came out of `inferMovementPattern()` on 2026-08-13: the approved keyword lists put `kickback` under Hinge and `curl` under Pull, so "Tricep kickback" and "Leg curl" each matched exactly one keyword and were therefore scored **high confidence** — and high confidence is precisely the bucket Ani approves in bulk without reading row by row. Both were wrong (a tricep kickback is a push, a leg curl is knee flexion). The fix was `KEYWORD_BLOCKERS` in `utils/exerciseUtils.js`: a keyword is ignored when a contradicting word appears in the same name, which drops those names to zero matches and routes them to a human. Note the shape of the trap — the danger was not the wrong answer itself but that it was wearing a **high-confidence badge**, so the review step designed to catch it was the very step that waved it through. When you build a confidence score, audit what lands in the top bucket, not just the bottom one. Corollary: **an empty result is a legitimate final answer.** Calf Raise stays unclassified because the ankle is none of the eight patterns, and Ani's ruling was that blank beats forcing it into the nearest wrong pattern — do not "improve" this later by inventing a fallback.

36. **A UI change is not verified by a static mockup or a screenshot — only by interacting with it on a real device.** Rendering the real CSS against real data proves the thing *looks* right; it proves nothing about whether taps do anything. Two of this project's worst bugs both shipped and survived for weeks behind exactly this gap, and both were eventually caught by Ani tapping on an iPhone rather than by any review: (a) the Exercise Library filter chips were **dead from the day the collapsible redesign landed** (`b67cf69`, 2026-07-24) and were signed off on a static mockup screenshot that checked list density — a `position: sticky` + `z-index` wrapper sealed the dropdown's z-index inside its own stacking context, so a transparent root-level backdrop painted over it and ate every tap on an option, for about three weeks; (b) the invite code lookup failed 100% of the time from the original implementation and was never exercised end to end (see #34). So: for any change that adds or moves an interactive element, the acceptance step is a real tap on a real phone, and the reviewer states which interactions were actually performed. Never write "verified" on the strength of a build passing, a screenshot, or a unit test of a pure function. Related traps this rule exists to catch: **stacking contexts** (`position` + `z-index`, `transform`, `filter`, `opacity < 1` all create one — a child's z-index is only ever compared against its siblings inside that context, never against elements outside it), and overlays/backdrops that are transparent and therefore invisible while still being fully hit-testable.

37. **Self-review checklist — run it before writing and again before handing work over, and report per item.** Ani should not have to ask for this; it is the standing bar for every code change. Nothing is delivered until all seven pass. If one fails, rewrite and re-check rather than delivering with a caveat.

    1. **Error cases handled** — no network, empty input, wrong format. Every Firestore write awaited in try/catch with a user-visible failure (#11), every submit button guarded against double-submit (#14).
    2. **Nothing hardcoded that should not be** — passwords, API keys, paths, URLs. Colors go through CSS variables (#8), money through `formatCurrency` (#31), secrets are read at call time from Secret Manager (#29). *Known deliberate exception: the Firebase config in `src/firebase.js` is a public client-side key and stays literal — do not "fix" it.*
    3. **No duplicated logic** — reach for the existing shared helper before writing a second copy (`ProgressView` #20, `ExerciseProgress` #21, `workoutUtils` #24, `activityUtils`, `sessionUtils`, `dateUtils`). Two implementations of one rule will disagree eventually; that is exactly how the log-only activity bug shipped twice.
    4. **A newcomer can read it** — do the variable names say what the value means? `daysSinceLog` holding a value that includes sessions is the kind of name that invites the next bug.
    5. **Boundaries exercised: zero, one, many** — and the empty case has a real `EmptyState` with an action (#12), not blank space.
    6. **Tests exist, or the reason they do not is stated explicitly** — "it is covered by an existing test" and "this is presentation-only" are acceptable reasons; silence is not. A test that has never failed proves nothing, so a regression guard must be shown to fail against the bug it guards (the pattern in `functions/test/bookSession.test.js` and `src/utils/renewalPrompt.test.js`).
    7. **No other convention in this file is violated** — in particular #26 (never assume Ani has a terminal), #27 (never batch-rewrite historical data), #28 (all UI text in English), #29 (external config never blocks deploy).

    **Reporting rule:** when handing work over, say per item *how it was verified* — the command run, the case tried, the file checked. "Passes" on its own is not a report, and neither is a checklist of ticks with no evidence behind them.

    **Where this stops:** items 5 and 6 do not license claiming a UI change works. Per #36, an interactive change is only verified by a real tap on a real device, which an agent cannot do — so the self-review closes everything checkable from here, and the device check stays an explicit outstanding item handed to Ani rather than being quietly counted as passed.

38. **Automated tests never touch the production Firebase project — they run against the emulator, always.** On 2026-06-13/14 a test run created roughly 91 accounts (`testtrainer<epoch_ms>@example.com`, `testclient<epoch_ms>@example.com`) directly against `elitepro-16718`. The script was never committed — written, run, deleted inside one session — so nothing in the repo records that it happened, and Ani discovered it more than two months later while asking who all these people were. Real damage: the `users` collection carries 91 rows of junk; the founding-member counter read "0 places left" before a single real trainer had arrived, because it counted trainer documents; and had `onNewTrainerSignup` existed at the time it would have pushed 37 alerts to her phone. The only reason nobody real was affected is that `example.com` is IANA-reserved and cannot receive mail — luck, not design. This repo already has two emulator suites (`functions/`, `firestore-tests/`); there is never a reason to point a test at production. Corollary for throwaway scripts of any kind: a script that writes anything must state which project it targets before it runs, and a scratch script that touched production must be reported to Ani in the same reply, not silently deleted. Related: derive "how many customers do we have" from an event you control (`platformEvents`), never from a raw document count, because a document count includes every account anything has ever created.

39. **Training vocabulary is data, not UI — it is never translated, and `t()` is built so it cannot be.** Exercise names (Bench Press, RDL, Turkish Get Up), sets / reps / kg / RPE / tempo, the muscle / equipment / movement-pattern tags, and anything a trainer typed themselves (plan names, notes) render directly from the data and never pass through `t()`. Ani's ruling (2026-09-02): the Hong Kong gym floor speaks English for all of this, and a translated "深蹲" reads as *less* natural than "Squat" to the people the app is for. The enforcement is structural rather than a request to remember: `t()` accepts only a literal key (`no-restricted-syntax` in `eslint.config.js` — `t(exercise.name)` is a lint error), the dictionaries have no `exercise.*` / `muscle.*` / `unit.*` namespace, and `src/i18n/dictionary.test.js` walks the seed library and every tag list and fails if any of them appears in either dictionary. The target picture, in Ani's words: a Hong Kong student opens the app and sees 「今日課堂」「剩餘堂數 7」, and inside it is still "Bench Press 8 reps × 3 sets". Sibling of #27 (never rewrite data) — this is "never *re-label* data"

## Future Considerations — Venue Marketplace (Phase 5)

ElitePro will later expand into a venue booking marketplace (studios renting dead hours to coaches). To keep this path open:

- Sessions should support an optional `venueId` field in the schema (nullable for now). Do not hardcode location assumptions into session or booking logic.
- The booking engine, cancellation policy engine, and transaction ledger should stay generic enough to be reused for venue bookings, not coupled tightly to student sessions.
- A future "studio owner" user role will be added — avoid design decisions that assume only coach/student roles exist.
- Build as a module INSIDE this repo (same Firebase project, same auth), never as a separate codebase.

See `ROADMAP.md` for the full Phase 5 write-up (trigger condition, business model, key principles).

## Team Structure

### Owner
Ani 係公司 Owner 兼真人決策者。所有商業、產品、定價、Roadmap 優先次序嘅最終決定權喺 Ani。所有 AI 角色（包括 CEO 角色）只提供分析同建議，唔可以擅自落實商業決策或未經確認嘅重大改動。

### 角色定義

**CEO（策略顧問）**
產品驅動型思維。負責 Roadmap 優先次序分析、商業模式評估、定價建議嘅最終整合。收集員工X嘅市場資料後向 Ani 提交建議，由 Ani 拍板。

**員工A（SA - 系統分析）**
App 邏輯、資料庫設計、功能流程。主持每週例會，出週報。

**員工B（Dev - 核心開發）**
編寫程式碼、API 串接。唔鍾意 over-engineer。

**員工C（Reviewer - 審核）**
Code Review：Bug、安全性、效能。零容忍爛 code。

**員工D（UI/UX - 設計）**
介面、配色、排版，運用心理學效應優化體驗。遵循 ElitePro 視覺風格（dark luxury、金色 accent）。

**員工E（QA - 測試與合規）**
搵 Bug、寫測試報告、SAR 等合規問題。悲觀但有建設性。

**員工F（Security - 滲透測試）**
以 paranoid hacker 思維工作：假設每個 input 都係惡意、每個 endpoint 都會被濫用。模擬攻擊、審視認證機制、Firestore rules、資料保護。

**員工X（Marketing - 市場推廣）**
網絡營銷策略、Landing Page 文案、社交媒體推廣、用戶增長、競品分析。定價方面只出建議同市場數據，交 CEO 角色整合，Ani 決定。

**⭐ 職責擴充（2026-09-16，Ani 指示）：唔止出方向，要出成品。** 任何對外行動 —— 帖文、訊息、email、DM 回覆、客戶問題嘅答法 —— 員工X 要交一份 **Ani copy 就用得** 嘅完整文字，唔係「建議用痛點角度切入」呢種方向性描述。一份寫住「用真實痛點分享」嘅建議，同一段 Ani 可以直接貼出去嘅文字，中間隔住嘅嗰步就係一直冇人做、於是成件事一直冇發生嗰步。連埋要交：預先寫定嘅常見反應回覆模板（包括「幾錢？」「有幾多人用緊？」呢類），同埋冇人覆嘅下一步。

### 運作模式

自動崗位（有 trigger 自己開工）：
- 員工A：逢星期一 10:00 週會 Routine，出週報
- 員工C + 員工F：每個 PR 自動 review（GitHub Actions）
- 員工X：逢星期五 Marketing 週報 Routine

候命崗位（Ani 指派先開工）：
- 員工B：由 GitHub issue 或 Ani 指示觸發
- 員工D、員工E、CEO：Ani 召喚先參與

### Working Rules
- 內部討論用廣東話（繁體字）
- 發言前標註職位，例如 [員工B - Dev]
- 涉及商業決策、刪除資料、對外發佈嘅動作，必須停低等 Ani 確認
- 議而不決嘅事項列入週報「待 Ani 拍板」一欄

## CEO 週例會（每逢星期四自動觸發）

當收到「🗓️ CEO週例會」觸發信號時，CEO 必須即時主持例會，格式如下：

```
[CEO] 📋 本週例會開始

【1. App 改善】
- 審視上週有咩用戶痛點未解決
- 有咩現有功能可以優化體驗
- 技術債或 Bug 需要優先處理？

【2. 用戶增長】
- 本週有咩推廣行動可以執行？
- Founding Members 進度如何？
- 有冇新嘅獲客渠道可以嘗試？

【3. 本週行動清單】
- 列出用戶今週最重要嘅 3 件事
- 每件事要有明確嘅完成標準
```

例會結束後由主管總結，確認行動清單。

## 員工A 週會（每逢星期一 10:00 自動觸發）

當收到「🗓️ 員工A週會」觸發信號時，員工A（SA）必須即時主持週會、出週報，格式如下：

```
[員工A - SA] 📋 本週系統週報

【1. 系統狀態】
- 本週有咩改動／deploy（功能、bug fix、rules/Functions 更新）
- 現有 Bug 或技術債狀態

【2. 各崗位進度】
- 員工B/C/D/E/F/X 本週工作摘要（如適用）

【3. 本週你要做嘅三件事】★ 唔可以省略
- 具體到「坐低十分鐘做得完」。「推進 Phase 3」唔算，
  「開 WhatsApp 貼呢段字俾三個人」先算
- 三件之中最少一件要係推進性質（唔係維護、唔係修 bug）
- 每件必須有：第一步實際動作（撳邊度／去邊個網站）、
  完成標準、預計時間
- 要寫嘢（訊息／帖文／email）就附完整成品，Ani copy 就用得

【4. 上週講過但未做】★ 唔可以省略
- 對返 reports/BACKLOG.md
- 列出拖咗超過兩星期嘅項目同拖咗幾耐
- 唔准用「進行中」呢類字眼蒙混過去

【5. 待 Ani 拍板】
- 列出議而不決、需要 Ani 決策嘅事項

【6. 下週建議優先次序】
- 由系統分析角度提出嘅下週建議
```

同 CEO 週例會（策略／增長角度，星期四）分開運作——呢個係系統/工程角度嘅週報（星期一）。

## 員工X Marketing 週報（每逢星期五自動觸發）

當收到「🗓️ 員工X週報」觸發信號時，員工X（Marketing）必須即時出週報，格式如下：

```
[員工X - Marketing] 📣 本週 Marketing 週報

【1. 上週行動交數】
- 上一份週報「下週行動」入面每一項：做咗 / 未做 / 做咗但冇效果
- 未做嘅要講原因
- 唔准跳過呢一節重新開一張新清單

【2. 數字】
- Founding Member 數目（今週新增 / 累計）
- 新註冊數、邀請碼用咗幾多次
- 冇數字就寫「0」，唔可以用觀察填數

【3. 市場情報】
- 競品 / 定價 / 文案，只寫「會改變我哋做法」嗰啲
- 純資訊而唔改變任何行動嘅，唔使寫
- 數字同上週唔同（例如競品定價變咗）必須明講變咗幾多同點解，唔可以靜靜雞換數
- 未經證實嘅消息要標明「未證實」

【4. 下週行動（最多 3 項）】
- 每項要有負責人同完成標準
- 呢啲下星期五要喺第 1 節逐項交數
```

**寫之前必須先讀**：上一份 `reports/marketing-report-*.md`（先至交到數）同最新一份 `reports/CEO-meeting-*.md`（星期四嘅決定優先於本報告嘅建議）。

**點解要有第 1 節同第 2 節**（2026-08-08 加入，唔好刪）：原本呢個 Routine 喺 CLAUDE.md 只有一行「逢星期五 Marketing 週報」，冇任何格式，員工X 自己發明咗一個四節結構，四節全部係「觀察」，冇一節係交數。結果連續五份週報寫得好睇但零轉化——`2026-08-07` 嗰份原封不動重覆咗 `2026-07-31` 嘅行動（「揀 2-3 個活躍教練群，完成標準：本週鎖定名單」），冇交代上次做咗未；同一份報告寫「landing page 唔急於本週執行」，但隔一日前嘅星期四 CEO 會已經將 landing page 文案定為行動二；競品入門價由 $20 跳到 $29.98 冇任何說明。問題唔係員工X 唔勤力，係個格式冇要求佢交數、亦冇要求佢睇返上週同其他崗位嘅嘢。


40. **注入 bug 去驗證一條 guard test 之前，必須先證明個注入真係改到檔案 —— 見到綠燈唔可以當「guard 冇牙」。** 常規 #37 第 6 項要求每條 regression guard 都要示範佢真係 fail 得到（唔係「跑得過就算」），但示範本身都會有 bug，而佢失敗嘅方式係**靜靜雞扮成功**：注入冇改到嘢 → test 照樣綠 → 結論寫成「呢條 guard 捉唔到」→ 於是去改一條本身冇問題嘅 test，甚至索性當佢冇用刪咗。**個假訊號同真訊號一模一樣，兩者都係一片綠。**

    2026-09-06 實例：驗證 `src/i18n/coverage.test.js` 嗰條「債務只可以跌唔可以升」嘅 guard，用 `sed` 喺 `TrainerDashboard.jsx` 插一句英文，跑完 38/38 全綠。差啲就寫低「呢條 guard 捉唔到債務增長」。實際原因係 class 名揀錯咗 —— 檔案入面係 `stat-pill-label`，`sed` 寫咗 `stat-label`，**一個字元都冇改到**。改啱之後即刻紅（`gained 1 untranslated string(s) (59 -> 60)`）。

    所以注入之後、跑 test 之前，**必須有一步確認注入生效**，而且要係機械式嘅，唔可以靠肉眼睇 `sed` 指令：`git diff --stat` 見到行數變咗、`grep -c '<注入嘅字串>'` 返回 ≥1、或者 `diff` 原檔同改後檔。確認唔到就係注入寫錯咗，唔係 guard 有問題。

    同樣道理適用於任何「證明呢個機制捉得到」嘅動作：暫時改壞 `firestore.rules` 一個 collection 名、暫時 revert 一個修正、暫時整壞一個 config。**每一次都要先證明「壞」真係壞咗。**

    呢個係第二次靠注入驗證揪到真問題（第一次係 Analytics guardian，實測過注入 bug 會 fail 先至收貨），所以注入驗證本身要保留；要修嘅係佢缺少嘅嗰一步確認，唔係取消佢。

41. **Routine session 只見到自己嗰條 branch —— 所以「某份報告冇出過」呢類結論，查完其他 branch 先可以落筆。** 每次 Routine fire 都會開一個新 session，而個 session 嘅 outcome branch 係環境層面指派嘅（`session_request.config.outcomes[].git_repository.git_info.branches`，Marketing 係 `claude/affectionate-cerf`、員工A 係 `claude/magical-wright`，每次再加一個隨機 suffix）。個 session 只 checkout 得到自己嗰條，睇唔到上一次 fire 留低嘅 branch，所以上一份報告喺佢眼中**根本唔存在**。

    後果唔止係「漏咗一份報告」，係**之後每一份都對錯數**：`marketing-report-2026-08-28` 寫「08-21 嗰份完全冇出過」、`marketing-report-2026-09-11` 寫「09-04 嗰份完全冇出過」—— 兩份都真係出咗，分別困喺 `claude/affectionate-cerf-ap1i7r` 同 `claude/affectionate-cerf-l56ut9`。第 1 節「上週行動交數」係對住一份唔存在嘅報告交數，於是連續兩次將「已經做咗」判做「冇做過」。同一個病亦令 `SA-report-2026-09-07` 寫低咗一句錯嘅結論（話 `qlhyuu` 條 branch 有 invite code / overdraft 修復未入主線；實際 diff 顯示嗰條 branch 由 merge-base 起計只有一個週報 commit，而且主線已經有）。

    所以任何形式嘅「查唔到記錄 → 所以冇發生過」都唔成立，**除非查咗全部 remote branch**。實際做法：`git branch -r` **唔夠**（佢只列本地已 fetch 嘅 remote-tracking ref，一個單 branch clone 度會得一兩條，睇落好似冇其他 branch），要用 **`git ls-remote --heads origin`** 直接問遠端。呢個分別喺 2026-09-11 真係害過一次：用 `git branch -r` 得出「遠端得 2 條 branch、冇隱藏分支」嘅結論交咗俾 Ani，`git ls-remote` 一問實際有 15 條。

    寫「未做」「冇出過」「冇記錄」之前，先答到「我查咗邊啲 branch」。查唔到就寫「**無法確認**」，唔好寫「冇做過」——`marketing-report-2026-09-11` 第 1 節就係咁寫嘅，係啱嘅做法。

42. **每個 session 開工第一件事：收割孤兒 branch。** 呢個係常規 #41 嘅配套動作 —— #41 講「唔好亂下結論」，呢條講「實際要做咩」。唔係靠人記得，係開工程序。

    **步驟**（唔好慳，唔好用 `git branch -r`）：

    ```
    git ls-remote --heads origin              # 問遠端拎真實 branch 清單
    # 見到未見過嘅 claude/affectionate-cerf-* 或 claude/magical-wright-*：
    git fetch --depth=1 origin <branch>
    git ls-tree -r --name-only FETCH_HEAD reports/   # 睇有冇主線冇嘅檔案
    git checkout FETCH_HEAD -- reports/<檔名>        # 有就收返落主線
    ```

    收完 commit 落主線，commit message 寫明來源 branch。**唔使刪條 branch** —— 刪唔到（session 嘅 git proxy 拒絕 delete ref，2026-09-12 試過 4 次 backoff 全部 `remote end hung up`），而且收割完之後嗰條 ref 係純垃圾，唔影響任何嘢。

    **點解要收割而唔係修根因**：Routine 嘅 outcome branch 係環境層面指派，三條路全部行唔通 —— 改 prompt 冇用（Ani 改過，branch 照開）；`update_trigger` API 對 `created_via: http_api` 嘅 Routine **全部欄位**拒絕（唔止 prompt，單獨改 cron 都唔得）；Routines UI 根本冇呢個欄位（Ani 2026-09-15 入到 routine 檢視頁撳晒所有位，包括 Runs with 嗰行同標題旁邊個箭嘴，冇任何編輯入口）。刪咗重建有機會白費，仲會失去 run history，所以唔做。收割係已知可行嘅做法：2026-09-12 一次過攞返四份（marketing 08-21 / 09-04 / 09-11、SA 09-07）。

    **⚠️ Routine 嘅觸發時間係啱嘅，唔好「修」佢。** `0 9 * * 1` / `0 9 * * 5` 係 UTC，Ani 本地係 GMT+1，UI 顯示 "Every Monday at 10:00 AM GMT+1" —— 同上面「逢星期一 10:00」完全一致。2026-09-12 有 agent 假設咗 Ani 用香港時間，得出「實際係下午 5 點」呢個結論，改壞咗 CLAUDE.md 四處，仲累 Ani 去 UI 查證。**cron 讀出嚟嘅 UTC 值要換成邊個時區，係一個要問嘅問題，唔係可以推斷嘅嘢**；而 Ani 覆述你自己講過嘅數字，唔算佐證。

43. **`reports/BACKLOG.md` 係單一待辦清單，新決定即刻入,唔准等下次週報。** 呢條係 2026-09-16 Ani 開嘅案：八個崗位全部「等佢問先答、等佢批先做」,佢兩個月時間全部用喺維護,零推進。根因唔係冇人做嘢,係**決定同批准散落喺五十份報告度,冇一個地方答到「而家究竟積咗幾多嘢等我」**。

    **三條規矩：**

    1. **即時寫入。** 任何新決定、新批准、新 flag,喺同一個回合寫入 BACKLOG,唔好講「下次週報會記低」。週報係**對返** BACKLOG,唔係 BACKLOG 嘅來源。
    2. **三個狀態,冇第四個**：🔴 等 Ani 做 / 🔵 等 agent 做 / ⚫ 已過時可以剷。**冇「進行中」** —— 一件事唔係等人,就係死咗。過時嗰批要明確標明可以剷,唔好扮緊仲有效。
    3. **⭐ 任何 🔴「等 Ani 做」嘅項目,唔可以只寫「做 X」。** 必須連埋：
       - **第一步實際動作** —— 撳邊度、去邊個網站、開邊個 app。唔係「聯絡教練」,係「開 WhatsApp,揀三個做緊私教嘅人,逐個貼下面段字」
       - **完整成品** —— 要寫任何嘢（訊息、帖文、email、回覆）就由員工X 草擬好,Ani copy 就用得（見上面員工X 職責擴充）
       - **預先列出障礙同應對** —— 對方會問咩、佢唔覆點算、Ani 開唔到口點算
       - **完成標準** —— 可以答「做咗未」嘅二元條件,唔係「有進展」

    **點解第 3 條係重點**：`marketing-report-2026-07-31` 到 `2026-09-11` 之間,「FB 教練群第一篇分享帖」連續排咗**五次**,每次都寫「Ani 出帖 / 員工X 出文案」,五次都冇人交過一段實際文案。個行動唔係冇做,係**由頭到尾冇存在過一個可以執行嘅版本**。

    **一個反覆出現嘅錯要特別記住**：寫「等 Ani 做」嘅第一步之前,**唔好推斷佢嘅處境**。2026-09-16 員工A 由 `PRODUCT.md`「herself a trainer」推斷 Ani 有同行網絡,寫咗一個「WhatsApp 搵三個教練朋友」嘅方案 —— Ani 人喺**英國**,自己 studio 教,真係唔識其他教練,成個方案作廢。同一個根因喺 09-12 出過一次（假設佢用香港時區,實際 GMT+1）。**佢人喺邊、識邊啲人、喺邊度教,全部係要問嘅嘢,唔係可以由 repo 推斷嘅嘢。**

44. **Ani 一問就答到嘅嘢,直接問 —— 唔好列做「Ani 要去撳嘅待辦」。** 分界唔係「難定易」,係**資訊定動作**：

    | 類型 | 例 | 點做 |
    |---|---|---|
    | **資訊** —— Ani 腦入面已經有 | 幾多個學生、新註冊數、「你試過未」、「你撳咗未」、「你用邊個 gym」 | **喺同一個回合直接問佢** |
    | **動作** —— 要佢郁手 | 撳合併、真機驗收、出帖、Android 測試 | 先係 🔴 BACKLOG 項目 |

    **點解要寫落嚟**：`marketing-report-2026-08-14` 到 `2026-09-11`,**連續五份**週報第 2 節寫「Founding Member / 新註冊 / 邀請碼使用次數：**攞唔到**（冇 production 存取權）」,同時連續五次將「讀返 Platform Stats 實數」排入 Ani 嘅待辦。2026-09-17 Ani 一句就答咗：**教練 1（佢自己）、學生 9**。

    個數由頭到尾存在,五份報告有一節係空嘅,而空嘅原因唔係攞唔到,係**冇人問**。Ani 原話：「連續五份週報寫『攞唔到』其實係你哋睇唔到 production,唔係個數唔存在 —— 應該直接問我。」

    **「本 session 冇 production 存取權」係一個關於 agent 嘅事實,唔係一個關於個數嘅事實。** 寫「攞唔到」之前先答：呢樣嘢 Ani 知唔知？佢知就問,唔好寫「無法確認」然後排佢做嘢。

    同樣適用於**狀態**,唔止數字：「FB 帖出咗未」「invite code 試過未」「landing page 撳過未」—— `marketing-report-2026-09-11` 三項全部寫「無法確認,呢個 session 冇任何管道知道做咗未」。三項都係 Ani 一句答得到。

    **例外**：一個數字如果係**要準確到唔可以靠記憶**（例如對數、審計、要寫入 code 嘅值）,就唔可以淨係問 —— 要佢喺 app 度讀。但呢種情況要講明點解唔可以靠記憶,唔係預設。

45. **`npm run build` 捉唔到 undefined variable —— 驗證 i18n／import／hook 改動要用 `npx eslint <檔案>`。** 2026-09-18 實測，唔係推論：

    | 驗證方法 | 漏咗 `useLanguage` import 嘅 `App.jsx` |
    |---|---|
    | `npm run build` | **✓ built in 512ms** —— 零 error，完全捉唔到 |
    | `npx vitest run src/i18n/` | **134 條全綠** —— 兩個 suite 都係靜態掃檔案，永遠唔會 render component |
    | `npx eslint src/App.jsx` | 🔴 **`'useLanguage' is not defined  no-undef`** |

    Vite 唔做 undefined-variable 分析,所以一個 import 漏咗會照樣 build 成功、照樣 deploy、照樣喺用戶部電話變成白畫面。2026-09-18 就係咁 ship 咗一次：Ani 開 app 見到 ErrorBoundary「Can't find variable: useLanguage」。

    **eslint 仲會捉到 build 同 test 都睇唔到嘅第二類 bug**：同一次 run 報咗 `React Hook "useLanguage" is called conditionally` —— 個 hook 被加咗喺 early return **之後**,即使 import 修好咗都仍然係壞嘅。**加 `const { t } = useLanguage()` 一律放喺 component 第一行**,唔好跟住其他 `const` 排落去,因為 `AppRoutes` 呢類 component 中間有 early return。

    ⚠️ `npm run lint` 有 226 個 pre-existing error（2026-08-04 凍結）,所以跑全套睇唔出新錯 —— **跑 `npx eslint <你改過嘅檔案>` 逐個檔案,睇 exit code**。

    **連帶嘅教訓（同 #40 同一個形狀,但今次係自己犯）**：當時嘅「驗證」係 `print("App.jsx:", "useLanguage" in t)`。但嗰個 script 已經喺同一個檔案加咗 `const { t } = useLanguage()`,所以個字串一定喺度,個 check 永遠 True。**驗證咗一件同要驗證嘅事無關嘅嘢,然後見到 True 就當成功。** 驗證 import 就要 grep `^import.*<名>`,唔係 grep 個名。

46. **Ani 做完嘅嘢唔會留低 git 記錄 —— 所以出任何「等你做」清單之前，先問邊啲已經做咗。** 佢做嘅嘢全部係撳掣、真機測試、出帖、同人傾偈,冇一樣會出現喺 repo 度。Agent 見唔到,唔等於冇發生 —— 呢個同常規 #44 係同一個根,但係一個**獨立嘅 failure mode**：#44 講「資訊要問」,呢條講「**已經排落待辦嘅嘢,要問佢做咗未先至再排一次**」。

    2026-09-18 實例：出咗一份「等你做：七件」嘅清單,排住 landing page 真機驗收（拖 1 個月）同撳動作合併（拖 1 個月）。Ani 一句：「**2、3 我之前做左架喇,我發現個問題就係我做完嘅野你當我冇做**」。兩件都做咗,而個清單由頭到尾冇問過。

    **規矩**：出「等你做」清單之前,同一個回合先問「呢幾項邊啲已經做咗？」。佢答完先出清單。一份把已完成項目當未做嘅清單,比冇清單更差 —— 佢要逐條幫你 debug 你嘅記錄。

    **收到「我做咗」就即刻寫入 BACKLOG**（常規 #43 第 1 條）,唔好等下次週報。標明「Ani <日期> 話做咗」,唔係靜靜雞刪走 —— 下一個 agent 要睇得出呢件事發生過同幾時。

    **⚠️ 第二部分：Ani 否決過嘅嘢,唔准自己搵個新理由重開。**

    同一日嘅第二個實例。FB 教練群 Ani 2026-09-08 否決（「Facebook 冇乜人用」）,我剷咗。之後我發現佢人喺英國,就**自己推論**「英國 PT 圈嘅 FB group 好活躍」,把佢由過時區重開做第一優先。09-18 佢再否決一次：「**1 果到我咪話左冇乜人用 fb**」。

    佢第一次否決嘅時候冇講「因為香港」—— 係我加上去嘅限定,然後用「換咗市場」做理由推翻佢。**一個人講「呢樣嘢冇用」,唔需要附理由先算數,而你幫佢補嘅理由唔係佢嘅理由。**

    重開一個被否決嘅項目,只有一個合法條件：**Ani 自己講**。唔算數嘅有：換咗市場、換咗地區、換個平台但同一個邏輯、「情況同上次唔同」、搵到新數據。

    **連帶**：連續兩次出錯方案之後,唔好出第三個估。2026-09-18 兩個 outreach 方案（WhatsApp 搵同行、FB group）都係由 repo 推論 Ani 嘅人際處境,兩次都作廢。第三次應該係問佢,或者老實擱住,而唔係再估一次等佢再否決。
