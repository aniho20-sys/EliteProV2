# ElitePro — Feature Progress

## Phase 1: Credit Booking System ✅ COMPLETE (2026-07-07)

### What was built
- **Credit ledger** — `creditLedger` Firestore collection, all writes via Cloud Functions (Admin SDK)
- **3 Cloud Functions** — `bookSession`, `cancelSession`, `adjustClientCredits` (HTTPS Callable)
- **Atomic transactions** — all credit mutations use `db.runTransaction`
- **London timezone** — 24hr cutoff calculated via `Intl` noon-UTC probe (handles BST/GMT)
- **Reschedule quota** — 2 free cancellations per calendar month (London time), tracked on user doc
- **Auto-migration** — `totalSessions → creditBalance` on trainer first load (silent, one-time)
- **Backward compatibility** — old `sessionOffset`/`totalSessions` system preserved for legacy sessions

### UI changes
- **ClientDashboard** — credit card shows balance, low-credit warnings, "Book Session" CTA
- **SchedulePage** — client booking deducts credit; cancel modals show refund policy; book button disabled at 0 credits
- **ClientDetailPage** — "Session Credits" section with balance, reschedule count, Adjust modal (+5/+10/+20/-1/-5)
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

## Backlog / Phase 2 Ideas

- Credit ledger history tab in ClientDetailPage
- Monthly credit bundles with expiry (`expires_at` field already in schema)
- Push notification when `creditBalance` drops to ≤3 — ✅ added to `onSessionsLow` CF
- Schedule badge in trainer view: show `creditBalance` instead of legacy `totalSessions`
- Freemium model: ≤3 clients free, paid unlimited (Notion-style)
- Mobile app: Capacitor wrapper for iOS/Android (PWA already set up)
