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

---

## In Progress (plan approved, implementation not started)

### Feature: Per-Exercise Rest Timer + Exercise Unit Types

**Files to modify:**
- `src/pages/WorkoutLogPage.jsx` — primary, most changes
- `src/pages/ExerciseLibraryPage.jsx` — add unit picker to exercise form
- `src/styles/index.css` — new CSS classes

**WorkoutLogPage.jsx changes:**
- [ ] Remove `REST_PRESETS` constant
- [ ] Add `completedSets: Set` state (tracks `"exIdx-setIdx"` strings)
- [ ] Add `customUnit` state for unit picker in exercise picker modal
- [ ] Add `emptySet(unit)` helper — returns correct blank set shape per unit
- [ ] Add `hasValue(s, unit)` helper — unit-aware save filter
- [ ] Add `formatSet(s, unit)` helper — unit-aware history display
- [ ] Add `SetInputs` sub-component — renders kg+reps / reps / seconds / metres inputs
- [ ] Add `handleCompleteSet(exIdx, setIdx)` — toggle done + auto-start timer with exercise's rest
- [ ] Add `updateExerciseRest(exIdx, seconds)` — update per-exercise rest
- [ ] Update `startFreeWorkout` — reset `completedSets`
- [ ] Update `startLog` — add `rest` + `unit` to each entry, reset `completedSets`
- [ ] Update `loadFromPlan` — add `rest` + `unit` to each entry
- [ ] Update `addExerciseToLog` — add `rest: 90, unit: exercise.unit || 'weight_reps'`
- [ ] Update `addCustomExerciseToLog(name, unit)` — accept unit param
- [ ] Update `addSet` — use `emptySet(entry.unit)` for correct blank set shape
- [ ] Update `removeSet` — shift `completedSets` keys correctly
- [ ] Update `removeExercise` — shift `completedSets` keys correctly
- [ ] Update `isNewPR` + `wasPRAtTime` — skip non-weight_reps exercises
- [ ] Update `startEdit` — include `seconds`/`metres` fields in string conversion
- [ ] Update `handleSave` — unit-aware set serialization + total volume
- [ ] Update localStorage save — include `completedSets: [...completedSets]`
- [ ] Update localStorage restore — `setCompletedSets(new Set(draft.completedSets || []))`
- [ ] Update Cancel button — reset `completedSets`
- [ ] Update exercise card UI — per-exercise rest `<select>` in header
- [ ] Update set row UI — unit-aware inputs + ✓ `CheckCircle` button
- [ ] Update exercise picker — replace custom-add button with unit pill buttons
- [ ] Update history display — use `formatSet(s, entry.unit)`
- [ ] Update edit modal set rows — unit-aware via `SetInputs`
- [ ] Simplify timer bar — remove `.rest-timer-presets` row

**ExerciseLibraryPage.jsx changes:**
- [ ] Add `unit` field to form state (default `'weight_reps'`)
- [ ] Add unit selector (4 pills or `<select>`) in add/edit exercise modal
- [ ] Include `unit` in `exData` when saving

**src/styles/index.css changes:**
- [ ] `.log-exercise-rest` + `.log-rest-select` — per-exercise rest control
- [ ] `.log-set-done` + `.log-set-done.done` — ✓ button states
- [ ] `.log-unit-picker` + `.log-unit-pill` + `.log-unit-pill.active` — custom exercise unit pills
- [ ] `.exercise-picker-custom-wrap` + `.exercise-picker-custom-label` — custom add section styling

---

## Unit Types Reference

| `unit` value | Inputs | Display |
|---|---|---|
| `weight_reps` (default) | kg + reps | `80kg × 10` |
| `reps_only` | reps only | `× 20` |
| `time` | seconds | `60s` |
| `distance` | metres | `400m` |
