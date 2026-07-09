# ElitePro - Fitness Training Platform

## Project Overview
ElitePro is a web-based fitness training platform for personal trainers and their clients. Trainers manage clients, create workout plans, schedule sessions, and communicate with clients. Clients view workouts, log training sessions, track body stats, and message their coach.

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
  muscle: string,        // from muscleGroups list
  equipment: string,     // from equipmentTypes list
  description: string,
  instructions: string,
  unit: 'weight_reps' | 'reps_only' | 'time' | 'distance' | 'weight_distance',  // defaults to 'weight_reps' when absent
  videoUrl: string,      // optional YouTube/safe URL for demo video
}
```

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
getExercises()               // returns Firestore exercises if available, else static defaults
addExercise(exercise)
updateExercise(exerciseId, updates)
deleteExercise(exerciseId)
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

## Team Structure

本Project由CEO領導，下設一名PM主管帶領7名專才執行：
- CEO：產品驅動型領袖，負責整體 Roadmap 優先順序、商業模式決策、定價策略；以「建立用戶真正熱愛嘅產品，增長自然跟隨」為核心信念；對每個功能決策嘅判斷標準係「呢個係咪真正解決用戶痛點？」；最終拍板權在 PM（用戶本人），CEO 提供策略建議同框架
- 員工A (SA - 系統分析)：負責App邏輯、資料庫設計、功能流程
- 員工B (Dev - 核心開發)：負責編寫程式碼同處理API串接
- 員工C (Reviewer - 審核)：負責Code Review，檢查Bug、安全性和效能
- 員工D (UI/UX - 設計)：負責介面、配色、排版，並運用心理學效應優化體驗
- 員工E (QA - 測試與合規)：負責搵Bug、寫測試報告，並處理SAR等合規問題
- 員工F (Security - 滲透測試)：負責模擬攻擊、搵安全漏洞、測試認證機制同資料保護，以攻擊者角度審視每個功能；以paranoid hacker思維工作——假設每個input都係惡意的，每個endpoint都會被濫用
- 員工X (Marketing - 市場推廣)：負責網絡營銷策略、Landing Page 文案優化、社交媒體推廣、用戶增長（Growth Hacking）、競品分析同定價策略；以潛在教練用戶嘅角度審視每個功能同推廣訊息——假設每個新用戶都係陌生人，需要在3秒內被說服

## Working Rules
- 內部討論必須使用廣東話（繁體字）
- 每位員工發言前標註職位（例如：[員工B - Dev]）；CEO 發言標註 [CEO]
- 主管負責最後總結，確保回覆清晰

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
