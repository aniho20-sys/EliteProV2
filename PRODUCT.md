# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two first-class roles, weighted **equally** in design trade-offs (confirmed by Ani, 2026-09-04 — neither role is sacrificed for the other by default; conflicts go to Ani case by case).

- **Independent personal trainers** — the paying side. Two markets carry equal weight (confirmed 2026-09-04): Hong Kong independent coaches, and English-speaking coaches overseas. Every design must work for both; neither market's situation may be assumed. They run their own book of clients without a chain gym's back office: programming, scheduling, chasing session credits, invoicing, and keeping clients from quietly drifting away. They work from a phone on the gym floor, between sets.
- **Their clients ("students")** — attached to exactly one trainer via a 6-character invite code. They view assigned plans, log training (including sessions done alone, with no coach present), track body stats and lifts, see how many session credits remain, book sessions, and message their coach. They also work from a phone, usually mid-workout at a rack.

**Owner:** Ani — owner, decision-maker, and herself a trainer. She uses the app on **mobile only** and has no terminal, CLI, or console workflow. Any capability she must personally exercise has to exist as an in-app UI action.

## Product Purpose

Give an independent trainer one place for the whole coaching relationship — plans, sessions, session-credit accounting, invoices, messaging, progress — so nothing about a client lives in a screenshot, a WhatsApp thread, or the trainer's memory. The three problems the product names as its own: programmes scattered across five places, nobody knowing how many sessions a client has left, and finding out a client quit only after they have gone.

Success means a trainer runs their entire business inside ElitePro and their students stay engaged enough to keep booking — not that either side merely opens the app.

## Positioning

- **Session credits and booking are first-class, not add-ons.** Purchased packs, server-side deduction on booking, a one-session overdraft cap, refunds on early cancellation with a monthly cap, an append-only credit ledger, and top-up rates. The named competitors (Trainerize, ABC Trainerize, PT Distinction) do programming and progress but not session-pack accounting or booking.
- **Free to start, $0 setup fee, no branded-app fee, no charge to accept payments, and no commission on money the trainer collects.** Trainers connect their own GoCardless account; ElitePro never takes a cut of their revenue.
- **Bilingual by construction, with training vocabulary deliberately left in English.** Interface chrome renders from an English source dictionary with an approved Traditional Chinese (Hong Kong) dictionary at 100% coverage; exercise names, sets/reps/kg/RPE, muscle and equipment tags never pass through translation, because the Hong Kong gym floor speaks English for all of it.

## Operating Context

- **Phone-first, in a gym.** iPhone is the reference device; Ani's own verification always happens on a real phone. Android Chrome has not yet had an equivalent pass.
- **Installed as a PWA** with offline IndexedDB persistence — gyms have poor signal and the app must keep working after first load.
- **Client acquisition is person-to-person.** A trainer shares an invite code or link (WhatsApp, in person); the student signs up, enters the code, and completes an intake questionnaire before first use.
- **Money moves outside the app as often as inside it.** Bank-transfer renewals with a payment sheet the client copies details from, PDF invoices shared via the native share sheet, and (in progress) GoCardless Direct Debit subscriptions each trainer authorises with their own GoCardless account.
- **Two independent record types that must never be conflated:** a client's workout log is a personal training diary (including solo sessions); a scheduled session is a paid commercial appointment. Only a trainer's explicit "Mark Complete" spends a credit.

## Capabilities and Constraints

**Built and live:** trainer and client dashboards; workout plans and reusable templates; a shared exercise library with per-trainer overrides, aliases, movement-pattern classification and soft-merge of duplicates; workout logging with per-exercise unit types, rest timer and draft recovery; body-composition and per-exercise progression charts; scheduling with booking, cancellation policy and credit accounting; session credits, top-up ledger and renewal prompts; invoices with client-side PDF generation; in-app messaging; push notifications; business analytics; monthly progress reports; a public landing page; bilingual EN / zh-HK interface; PWA install and offline persistence.

**In progress:** GoCardless subscription billing (schema, rules and OAuth connect are live; subscription creation, mandate flow, payment-failure handling and pause/cancel are not built). Trainer-facing subscription tiers of 4 / 8 / 12 sessions per month are designed with a rate locked at signup.

**Held behind a flag:** the gym啦 venue side (operator role, studios, slot booking, trainer applications) is written but disabled via `GYMLA_ENABLED`, and gated on ElitePro first having 5–10 external coaches.

**Durable constraints future work must preserve:**

- The owner has no terminal — never design a workflow that requires her to run a script, a CLI, or a console export.
- `window.print()` does not work on iOS Safari; any print/export feature generates a real PDF client-side and hands it to the native share sheet.
- Historical records are never batch-rewritten; consolidation uses pointers resolved at read time.
- Money is always rendered through the shared currency helper; a trainer's currency is a profile field, invoices carry their own.
- External-service credentials are read at call time and their absence degrades gracefully; they may never block a deploy.
- Automated tests run against emulators, never the production Firebase project.
- Interactive changes are only verified by a real tap on a real device; a build, a screenshot, or a unit test is not verification.
- Stack is fixed by the existing codebase: React 19 + Vite, React Router (HashRouter), Firebase (Firestore, Auth, Functions, FCM, Hosting), plain CSS with light/dark variables. No CSS-in-JS, no Tailwind.

**Terminology:** "student" and "client" both refer to the trainer's client; "堂" (not 課時) for a session in Chinese, "教練" for trainer, "預約" for booking, "剩餘" for remaining.

## Brand Commitments

- Name: **ElitePro**. The venue-marketplace module carries its own name, **gym啦**, and is currently hidden.
- Existing identity assets in the repository: `STYLE.md` (committed design-system reference), app icons and favicons, `public/og-image.png`, splash screens. `STYLE.md` states a "dark luxury + gold accent" direction while the shipped palette is a blue/purple/orange system — an unresolved discrepancy for a future `DESIGN.md`, not settled here.
- Voice (English source copy, as shipped on the landing page): plain, second-person, concrete about the trainer's own day; problems named as scenes rather than features. No hype, no invented metrics.
- Chinese register is fixed and mechanically tested: written Traditional Chinese, Hong Kong vocabulary, no Cantonese colloquialism in the interface. Cantonese is the language of internal working documents only.
- The language picker's two options are written literally as `English` and `繁體中文` and are never translated.
- Craft bar for new interface work, named by Ani on 2026-09-04: **Linear, Stripe Dashboard, Cal.com**. Their level of finish is the standard; the register is the software-tool canon executed straight, not a fitness-app idiom.

## Evidence on Hand

- **Real product screenshots:** `public/screens/plan.png`, `sessions.png`, `dashboard.png` (used on the landing page).
- **Competitor pricing** with cited sources, in `src/pages/LandingPage.jsx`: Trainerize, ABC Trainerize, PT Distinction. Marketing reports in `reports/` track changes; anything unverified is labelled as such.
- **Permanent QA accounts** for multi-tenant testing (a second trainer identity and its client), documented in `CLAUDE.md`.
- **Verified end-to-end run:** landing page → sign up → invite code → add client → book → Mark Complete → credit deduction, walked on a real iPhone on 2026-08-11.
- **Internal record:** `ROADMAP.md`, `PROGRESS.md`, and dated reports in `reports/` (design decisions, audits, bug post-mortems, weekly SA/CEO/marketing reports).

**Absences that must never be fabricated:** there are no customer testimonials, no case studies, no press, no named customers, and no published user counts. The founding-member counter exists in-app but its live value has not been read. Do not invent numbers, quotes, logos, or social proof for any surface.

## Product Principles

1. **Both roles are first-class.** A change that makes the trainer's day faster at the student's expense (or the reverse) is a trade-off to raise, not to make silently.
2. **Money and credits are never inferred.** Balances, debts and refunds are computed and recorded server-side in an append-only ledger; a client's personal training log never spends a credit and never completes a session.
3. **Two markets, one interface.** Hong Kong and English-speaking overseas coaches carry equal weight: interface chrome is fully bilingual, training vocabulary stays English, and no surface may assume one market's context.
4. **Zero take-rate.** ElitePro earns from a trainer's monthly subscription (confirmed 2026-09-04) and never from commission on the money a trainer collects. Nothing in the product may be designed as if a cut were available.
5. **The phone is the product.** Every capability must be reachable and verifiable one-handed on a phone in a gym, offline-tolerant, by an owner with no terminal.

## Accessibility & Inclusion

- **Language coverage is a hard gate:** while the language switcher is exposed, every interface key must have an approved Traditional Chinese value; a missing one fails the build. A half-translated interface is treated as a defect, not a fallback.
- One-handed phone use and legibility in gym lighting (light and dark themes both shipped) are standing requirements.
- No formal WCAG conformance level has been chosen yet — **undecided**, to be set with Ani rather than assumed.
