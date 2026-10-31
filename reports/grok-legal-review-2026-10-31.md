# Grok review: Terms of Service and Privacy Policy (2026-10-31)

Reviewed against deploy branch `claude/fitness-app-features-LbxtG` at `8d92fa8` (B83).
Files: `src/pages/TermsPage.jsx` (last updated 26 April 2026), `src/pages/PrivacyPolicyPage.jsx` (last updated 4 October 2026).
This is a pre-launch review, not legal advice. Ani should have a UK solicitor check the final text before taking payments on the stores.

## Ani's decisions that apply (2026-10-31)
- iOS keeps Google sign-in. So the Privacy Policy keeps the Google sign-in lines, and the iOS build needs Sign in with Apple (App Store guideline 4.8). No Apple provider exists in the code yet.
- Ani is a UK sole trader whose registered address is her home. She has no separate work address.
- Health-data consent is done (B79, Grok #27). The Privacy Policy text has to describe how it works now.
- The 52 vs 48 monthly-plan formula is still open (see the last section).

## Terms of Service: must fix before launch
1. **Governing law (s.12).** "Applicable international law" isn't a real governing law. Use the law of England and Wales and the courts of England and Wales, while keeping consumers' rights to bring claims where they live (Scotland, Northern Ireland, Hong Kong).
2. **Who the trader is.** "Elitepro Team" isn't a legal person. Name Ani as a sole trader, for example "ElitePro is operated by [Ani's legal name], a sole trader trading as ElitePro", with a geographic address and an email address. The Consumer Contracts Regulations 2013 require a geographic address for distance sales.
   - Ani doesn't want her home address public. Options: a registered-office or virtual-office address service, or a business address from her accountant. The App Store (EU trader status under the DSA) and Google Play (for paid apps) can also show a developer address publicly, so use the same service address there.
3. **Payments and subscriptions: missing completely.**
   - Trainer plans: free up to 5 clients; Pro monthly; founding price locked for life for the first 30 trainers. Cover auto-renewal, how to cancel, price changes with notice, and refunds.
   - UK 14-day cancellation right for consumers, and how it applies to digital services. Trainers are usually businesses, but some may count as consumers.
   - App Store and Google Play billing: if a plan is bought in-app, the store's terms and refund process apply. Add Apple's required EULA terms, or link to Apple's standard EULA.
   - Payments between trainers and clients through Stripe or GoCardless: say clearly that the contract for training is between trainer and client, that ElitePro isn't a party to it, and that the trainer's own payment provider's terms apply.
4. **Booking and cancellation rules (B82, B83).** Each coach now sets the booking cutoff (default 12 hours) and their own cancellation rule. Say in the Terms that these rules are set by the trainer, are shown to the client before booking, and form part of the trainer–client agreement, with ElitePro only applying them.
5. **Limitation of liability (s.11).** UK law doesn't allow excluding liability for death or personal injury caused by negligence, or for fraud. Remove "physical injury" from the exclusion and add a carve-out for those. Change the "USD $50" cap to GBP. "Not responsible for data loss" (s.10) should be softened to reasonable-efforts wording; UK GDPR security duties can't be disclaimed.
6. **Termination (s.9).** "Without prior notice, at our sole discretion" may be unfair for paying users. Add notice and a pro-rata refund for paid periods unless the termination is for a serious breach.
7. **Changes (s.13).** Keep the 14-day notice. For paid plans, add that the user can cancel before a change takes effect.
8. **Update "Last updated"** and the operator line once the text is changed.

## Privacy Policy: must fix before launch
1. **Controller and processor roles.** Client data is collected by and for the trainer. The trainer is the controller of their clients' data, and ElitePro is the trainer's processor (and the controller only for account and security data). Say this in the policy, and add a short data processing agreement (UK GDPR Art. 28) that trainers accept when they create a coach account.
2. **Health consent (s.3 table).** "Given when you create your account" no longer matches the app. Describe the B79 flow: the client is asked separately, can agree or not, and if they don't agree the link with that coach ends. Withdrawing consent should say it ends sharing with that coach. It shouldn't say it requires deleting the whole account unless that's still true.
3. **Sub-processors (s.4).** Add Stripe and GoCardless (payments), Firebase Cloud Functions, and any email or push provider used. Keep Google sign-in, because iOS keeps it. Add Apple once Sign in with Apple is added.
4. **UK and Hong Kong specifics.**
   - Refer to the UK GDPR and the Data Protection Act 2018. Name the ICO (ico.org.uk) as the UK complaint route, not only "local data protection authority" in the EEA.
   - Transfers: mention the UK Extension to the EU–US Data Privacy Framework (UK–US data bridge) as well as the EU framework.
   - Hong Kong users: add a short PDPO (Personal Data (Privacy) Ordinance) section, with the PCPD as the complaint route.
5. **Response time (s.6).** Use "within one month", which is the UK GDPR wording, instead of 30 days.
6. **Controller identity (s.1).** The same as Terms item 2: Ani as sole trader, with a service address and contact email.
7. **ICO registration.** Ani as a sole trader processing personal data almost certainly has to pay the ICO data protection fee. This isn't a code change, but it's a launch blocker.

## Open business decision: 52 vs 48 (for Ani, not a code change yet)
- Code today: the price is `rate × tier × 13 / 12` (52-week annualised), but each monthly payment credits `tier` sessions (`functions/gcWebhooks.js`: `qty: s.tier`). A tier-4 client pays for 52 sessions a year and receives 48.
- The Stripe product is named "`${tier} sessions a month`". A label that says 4 sessions a month while charging for 4.33 is a misleading-pricing risk under UK consumer law.
- Options for Ani:
  - A: price is `rate × tier` and credit is `tier`.
  - B: keep the 52-week price and credit 52 a year, for example 4 + 4 + 5 every quarter.
  - C: keep both as they are, but describe the plan as "one session a week, billed in 12 equal payments" and credit by weeks.
- Whichever Ani picks, the Terms and the plan picker text must describe it exactly.
