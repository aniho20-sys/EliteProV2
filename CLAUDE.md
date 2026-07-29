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
│   ├── NotificationContext.jsx # FCM push notifications (code ready; Blaze restored 2026-06-22, Functions deployed and live)
│   ├── ThemeContext.jsx       # Light/dark theme toggle (persisted to localStorage)
│   └── ToastContext.jsx       # Toast notification system (3s auto-dismiss; error toasts 6s)
├── data/
│   ├── exercises.js          # Static exercise library (seeded into Firestore)
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
│   ├── IntakeFormPage.jsx            # Client: onboarding questionnaire (PAR-Q style)
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
│   ├── dateUtils.js          # Local timezone-safe date helpers: localToday, localDateAdd, parseLocalDate
│   ├── exerciseUtils.js      # resolveExerciseName(library, id, fallback) — resolves exerciseId (incl. custom-* IDs) to a display name
│   ├── sessionUtils.js       # Session colour/label helpers
│   ├── urlUtils.js           # URL safety validators: isSafeUrl(url), isYouTube(url)
│   └── workoutUtils.js       # Workout set normalisation helpers (UNIT_OPTIONS, emptySet, hasValue, formatSet, etc.)
├── firebase.js               # Firebase init (db, auth exports)
├── App.jsx                   # Root: provider tree + routing + invite code URL parsing + GYMLA_ENABLED flag
└── main.jsx                  # Entry point

functions/                    # Cloud Functions (deployed and live on Blaze) — 9 functions:
├── index.js                  # onAccountDelete, onNewMessage, onNewSchedule, onScheduleUpdate,
│                              # onNewWorkoutPlan, onNewWorkoutLog, onSessionsLow (push to client when
│                              # sessions remaining ≤ 3, push to trainer when ≤ 2), onScheduleBooked +
│                              # onScheduleCreditUpdate (server-side session credit accounting — see
│                              # "Session credit accounting" below)
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
  renewalRate: number,      // £/session — current rate shown to clients renewing early
  renewalRateNext: number,  // £/session — rate once a client's sessions run out first
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
  movementPattern: string,  // optional: Hinge/Squat/Push/Pull/Carry/Locomotion/Rotation, '' = unclassified
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
| `/privacy` | PrivacyPolicyPage (no auth) | PrivacyPolicyPage (no auth) |
| `/terms` | TermsPage (no auth) | TermsPage (no auth) |

gym啦 (operator) routes — `/operator/studios`, `/apply`, `/studios/book` — are gated behind `GYMLA_ENABLED` in `App.jsx` (currently `false`); see convention #25.

Routes are conditionally rendered based on `currentUser.role`. Unknown routes redirect to `/`.

## Firestore Security Rules Summary
- **Auth required** for all reads and writes
- **users**: Any auth can read; self-create own profile; trainer can create/update their clients. `role` field is **immutable after creation** — prevents client→trainer privilege escalation
- **bodyStats**: Only the client or their trainer can read/write; only the client can delete
- **workoutPlans**: Owner trainer or assigned client can read; trainer creates/updates/deletes own plans. `trainerId` is immutable after creation
- **workoutLogs**: Owner client or their trainer can read; clients create and update their own logs; trainers can update logs they created (full fields) or add `trainerNotes` to any client log; **delete is disabled**
- **schedule**: Trainer, client, or any client of the same trainer can read; trainer books for own clients only, client books with own trainer only; `trainerId`+`clientId` are immutable after creation
- **messages**: Sender and recipient can read; sender creates; recipient can only update `read` field; **delete is disabled**
- **exercises**: Trainer reads own; client reads trainer's + personal; any auth can create with valid trainerId; trainer can update/delete own exercises. `trainerId` is immutable after creation
- **exerciseOverrides**: Trainer reads/writes own; client reads their own trainer's (read-only, never writes). `trainerId`+`exerciseId` are immutable after creation
- **templates**: Trainer-only access to own templates. `trainerId` is immutable after creation
- **invoices**: Trainer reads/writes own; client reads invoices addressed to them. `trainerId` is immutable after creation

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
28. **All in-app UI text is English, no exceptions** — buttons, labels, placeholders, toasts, error messages, empty states, modal copy, everything a user (trainer or client) sees in the app must be English. Cantonese is for internal communication with Ani only — team role-play discussion, reports, commit messages — and must never leak into app-facing strings. When writing/reviewing any component, check every literal string rendered to the user
29. **External-service config must never be a deploy-time dependency** — missing/unset credentials for a third-party integration (API keys, OAuth client secrets, webhook signing secrets, etc.) may only ever fail at *call time* (a graceful "not configured yet" error/toast), never at deploy time. Concretely: never use `defineSecret()`/`.runWith({secrets: [...]})` or any other deploy-time-validated binding for a secret whose existence isn't already guaranteed — read it via the SDK (e.g. Secret Manager's `accessSecretVersion`) inside the function body instead, and treat a read failure as "not configured", not a crash. Firebase deploys all Cloud Functions in one codebase as a single unit; one function's deploy-time secret validation failure fails the *entire* `deploy --only functions` step, taking every unrelated function down with it — this happened for real on 2026-07-25 (GoCardless/Phase 3: Secret Manager was never enabled on the project, and `gcOAuthStart`'s `defineSecret()` binding blocked deployment of all 9 pre-existing functions, while Hosting and Firestore Rules deployed fine independently). Same category of rule as #26 (no terminal access) and #27 (no batch-rewrite) — a structural constraint to design around from the start, not a bug to fix after the fact
30. **`window.print()` does not work on iOS Safari — never propose it for mobile print/PDF/export features.** iOS Safari (both regular tabs and standalone home-screen PWAs alike) has never implemented `window.print()` as a JS-callable API — calling it is a silent no-op with zero feedback, on every iOS version, confirmed for real on 2026-07-29 while fixing the invoice Print button. Only desktop browsers (Mac/Windows Safari, Chrome, Firefox, Edge) support triggering print via JS. Since Ani is mobile-only (see #26), any "print" or "save as PDF" feature must use client-side PDF generation instead: `src/utils/invoicePdf.js` is the established pattern — builds a real PDF with `pdf-lib` (dynamically `import()`-ed so it isn't bundled into the route's main chunk, only fetched when a PDF is actually requested), then hands the file to `navigator.share({ files: [...] })` where supported (iOS incl. standalone, most Android) to pop the native Share sheet, falling back to a plain `<a download>` Blob link where file-sharing isn't available (e.g. desktop Chrome). Reuse this module/pattern for any future print/export feature rather than reaching for `window.print()` or writing a second PDF pipeline

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

【3. 待 Ani 拍板】
- 列出議而不決、需要 Ani 決策嘅事項

【4. 下週建議優先次序】
- 由系統分析角度提出嘅下週建議
```

同 CEO 週例會（策略／增長角度，星期四）分開運作——呢個係系統/工程角度嘅週報（星期一）。
