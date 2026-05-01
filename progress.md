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

---

## Pending Tasks

No outstanding tasks. All priority items completed.

---

## Navigation Architecture

| Platform | Primary (always visible) | Secondary (More) |
|---|---|---|
| **Trainer desktop sidebar** | Dashboard, Clients, Schedule, Messages | Progress Overview, Workout Plans, Invoices, Exercise Library |
| **Trainer mobile bottom nav** | Home, Clients, Schedule, Messages | Invoices, Progress Overview, Plans, Exercise Library, Profile |
| **Client desktop sidebar** | Dashboard, Workouts, Log, Progress, Messages | Schedule, Exercise Library |
| **Client mobile bottom nav** | Home, Workouts, Schedule, Messages | Workout Log, My Progress, Exercise Library, Profile |

---

## Unit Types Reference

| `unit` value | Inputs | Display |
|---|---|---|
| `weight_reps` (default) | kg + reps | `80kg × 10` |
| `reps_only` | reps only | `× 20` |
| `time` | seconds | `60s` |
| `distance` | metres | `400m` |
