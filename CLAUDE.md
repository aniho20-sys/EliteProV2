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
│   ├── EmptyState.jsx      # Reusable empty state (icon + title + desc + CTA action)
│   ├── ErrorBoundary.jsx   # React class error boundary (wraps entire app)
│   ├── GlobalSearch.jsx    # Search bar: clients, exercises, plans
│   ├── MuscleSelector.jsx  # Interactive SVG muscle body model for exercise targeting
│   ├── Navigation.jsx      # Sidebar (desktop) + top header + bottom nav (mobile)
│   ├── NotesSection.jsx    # Client notes section component
│   └── Skeleton.jsx        # Loading skeleton components (SkeletonLine/Card/List/StatGrid)
├── context/
│   ├── AppContext.jsx       # Global state + all Firestore/Auth operations
│   ├── NotificationContext.jsx # FCM push notifications (code ready, needs Blaze deploy)
│   ├── ThemeContext.jsx     # Light/dark theme toggle (persisted to localStorage)
│   └── ToastContext.jsx     # Toast notification system (3s auto-dismiss)
├── data/
│   ├── exercises.js        # Static exercise library (seeded into Firestore)
│   └── sampleData.js       # Demo seed data (ghost clients, plans, logs, etc.)
├── pages/
│   ├── LoginPage.jsx           # Auth: Google, email/password, forgot password, demo
│   ├── RoleSelectPage.jsx      # Post-auth profile creation (role + invite code)
│   ├── TrainerDashboard.jsx    # Trainer home: stats overview
│   ├── ClientDashboard.jsx     # Client home: workout summary + body stats
│   ├── ClientsPage.jsx         # Trainer: client list
│   ├── ClientDetailPage.jsx    # Trainer: client detail (stats, plans, logs, notes)
│   ├── WorkoutPlansPage.jsx    # Create/view workout plans
│   ├── SchedulePage.jsx        # Session scheduling + calendar view
│   ├── MessagesPage.jsx        # In-app messaging (full page)
│   ├── ExerciseLibraryPage.jsx # Exercise database with search/filter
│   ├── MyWorkoutsPage.jsx      # Client: assigned workout plans
│   ├── WorkoutLogPage.jsx      # Client: log workout sessions
│   ├── ProgressPage.jsx        # Client: body stats tracking + charts
│   └── ProfilePage.jsx         # User profile, invite code, account management
├── styles/
│   └── index.css           # Global styles (CSS variables, skeleton, empty states)
├── utils/
│   ├── authErrors.js       # Firebase Auth error code → friendly message map
│   ├── sessionUtils.js     # Session colour/label helpers
│   └── workoutUtils.js     # Workout set normalisation helpers
├── firebase.js             # Firebase init (db, auth exports)
├── App.jsx                 # Root: provider tree + routing + invite code URL parsing
└── main.jsx                # Entry point

functions/                  # Cloud Functions (needs Blaze plan to deploy)
├── index.js                # sendNotificationOnMessage + sendNotificationOnSchedule
└── package.json

public/
├── firebase-messaging-sw.js # FCM background notification Service Worker
└── manifest.json            # PWA manifest (needs proper icons)
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
- **Services used**: Firestore (database), Firebase Auth (authentication), Cloud Messaging/FCM (code ready, not deployed), Cloud Functions (code ready, needs Blaze plan)
- **Offline**: IndexedDB persistence enabled; app works without internet after first load

## Authentication Flow
1. **LoginPage** shows: Google Sign-In, email/password (sign-in or sign-up), forgot password, demo coach button
2. After Firebase Auth, `onAuthStateChanged` fires → sets `firebaseUser`
3. If `firebaseUser` exists but no Firestore profile (`needsProfile === true`) → **RoleSelectPage** shown
4. **RoleSelectPage**: user picks trainer or client, enters name, optionally enters trainer invite code → calls `completeProfile()` → creates Firestore `users` doc
5. Once profile exists → `currentUser` is set from Firestore → main app renders
6. **Demo coach**: `loginDemoCoach()` uses `coach@elitepro.com` / `demo123`; auto-creates account + seeds ghost clients on first use

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
  isDemo: boolean,          // true for seeded demo data
  // trainer-only:
  speciality: string,
  inviteCode: string,       // 6-char uppercase alphanumeric
  // client-only:
  trainerId: string | null, // UID of trainer
  age: number,
  height: number,           // cm
  goals: string,
  notes: string,
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
  planId: string,
  date: string,          // 'YYYY-MM-DD'
  entries: [
    {
      exerciseId: string,
      sets: [{ weight: number, reps: number, completed: boolean }],
    }
  ],
  notes: string,
  rpe: number,           // 1-10 rate of perceived exertion
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
}
```

## State Management (AppContext)
`AppContext` is the single source of truth. It subscribes to all Firestore collections with real-time `onSnapshot` listeners when a user is authenticated. All reads and writes go through context functions.

### Auth state
- `firebaseUser` — raw Firebase Auth user (undefined = checking, null = unauthenticated, object = authenticated)
- `currentUser` — Firestore profile object (null when not logged in)
- `authReady` — `firebaseUser !== undefined` (auth check complete)
- `needsProfile` — `firebaseUser` exists but no Firestore profile yet → show RoleSelectPage
- `loading` — true while Firestore listeners are fetching initial data (tracks 8 collections)

### Available context functions
```js
// Auth
signInWithGoogle()           // popup with redirect fallback for iOS Safari
signUpEmail(email, password)
signInEmail(email, password)
sendPasswordReset(email)
completeProfile(role, name, inviteCode)  // creates Firestore user doc
loginDemoCoach()             // creates demo account + seeds data on first call
logout()
deleteAccount()              // deletes Firestore profile + bodyStats + Firebase Auth user

// Users
getClients(trainerId)        // returns client users for a trainer
getClient(clientId)
updateClient(clientId, updates)

// Body Stats
getBodyStats(clientId)       // returns entries array
addBodyStat(clientId, stat)
deleteBodyStat(clientId, index)

// Workout Plans
getWorkoutPlans({ clientId?, trainerId? })
addWorkoutPlan(plan)
updateWorkoutPlan(planId, updates)
deleteWorkoutPlan(planId)

// Workout Logs
getWorkoutLogs(clientId)
addWorkoutLog(log)

// Schedule
getSchedule({ trainerId?, clientId?, date? })
addScheduleItem(item)
updateScheduleItem(itemId, updates)

// Messages
getMessages(userId)          // returns all messages involving userId
sendMessage(from, to, text)
getUnreadCount(userId)
markMessagesRead(userId, otherUserId)

// Personal Records
getPersonalRecords(clientId) // returns { exerciseId: { weight, date } }

// Exercises
getExercises()
addExercise(exercise)
updateExercise(exerciseId, updates)
deleteExercise(exerciseId)
muscleGroups                 // string[] constant
equipmentTypes               // string[] constant

// Invite Codes
getInviteCode(trainerId)     // generates + saves if missing
findTrainerByCode(code)
connectToTrainer(clientId, inviteCode)

// Demo
resetData()                  // trainer-only: wipes + re-seeds demo data
data                         // raw { users, bodyStats, workoutPlans, workoutLogs, schedule, messages, exercises }
```

### Other contexts
- **ThemeContext**: `{ theme, toggleTheme }` — `'light'` | `'dark'`, persisted to `localStorage` key `elitepro_theme`, applied via `data-theme` attribute on `<html>`
- **ToastContext**: `addToast(message, type?)` — `type` is `'success'` (default), `'error'`, or `'info'`; auto-dismisses after 3s
- **NotificationContext**: FCM push notification management — token registration, foreground message handling, permission request. Code ready but requires Blaze plan + VAPID key to activate

## Routing
Uses `HashRouter` (required for Firebase Hosting SPA compatibility).

| Route | Trainer | Client |
|-------|---------|--------|
| `/` | TrainerDashboard | ClientDashboard |
| `/clients` | ClientsPage | — |
| `/clients/:clientId` | ClientDetailPage | — |
| `/plans` | WorkoutPlansPage | WorkoutPlansPage |
| `/schedule` | SchedulePage | SchedulePage |
| `/messages` | MessagesPage | MessagesPage |
| `/exercises` | ExerciseLibraryPage | ExerciseLibraryPage |
| `/profile` | ProfilePage | ProfilePage |
| `/my-workouts` | — | MyWorkoutsPage |
| `/log` | — | WorkoutLogPage |
| `/progress` | — | ProgressPage |

Routes are conditionally rendered based on `currentUser.role`. Unknown routes redirect to `/`.

## Firestore Security Rules Summary
- **Auth required** for all reads and writes
- **users**: Any auth can read; self-create own profile; trainer can create/update their clients
- **bodyStats**: Any auth can read; only the client or their trainer can write
- **workoutPlans**: Any auth can read; trainer can only write plans they own
- **workoutLogs**: Any auth can read; clients write and update their own logs; trainers can update logs they created (full fields) or add `trainerNotes` to any client log; **delete is disabled**
- **schedule**: Any auth can read; trainer or client involved can write/delete
- **messages**: Any auth can read; sender creates; recipient can only update `read` field; **delete is disabled**
- **exercises**: Any auth can read; only trainers can write

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

## Demo Data
- `loginDemoCoach()` creates a real Firebase Auth account (`coach@elitepro.com`) on first use
- Ghost clients are created as real Firestore `users` docs with IDs `{trainerUid}-c1`, `-c2`, `-c3`
- All demo data IDs are scoped to the trainer's UID to avoid collisions between demo users
- `resetData()` (trainer-only, demo flag required): orphans ghost clients + re-seeds; does NOT delete workout logs or messages (Firestore rules disallow delete)
- Sample clients (`david@demo.local`, `sarah@demo.local`, `michael@demo.local`) are ghost users, not real auth accounts

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
5. **`markLoaded` tracks 8 collections** — if adding a new Firestore collection listener, update the count in `markLoaded` (`loadedRef.current.size >= 8`)
6. **Toast not alert** — use `useToast()` for user feedback, never `alert()`
7. **HashRouter** — links must be hash-compatible; no server-side route handling
8. **Theme** — respect CSS variables; add new color values as variables, not hardcoded hex
9. **No localStorage for app data** — only `ThemeContext` uses localStorage; all app state lives in Firestore
10. **workoutLogs and messages cannot be deleted** — Firestore rules set `allow delete: if false`; handle this in reset/cleanup flows
11. **Always await Firestore writes** — wrap in try/catch with error toast; never fire-and-forget
12. **Use EmptyState component** for empty data views — import from `components/EmptyState.jsx`; pass Lucide icon, contextual description, and actionable CTA
13. **Use Skeleton components** for loading states — import from `components/Skeleton.jsx`
14. **Double-submit protection** — all forms/buttons that trigger Firestore writes must use a `saving`/`sending` state to disable during async ops
15. **Push notifications not yet active** — `NotificationContext` + Cloud Functions code exists but needs Blaze plan + VAPID key before deployment

## Team Structure

本Project由一名PM主管帶領6名專才執行：
- 員工A (SA - 系統分析)：負責App邏輯、資料庫設計、功能流程
- 員工B (Dev - 核心開發)：負責編寫程式碼同處理API串接
- 員工C (Reviewer - 審核)：負責Code Review，檢查Bug、安全性和效能
- 員工D (UI/UX - 設計)：負責介面、配色、排版，並運用心理學效應優化體驗
- 員工E (QA - 測試與合規)：負責搵Bug、寫測試報告，並處理SAR等合規問題
- 員工F (Security - 滲透測試)：負責模擬攻擊、搵安全漏洞、測試認證機制同資料保護，以攻擊者角度審視每個功能；以paranoid hacker思維工作——假設每個input都係惡意的，每個endpoint都會被濫用

## Working Rules
- 內部討論必須使用廣東話（繁體字）
- 每位員工發言前標註職位（例如：[員工B - Dev]）
- 主管負責最後總結，確保回覆清晰
