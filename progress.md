# ElitePro — Feature Progress

## Phase 1: Credit Booking System ✅ COMPLETE (2026-07-07)

### What was built
- **Credit ledger** — `creditLedger` Firestore collection, all writes via Cloud Functions (Admin SDK)
- **3 Cloud Functions** — `bookSession`, `cancelSession`, `adjustClientCredits` (HTTPS Callable)
- **Atomic transactions** — all credit mutations use `db.runTransaction`
- **London timezone** — 24hr cutoff calculated via `Intl` noon-UTC probe (handles BST/GMT)
- **Reschedule quota** — 2 free cancellations per calendar month (London time), tracked on user doc
- **Auto-migration** — `totalSessions → creditBalance` on trainer first load (silent, one-time), covers ALL clients
- **Backward compatibility** — old `sessionOffset`/`totalSessions` system preserved for legacy sessions

### UI changes
- **ClientDashboard** — credit card shows balance, low-credit warnings, "Book Session" CTA
- **SchedulePage** — client booking deducts credit; cancel modals show refund policy; book button disabled at 0 credits
- **ClientDetailPage** — "Session Credits" section with balance, reschedule count, Adjust modal (+5/+10/+20/-1/-5); "Session History" tab (renamed from "Session Dates")
- **Firestore rules** — `creditLedger` collection added (read-only for client/trainer, write blocked)

### Acceptance test results (2026-07-07)

| Round | Result |
|-------|--------|
| Build + static check | ✅ Clean build, no credit-system lint errors |
| Business logic audit | ✅ All rules server-enforced |
| Scenario simulation | ✅ All 7 scenarios pass |

**Bugs fixed during acceptance test:**
1. Book Session button not disabled when `creditBalance === 0` → fixed (disabled + tooltip)
2. `onSessionsLow` CF not monitoring `creditBalance` changes → fixed (added credit path)

**Critical bug fixed post-acceptance (2026-07-07):**
3. Booking succeeded but credit not deducted — migration filter `u.totalSessions != null` skipped clients without a session quota, leaving `creditBalance = null`. The `handleAdd()` guard `if (creditBalance !== null)` fell through to the legacy `addScheduleItem` path (no CF call, no deduction). Fixed: migration now covers ALL trainer clients regardless of `totalSessions`.

### Phase 1 wrap-up (2026-07-07)

#### Regression tests (`functions/test/bookSession.test.js`)
Covers the root-cause scenario plus full booking contract:
- ✅ Book session: credit -1, `creditDeducted: true` on schedule doc, ledger entry written
- ✅ Last credit (balance → 0): all three atomic writes succeed
- ✅ `creditBalance === 0`: server rejects with `failed-precondition` (not just UI disabled)
- ✅ `creditBalance` missing/null: server rejects (root-cause scenario)
- ✅ Unauthenticated call: server rejects
- ✅ Race condition (2 concurrent bookings, 1 credit): exactly one succeeds, one `failed-precondition`

Run: `firebase emulators:start --only firestore` then `cd functions && npm test`

#### Admin correction script (`scripts/admin-correct-sessions.cjs`)
- Lists all `status != cancelled` + `creditDeducted != true` sessions split by pre/post launch date
- `correctSession(scheduleId, reason)` applies fix (deduct credit + ledger `type: manual_correction`)
- List-only by default; correction requires explicit code uncomment
- Run: `GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa.json node scripts/admin-correct-sessions.cjs`

#### Logic checks
| Check | Result |
|-------|--------|
| Late cancel (<24hr) does NOT increment `rescheduleCount` | ✅ Already correct |
| Trainer cancel of non-creditDeducted session: no refund | ✅ Already correct |
| `rescheduleCount` resets monthly (lazy, on first cancel of new month) | ✅ Already correct |
| `adjustClientCredits` balance floor at 0 | ✅ `Math.max(0, ...)` already present |
| All 4 ledger types (booking/cancellation_refund/no_show_forfeit/reschedule_forfeit) | ✅ All write correctly |

#### CF changes from wrap-up
- **Notification thresholds swapped**: trainer now notified at ≤3 (earlier warning), client at ≤2 (less noise)
- **Feature flag added**: `CREDIT_PUSH_NOTIFICATIONS_ENABLED = false` in `functions/index.js` — gates the credit-balance notification sends; flip to `true` in production after verifying on device

### Firestore data model additions

**`users/{uid}` — 3 new fields:**
```
creditBalance: number       // current credit balance
rescheduleCount: number     // cancellations this month (reset monthly)
rescheduleMonth: string     // 'YYYY-MM' in Europe/London time
```

**`schedule/{schedId}` — 1 new field:**
```
creditDeducted: boolean     // true when booking used the credit system
```

**`creditLedger/{entryId}` — new collection:**
```
clientId, trainerId, amount, balance_after, type, credit_type,
expires_at, schedule_id, note, created_at, created_by
```

---

## Manual iPhone Verification Required

Before marking Phase 1 fully production-ready, test these flows on a real iPhone:

1. **Full booking flow**: trainer adds credits → client opens app on iPhone → taps "Book Session" → confirms session → verify credit ticked down in ClientDashboard
2. **0-credit booking attempt**: client with 0 credits taps "Book Session" → button must be disabled (no tap-through)
3. **Client cancel >24hr (first cancel this month)**: client cancels → credit refunded → toast confirms refund
4. **Client cancel <24hr**: client cancels within 24hr → credit NOT refunded → toast says "credit not refunded"
5. **Client cancel >24hr (3rd cancel same month)**: client at reschedule limit → credit NOT refunded → toast says "reschedule limit reached"
6. **Trainer cancel**: trainer cancels session with `creditDeducted: true` → credit auto-refunded to client
7. **Migration**: trainer with clients who never had `totalSessions` — those clients should show a `creditBalance` of `0` after trainer's first app load, and trainer can add credits via "Adjust Session Credits"
8. **Offline booking**: book a session while offline (IndexedDB) → comes back online → verify CF processes it (or gives a clear error)
9. **Push notifications** (once `CREDIT_PUSH_NOTIFICATIONS_ENABLED = true`): adjust a client to 3 credits → trainer gets push; adjust to 2 credits → client gets push

---

## Backlog / Phase 2 Ideas

- Credit ledger history tab in ClientDetailPage
- Monthly credit bundles with expiry (`expires_at` field already in schema)
- Push notifications for low credit — code ready, flip `CREDIT_PUSH_NOTIFICATIONS_ENABLED = true` to enable
- Schedule badge in trainer view: show `creditBalance` instead of legacy `totalSessions`
- Freemium model: ≤3 clients free, paid unlimited (Notion-style)
- Mobile app: Capacitor wrapper for iOS/Android (PWA already set up)
