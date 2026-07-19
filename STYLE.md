# ElitePro — UI Style Guide

Design system reference for `src/styles/index.css` and all page/component markup. This is the source of truth for new UI work — pages must not invent their own font sizes, spacing, or colors outside what's defined here. See `CLAUDE.md` for tech stack/architecture and `PROGRESS.md` for change history.

Brand direction: **dark luxury + gold accent**. Dark mode is the primary showcase, not an inverted afterthought — every color decision below is defined for dark first, with light as the daytime alternative.

---

## 1. Color Palette

All colors are CSS variables on `:root` (light) with overrides on `[data-theme="dark"]`. Never hardcode a hex value in a component — if a color you need isn't listed below, add a variable to `index.css`, don't inline it.

### 1.1 Brand

| Variable | Light | Dark | Usage |
|---|---|---|---|
| `--primary` | `#4361ee` | `#4361ee` | Links, focus rings, active nav state, primary data accents |
| `--primary-dark` / `--primary-light` | `#3a56d4` / `#6580f5` | same | Hover/pressed variants of primary |
| `--primary-glow` | `rgba(67,97,238,.10)` | same | Soft tinted backgrounds behind primary text/icons (active pills, badges) |
| `--accent` | `#ff6b35` | `#ff6b35` | Secondary CTA accent, energetic highlight (used sparingly — primary buttons use the brand gradient, not this alone) |
| `--brand-gradient` | `linear-gradient(100deg, #5B5BD6 0%, #9A4FC0 48%, #F0703C 100%)` | same | The one gradient for primary buttons, hero cards, stat-card top accent. Do not invent a second brand gradient. |
| `--brand-purple` | `#9A4FC0` | same | Hero card eyebrow labels only |

### 1.2 Semantic (meaning-carrying — never reuse for decoration)

| Variable | Light | Dark | Usage — **and only this usage** |
|---|---|---|---|
| `--danger` | `#ef476f` | `#ef476f` | Destructive actions (delete buttons/confirmations), renewal/session-critical warnings (≤2 sessions left, overdue invoice), churn-risk red tier |
| `--danger-glow` | `rgba(239,71,111,.08)` | same | Tinted background behind danger badges/counts |
| `--warning` | `#f59e0b` | `#f59e0b` | Mid-tier caution only — low-but-not-critical session count, pending/due-soon states. Never for destructive actions |
| `--success` | `#10b981` | `#10b981` | Positive confirmation only — completed, paid, healthy session balance. Toasts use this for success state |
| `--success-glow` | `rgba(16,185,129,.08)` | same | Tinted background behind success badges |
| `--info` | `#0ea5e9` | `#0ea5e9` | Neutral informational tag (rarely used — prefer neutral gray for non-warning info; reserve blue for genuinely informational, non-status content) |

**Rule:** any UI that shows a status derived from a threshold (sessions remaining, invoice due date, churn risk) must pick from `--danger` / `--warning` / `--success` via one shared utility function — never inline a threshold check with its own color choice in a component. (See §8.1 for the current violation of this rule and its fix plan.)

**Rule:** a "this is just informational, not a warning" list (e.g. the new Client Activity summary) uses `--text-muted` for every row — no red/yellow/green — precisely so nothing there fights with a real Needs Attention warning for the user's attention. Warning colors are reserved for panels whose entire job is to flag something.

### 1.3 Neutral / surface (the dark-luxury backbone)

| Variable | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#f5f7fb` | `#0f1117` | Page background |
| `--bg-card` | `#ffffff` | `#1a1d28` | Card/panel/modal/sidebar background |
| `--bg-card-hover` | `#f8f9fc` | `#222633` | Hover state for card/row/list-item backgrounds |
| `--bg-input` | `#f0f2f7` | `#252a38` | Form input, search bar, pill/chip backgrounds |
| `--bg-elevated` | `#ffffff` | `#1e2230` | Anything that should read as "above" bg-card (dropdowns, popovers) |
| `--surface` | `#f0f2f7` | `#252a38` | Secondary surface inside a card (nested rows, snooze menus) |
| `--border` | `#e2e6ef` | `#2d3348` | Default 1px borders/dividers |
| `--border-light` | `#ebeef5` | `#353b50` | Subtler border (outline buttons, soft separators) |
| `--divider` | `rgba(0,0,0,.06)` | `rgba(255,255,255,.06)` | Hairline separators inside a card |
| `--text` | `#1a1d26` | `#e8eaf0` | Primary text |
| `--text-secondary` | `#5b6478` | `#9ca3b4` | Secondary text (subtitles, meta lines) |
| `--text-muted` | `#9098a8` | `#6b7280` | Tertiary text, placeholders, disabled, neutral status labels |

### 1.4 Documented exceptions (intentionally NOT tokenized)

These are deliberate, not debt — do not "fix" them to use theme variables:

- **Google Sign-In button** (`#4285F4`, `#34A853` gradient) — Google's own brand colors, must stay literal regardless of theme.
- **Founding Member banner** (`#1a1a2e`/`#16213e`/`#0f3460` gradient + `#ffd700` gold badge) — a deliberately always-dark, always-gold premium treatment; it's the one place the "dark luxury + gold accent" brand direction is taken completely literally, independent of the user's light/dark theme choice.

---

## 2. Typography

Five tiers. Every page must use one of these — no ad-hoc `font-size` values.

| Tier | Size | Weight | Font | Usage |
|---|---|---|---|---|
| **Page title** | 1.6rem (1.3rem ≤640px) | 800 | `--font-display` | One per page, in `.page-header` |
| **Section/card title** | 1.05rem | 700 | `--font-display` | `.card-title`, modal titles (1.15rem/700) |
| **Body** | 0.875–0.9rem | 400–500 | Inter (default) | Paragraph text, form values, list item primary line |
| **Secondary/meta** | 0.8rem | 500–600 | Inter | Subtitles, meta lines under a title, form hints |
| **Micro/label** | 0.7–0.75rem | 700, uppercase, +0.5px letter-spacing | Inter | Eyebrow labels, stat labels, table headers, tags |

`--font-display` (Bricolage Grotesque) is reserved for page titles and card titles only — never body text.

**Known convergence debt:** meta/secondary text currently varies between 0.72/0.75/0.78/0.8rem across pages (all "meta line" purpose) — Phase 2 converges these to the 0.8rem tier above.

---

## 3. Spacing

8px base scale. Use these values (as literal px, matching existing `index.css` usage — no new spacing variables needed, just discipline):

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`

- `4px` is a half-step exception for tight icon/text gaps only (e.g. icon-to-label in a pill).
- Card padding: `20px` (regular/spacious), `16px` (compact density, mobile).
- Section gap (`.card` to `.card` down a page): `16px` (`mb-16` / grid `gap`).
- Page-level top gap (`.page-header` to first section): `28px`.

---

## 4. Density

Three tiers. Every page/section must declare which one it is (see table below) — don't mix densities inside one page without a clear visual break (e.g. a compact list inside a spacious page is fine; two different compact-vs-regular list styles side by side is not).

| Density | Row/item height | Padding | Font tier used for primary line | Where |
|---|---|---|---|---|
| **Compact** | 56px fixed row | 8–12px vertical | Body (0.875rem) | High-frequency scan lists: Exercise Library rows, workout log set rows, client list rows, message contact list |
| **Regular** | auto height | 16–20px | Body + secondary | Forms, detail pages, modals, invoice rows |
| **Spacious** | auto, generous | 20–24px+ | Stat-value tier is larger (see stat-card) | Display/summary surfaces: stat cards, hero cards, progress charts, empty states |

### Page → density assignment

| Page | Density |
|---|---|
| Exercise Library (list) | Compact |
| Workout Log (set rows) | Compact |
| Clients list | Compact |
| Messages (contact list) | Compact |
| Schedule (day list) | Regular |
| Client Detail (tabs) | Regular |
| Workout Plans (builder) | Regular |
| Invoices | Regular |
| Trainer/Client Dashboard | Spacious (stat strip/hero) + Compact (Needs Attention, Client Activity list) — a dashboard legitimately mixes: summary widgets are spacious, the actionable lists under them are compact |
| Progress / Business Analytics | Spacious |
| Profile | Regular |

---

## 5. Empty States

Always `<EmptyState icon={...} title="..." description="..." action={{...}} />` — never inline markup. Format contract:

1. **Icon** — Lucide icon, sets the emotional tone (e.g. `CalendarOff` for "nothing scheduled", not a generic circle).
2. **One-sentence explanation** — the `description`, plain English, states the situation (not just restates the title).
3. **One action button** — every empty state must give the user a next step. A flat "No sessions today" with no action is not acceptable; it must read as **"No sessions today — Book one?"** in spirit: title states the fact, the action button is the next step (`Book a Session` → `to`/`onClick`).

**Exception:** a positive/neutral terminal state where there is genuinely nothing to do next (e.g. "All caught up! No unread messages") may omit `action` — but this must be a deliberate call, not the default for "didn't get around to adding one."

**Known debt (Phase 2 fix list):** the following currently omit `action` without being a clear "nothing to do" terminal state:
- `ClientDashboard.jsx` "No sessions today" (SchedulePage's equivalent already has one — needs the same `Book a Session` action)
- `ClientDetailPage.jsx` "No workout logs yet"
- `ExerciseProgress.jsx` "No training data yet"
- `StudioManagementPage.jsx` "No studios yet" (gym啦, gated — low priority)
- `StudioBookingPage.jsx` "No available slots" (gym啦, gated — low priority)

---

## 6. Micro-interactions

- **Every write operation** (create/update/delete) shows a loading state on its trigger (disable + spinner or label swap, using the existing `saving`/`sending` state pattern) and resolves to a `useToast()` success or error toast. Never a silent success, never a fire-and-forget write (already required by `CLAUDE.md` conventions #11/#14 — this is the visual half of that rule).
- **List/data loading** uses `<SkeletonCard />` / `<SkeletonList />` / `<SkeletonStatGrid />` — never a bare spinner or blank space — for anything backed by a Firestore listener's initial load.
- **High-frequency buttons** (set-complete checkmarks, rest-timer controls, unit pills, filter chips) must have a visible `:active` press state in addition to `:hover` — mobile has no hover, so relying on hover-only feedback leaves touch users with no confirmation a tap registered.
- Toast duration: success 3s, error 6s (already in `ToastContext` — don't override per-call unless the message is unusually long).

---

## 7. Language

All in-app UI text is English — no exceptions (buttons, labels, placeholders, toasts, errors, empty states, modal copy). This is `CLAUDE.md` convention #28, restated here because it's a style-system concern, not just a wording concern: a UI string in the wrong language is a style violation the same way a hardcoded hex color is.

Documented exceptions (do not touch without explicit sign-off): the "gym啦" brand name (currently behind `GYMLA_ENABLED=false`) and `LandingPage.jsx`'s bilingual marketing copy.

---

## 8. Known Debt (found during this audit, not yet fixed — Phase 2 scope)

### 8.1 Remaining-sessions color logic — 5 duplicated implementations, inconsistent thresholds

| Location | Thresholds | "safe" color used |
|---|---|---|
| `utils/sessionUtils.js` `getSessionColor()` | ≥5 / ≥3 / else | hardcoded `#06d6a0` (not `--success`) |
| `ClientProgressOverviewPage.jsx:126` | ≤2 / ≤5 / else | `var(--success)` |
| `ClientDashboard.jsx:128` | ≤3 only (no danger tier) | — |
| `SchedulePage.jsx:382` | ≤2 / ≤5 / else | `var(--text-muted)` (not success) |
| `SchedulePage.jsx:484` | ≤2 only | — |

Phase 2 fix: pick one threshold (recommend ≤2 danger / ≤5 warning / else success, matching the majority) and one utility (`getSessionColor()`), delete the other four inline versions, always import from `sessionUtils.js`.

### 8.2 Hardcoded hex colors to tokenize

`#06d6a0` (duplicate green, used in `sessionUtils.js` and `.progress-stat-diff.up`/`.progress-chart-change.up` — should become `--success` throughout), `#22c55e` (fallback in `.log-set-done.done`, duplicate of `--success`), `#b45309`/`#b07d00` (warning text tints, should derive from `--warning`), assorted literal `#fff` for on-brand text (acceptable to keep literal, but worth a `--on-brand` variable if it recurs after cleanup).

### 8.3 Dark mode gap

`.loading-screen` hardcodes `background: #ffffff` — flashes white during the auth-check loading screen in dark mode. Needs `var(--bg-card)`.

### 8.4 Chinese UI text

Already fully swept per `CLAUDE.md` convention #28 (Session 34) — no known remaining leaks outside the two documented exceptions in §7.

---

## Phase 2 scope (once this document is approved)

1. Consolidate §8.1 into one `getSessionColor()` utility, used everywhere.
2. Replace hardcoded hex colors (§8.2) with variables.
3. Fix `.loading-screen` dark mode (§8.3).
4. Bring the empty states in §5's debt list up to the action-button format.
5. Apply compact density (56px rows) to any remaining high-frequency list not yet converted.
6. Full dark-mode visual pass per page.
7. No business logic, data, or Cloud Functions changes — pure CSS/markup/copy. 12 credit tests must stay green throughout; small, reviewable commits per category (not one giant diff).
