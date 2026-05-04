# ElitePro Development Progress

## Completed

| Commit | Description |
|--------|-------------|
| `4049e15` | Add muscle body model filter to exercise picker in workout log |
| `125a287` | Remove dead code + extract 3 duplicated utilities |
| `09b4a2f` | Fix 5 bugs + deduplicate set-update logic across workout pages |
| `c0d36e9` | Fix iOS PWA status bar overlap (safe-area-inset-top) |
| `fdd6477` | PWA improvements: install prompt, iOS splash screens, enhanced manifest |
| `67a6e46` | Auto-save in-progress workout log to localStorage |
| `55a83bd` | Fix Google sign-in OAuth redirect URI |
| `01cfffb` | Allow clients to add custom exercises to library |
| `9a7cd44` | Add per-exercise rest timer and exercise unit types to workout log |
| `0f31f71` | Fix workout log card header overflow on mobile (flex-wrap) |
| `f6ca21c` | Allow changing unit type per exercise directly on the log card |
| `feff44d` | Add unit types to trainer PT session log modal in ClientDetailPage |
| `bc42943` | Fix custom exercise add feedback + add exercise progress to Progress Overview |
| `9f8a1f0` | Security: harden Firestore update rules — lock immutable fields + fix privilege escalation |
| `f2057f0` | Add strength/PR progress to trainer Progress Overview (ClientProgressOverviewPage) |
| `f5872f6` | Remove duplicate body stats tab from ClientDetailPage |
| `4e50215` | Add ExerciseProgress component — per-exercise strength progression chart |
| `9d12766` | Priority 3 + 2: unit pill buttons in WorkoutLogPage + ClientDetailPage; CLAUDE.md rewrite |
| `b2b6801` | Final audit: delete confirmations, toast type fixes, shared utils, dead code removal |
| `f486fb7` | Compress desktop sidebar: 8 → 4 primary + collapsible More section |
| `0e63d7f` | Simplify Exercise Progress picker: auto-select + compact dropdown sorted by session count |
| — | Smart Progression Suggestions: +2.5kg hint in workout log when last 2 sessions plateaued at same weight |
| — | Session Recap 一鍵發送: trainer marks session complete → recap modal → optional message to client |
| — | Badge System Phase 1: milestone badges at 1/10/50/100 sessions; shown in ClientDashboard + ClientDetailPage |
| — | Business Analytics page (/analytics): monthly revenue bar chart, sessions trend, 30-day retention, top clients |
| — | Volume Analytics Chart: weekly training volume bar chart in ProgressPage + ClientDetailPage progress tab |
| `431e771` | Fix CI: add .npmrc legacy-peer-deps to unblock npm ci (vite-plugin-pwa@1.2.0 / vite@8 peer dep conflict) |
| `463995c` | Fix app icon compositing — crop to logo bounding box before scaling |
| `7f8a5ad` | Cache-bust icons by versioning filenames to -v3 (white background blue swirl logo) |
| `b44926a` | Set no-cache on PNG/ICO icons so updates take effect immediately |
| `3416163` | Trainer can log workout for client with integrated rest timer (same UX as client side) |
| `658ead8` | Comprehensive app audit — 7 bugs fixed (surface CSS var, z-index, date util, invoice zero-total, double-submit, week filter) |
| `f02ff7b` | CI: restore continue-on-error for Firestore rules (SA lacks Cloud Datastore Admin permission) |
| `6f66c39` | CI: explicitly pass --legacy-peer-deps to npm ci in workflow (more reliable than .npmrc alone) |
| `d10eb1c` | Add firestore.indexes.json + reference in firebase.json (required by firebase-tools) |
| `643bb80` | Add Kettlebell + Other equipment types; improve WorkoutPlans UX (equip filter, unit types per exercise, notes, unit-aware set inputs) |
| `36f3b64` | Fix SchedulePage: allow viewing past dates via prev/next week navigation |
| — | Fix loading screen: white background + gradient brand text (no PNG frame) |
| — | Fix iOS PWA splash screen: white background, no dark overlay |
| — | Client nav: promote Workout Log to primary; move My Plans to More |
| — | Google Sign-In: switch to signInWithRedirect + web.app authDomain (fixes Safari ITP) |
| — | Push Notifications: VAPID key wired, service worker ready, Cloud Functions complete |
| — | CI: add `cd functions && npm ci` before Functions deploy step |
| — | **P0 Fix**: Business Analytics revenue always $0 — compute from `items` instead of missing `amount` field |
| — | **P0 Fix**: Body stats update blocked — Firestore rule `allow update: if false` → allow owner/trainer |
| — | **P0 Fix**: Remove dead `friendlyAuthError` import from AppContext; fix retention date using localDateAdd |

---

## Pending Tasks — P1 (High, fix this week)

| # | Task | Detail |
|---|------|--------|
| 1 | Badge CSS missing | `.badge-item`, `.badge-icon`, `.badge-name`, `.badge-date` classes not in index.css — badges don't render |
| 2 | NotesSection stale closure | useEffect deps missing `currentUser.id`, `otherUserId`, `markMessagesRead` — mark-as-read can silently fail on conversation switch |
| 3 | Trainer gets no notification when client logs workout | No push trigger exists for new workout logs |
| 4 | Session booking alert for trainer | Pending sessions have no notification/badge — trainer must manually check Schedule |
| 5 | Deploy Cloud Functions | CI service account may still lack Cloud Functions Admin + Cloud Run Admin roles |

## Pending Tasks — P2 (Medium, fix this month)

| # | Task | Detail |
|---|------|--------|
| 6 | Double-submit protection gaps | ClientDetailPage, SchedulePage, MessagesPage, InvoicePage, WorkoutLogPage save buttons can race |
| 7 | Form validation UX | No inline field errors (`.form-input.error` style); errors show as top-level div only |
| 8 | Firestore onSnapshot error handling | All 8 listeners mark loaded on error → shows empty state instead of error message |
| 9 | Accessibility | Icon-only buttons missing `aria-label`; form inputs missing `id`/`htmlFor`; no `role="alert"` on errors |
| 10 | Session quota enforcement | Quota is calculated but not enforced — trainer can overbook |
| 11 | SchedulePage conflict logic | `hasConflict` doesn't validate working hours boundary before checking overlap |

## Pending Tasks — P3 (Low, long-term)

| # | Task | Detail |
|---|------|--------|
| 12 | Navigation array consolidation | 4 separate link arrays (desktop/mobile × trainer/client) with duplication |
| 13 | VAPID key in .env | FCM VAPID key hardcoded in NotificationContext — should be `VITE_VAPID_KEY` |
| 14 | Message rate limiter cleanup | `msgTimestampsRef` accumulates entries for lifetime of session |
| 15 | Trainer announcements / broadcast | No bulk message to all clients (e.g. "Gym closed this week") |
| 16 | Session location field | Schedule items have no `location` field — trainers put location in notes |
| 17 | Unsaved changes warning | No `beforeunload` prompt when navigating away from dirty form |

---

## Navigation Architecture

| Platform | Primary (always visible) | Secondary (More) |
|---|---|---|
| **Trainer desktop sidebar** | Dashboard, Clients, Schedule, Messages | Progress Overview, Workout Plans, Invoices, Exercise Library |
| **Trainer mobile bottom nav** | Home, Clients, Schedule, Messages | Invoices, Progress Overview, Plans, Exercise Library, Profile |
| **Client desktop sidebar** | Dashboard, Workout Log, Progress, Messages | My Plans, Schedule, Exercise Library |
| **Client mobile bottom nav** | Home, Log, Schedule, Messages | My Plans, My Progress, Exercise Library, Profile |

---

## Unit Types Reference

| `unit` value | Inputs | Display |
|---|---|---|
| `weight_reps` (default) | kg + reps | `80kg × 10` |
| `reps_only` | reps only | `× 20` |
| `time` | seconds | `60s` |
| `distance` | metres | `400m` |

---

## Known CI Limitation

CI service account (`FIREBASE_SERVICE_ACCOUNT`) has **Firebase Hosting Admin** scope only.  
Firestore rules deployment returns HTTP 403 (`Permission denied to get service [firestore.googleapis.com]`).  
Cloud Functions deployment requires **Cloud Functions Admin** + **Cloud Run Admin** roles.  
**Workaround:** Firestore rules must be published manually via Firebase Console.  
**Permanent fix:** Go to Google Cloud Console → IAM → find the CI service account → add **Cloud Datastore Index Admin**, **Cloud Functions Admin**, **Cloud Run Admin** roles.
