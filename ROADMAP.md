# ElitePro Development Roadmap

## Phase 1 — Credit System Acceptance Testing
Verify the credit/session ledger end-to-end with real student
scenarios: booking, Mark Complete deduction, cancellation within/
outside 24hr policy, reschedule cap, top-up.

**Current status:** Implemented and deployed. Session credit is now deducted
server-side the moment a session is booked (`onScheduleBooked` Cloud Function),
rather than waiting for Mark Complete. Cancelling 24h+ before a session refunds
the credit, capped at 2 free early-cancels per client per month; cancelling
within 24h keeps the charge (`onScheduleCreditUpdate` Cloud Function). Bookings
made before this shipped are caught up automatically (charged once, on
Mark Complete or late-cancel) so old and new bookings coexist without double-
charging. Trainer-confirmed working for booking and early-cancellation.
"Reschedule cap" (confirmed 2026-07-20) refers to this same 2-per-month
early-cancel cap, not a separate feature — already covered by the 12-test
automated suite. Remaining acceptance testing: top-up rate selection and
renewal reminders still need trainer confirmation with a real account.

## Phase 2 — UI Cleanup
Polish and simplify existing screens before adding new features.

**Current status:** Implemented (2026-07-20). `STYLE.md` design-system
reference added (color usage rules, type scale, spacing, density tiers,
empty-state contract, micro-interaction standards) and the app audited
against it: session-remaining color logic unified into one utility,
hardcoded hex colors tokenized, a dark-mode background bug fixed, empty
states given action buttons, list density reviewed page-by-page, and a
real login-page layout bug fixed along the way.

## Phase 3 — GoCardless Direct Debit Subscription Billing
Monthly subscription plans (three tiers, 52-week annualised
pricing, pro-rata first payment, roll-over logic). This replaces
pack-based payments as the primary billing model.

**Current status:** Not started. No GoCardless integration, subscription
tiers, or related billing code exist anywhere in the repository.

## Phase 4 — PWA / FCM Push Notifications
Installable app experience + push reminders for bookings,
renewals, and credit events.

**Current status:** Implemented and live. The app is installable as a PWA
(manifest, install prompt, offline IndexedDB persistence) and FCM push
notifications are deployed and live (Cloud Functions send push for new
messages, schedule changes, new plans, new workout logs, and low sessions).

## Phase 5 — Venue Marketplace (Future)

**Trigger condition:** Do NOT start until ElitePro has its
first batch of external coach users (5-10 coaches). They are
the demand side of this marketplace.

**Concept:** Match independent studios' dead hours (off-peak,
discounted) with coaches who need flexible venues — an
alternative to fixed monthly rent at chain gyms (£600-1000/mo).

**Business model:** Pure subscription, no commission.
- Studio side: higher tier (~£40-60/mo) — dead hours revenue
  recovery, scheduling automation
- Coach side: low tier (~£10-15/mo), pausable anytime —
  "zero fixed cost" is the core pitch vs chain gyms
- Bundle with ElitePro coach subscription later

**Key principles:**
- Retention comes from workflow tools (calendar, cancellation
  policy, invoicing records), NOT from matchmaking
- Studios control their own off-peak pricing and time slots
- Peak / off-peak two-tier pricing is a day-one feature
- Long-term moat: data loop between student bookings
  (ElitePro) and venue availability
