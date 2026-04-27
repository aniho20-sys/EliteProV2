# ElitePro Development Progress

## Already Completed (committed to `claude/fitness-app-features-LbxtG`)

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

---

## Pending Tasks

### 🔴 Priority 1 — Fixed (regression closed)

| Item | Status |
|------|--------|
| `ClientDetailPage` log history showing `undefinedkg × undefined` for non-weight entries | ✅ Fixed in `feff44d` — `fmtSet()` applied to history display |

---

### 🟡 Priority 2 — CLAUDE.md Update

**Problem**: CLAUDE.md is significantly outdated. The following features are implemented but not documented:

| Missing item | Location |
|---|---|
| `InvoicePage` + `/invoices` route | `src/pages/InvoicePage.jsx`, `src/App.jsx` |
| `ClientProgressOverviewPage` + `/progress-overview` route | `src/pages/ClientProgressOverviewPage.jsx` |
| Templates system (`getTemplates`, `saveAsTemplate`, `deleteTemplate`) | `src/context/AppContext.jsx`, `src/pages/WorkoutPlansPage.jsx` |
| Session quota (`totalSessions`, `sessionOffset`, `getSessionStats`) | `src/context/AppContext.jsx`, `src/pages/ClientDetailPage.jsx` |
| `getTrainerSchedule()` + `trainerSchedule` state | `src/context/AppContext.jsx` |
| `removeClient()`, `updateBodyStat()`, `updateWorkoutLog()`, `deleteScheduleItem()` | `src/context/AppContext.jsx` |
| `invoices` + `templates` Firestore collections | `src/context/AppContext.jsx`, `firestore.rules` |
| `dateUtils.js`, `urlUtils.js` | `src/utils/` |
| Per-exercise rest timer + unit types (4 unit types, `SetInputs`, helpers) | `src/pages/WorkoutLogPage.jsx` |
| `markLoaded` now tracks 8 collections including `invoices` (not 8 hardcoded per old comment) | `src/context/AppContext.jsx:56` |

**Action**: Rewrite the relevant sections of `CLAUDE.md` — State Management, Project Structure, Routing table, Available context functions.

---

### 🟡 Priority 3 — Unit Select → Pill Buttons (UX)

**Problem**: Exercise card headers in the workout log use a native `<select>` dropdown for unit type (Wt+Reps / Reps / Time / Dist). On mobile, native selects feel inconsistent with the pill buttons already used in the exercise picker custom-add section.

**Files to modify:**
- `src/pages/WorkoutLogPage.jsx` — replace unit `<select>` with pill row in exercise card (free workout + plan-based)
- `src/pages/ClientDetailPage.jsx` — same for PT session log modal exercise cards

**Design**: Show 4 small pills inline below the exercise name (or in a collapsible row), replacing the `<select>`. Reuse existing `.log-unit-pill` + `.log-unit-pill.active` CSS classes.

---

### 🟡 Priority 4 — Invoice Firestore Rules Ownership Check

**Problem**: `deleteInvoice` in `AppContext` calls `deleteDoc` directly. The Firestore rule for `/invoices/{invoiceId}` must explicitly verify `request.auth.uid == resource.data.trainerId` before allowing delete. Needs audit to confirm the rule is not missing this check.

**File to check**: `firestore.rules` — `/invoices/{invoiceId}` match block
**File to update if needed**: `firestore.rules`, then `npm run deploy:rules`

---

## Unit Types Reference

| `unit` value | Inputs | Display |
|---|---|---|
| `weight_reps` (default) | kg + reps | `80kg × 10` |
| `reps_only` | reps only | `× 20` |
| `time` | seconds | `60s` |
| `distance` | metres | `400m` |
