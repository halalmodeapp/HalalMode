Accounts and money, items from `docs/IMPLICIT_STATE_MACHINES_SOL.md`.

- 1 — Fixed: startup identity failures stay retryable; protected destination screens remain unmounted during redirects.
- 4 — Fixed: profile, declaration, explicit consent and selfie submission commit atomically; retries are idempotent; restored native drafts must pass the selfie gate again.
- 5 — Fixed: new clients submit displayed document versions and explicit consent atomically; old RPCs remain. Founder decision: sensitive-consent withdrawal and its data consequences.
- 6 — Already fine: `20261106090000` aligned database readiness with the client’s 50-character bio rule.
- 8 — Fixed: active Auth restrictions also prevent resume; pending-deletion resume was already fixed. Founder decision: restoration after an administrative restriction expires.
- 18 — Already fine: `20261106090000` added human selfie verdicts; `20261106100000` escalates exhausted checks and preserves human settlement. Verification remains outside matching readiness as intended.
- 21 — Fixed: expired or detached photo claims cannot save or charge; workers count actual saves; zero saved reviews use the existing localized error.
- 22 — Fixed: declaration history reads and writes serialize. Founder decision: allowable marital-status transitions; existing choices remain available.
- 24 — Fixed: drain all pages of originals, blurred photos, selfies and voice files; fence and renew deletion claims; block new member uploads during pending deletion. Original deadline and resume guards remain. Founder decision: cancellation during the hold.
- 25 — Fixed: optional survey waiting is bounded to three seconds. Founder decision: whether anonymous answers should count only after a successful deletion request; counting behavior is unchanged.
- 73 — Fixed: one expiry-aware entitlement authority serves Premium checks across providers, matching, capacity, Cards, likes and photo advice; writes project the profile tier; cron reconciles it; clients refresh and expire locally. Existing profile-only Premium is imported once as a legacy entitlement, without a continuing profile fallback.
- 74 — Fixed: expired nonreward providers no longer block earned rewards; reward grants serialize and remain idempotent. Earned-month accounting and cron-based accrual remain unchanged.
- 75 — Already fine: `20261106090000` fixed complimentary expiry and repaired its historical orphans; those fixes remain, with shared expiry enforcement added by item 73.
- 76 — Fixed: tester Premium preserves active purchases, comps and rewards; disabling its flag immediately removes tester access; client flags refresh periodically and on foreground. Sample opt-in and tester authorization remain separate controls.
- 84 — Already fine: public intake intentionally reports availability identically for new and existing inboxes, preventing reservation enumeration; the private early reservation survives repeat intake. Removed this batch’s incorrect override. Open app signup and unused invitation scaffolding remain unchanged.
- 85 — Fixed: delayed verification/referral mail refreshes expired capabilities; missing capabilities remain retryable. Reusable, expiring progress links are intentional and remain reusable.
- 86 — Fixed: account referral-code creation serializes. Existing ownership constraints and waitlist linkage remain; no additional ownership model was needed.
- 87 — Fixed: failed claims retain account-scoped invitations for bounded retries; server checks the expected account; concurrent claims return the actual outcome.
- 88 — Fixed: app-only conversions become sticky when readiness is gained or an already-ready referral is inserted, without requiring a progress read.

Files touched:

- `app/legal-consent.tsx`, `app/onboarding.tsx`.
- `src/api/legalConsent.ts`, `src/api/photoCoach.ts`, `src/api/referrals.ts`.
- `src/components/you/SettingsTab.tsx`.
- `src/lib/membership.ts`, `src/lib/referralCode.ts`.
- `src/state/auth.tsx`, `src/state/featureFlags.tsx`, `src/state/session.tsx`.
- `supabase/functions/finalize-account-deletions/index.ts`, `supabase/functions/photo-coach/index.ts`, `supabase/functions/send-mail/index.ts`.
- `supabase/migrations/20261106120000_accounts_and_premium.sql`.
- `supabase/tests/database/0226_accounts_and_premium.test.sql`.
- `supabase/tests/database/0019_connection_capacity.test.sql`, `supabase/tests/database/0190_halal_cards.test.sql`, `supabase/tests/database/0210_grew_up_and_diet.test.sql`, `supabase/tests/database/0212_liked_you.test.sql`, `supabase/tests/database/0221_soft_landing_and_exit.test.sql`, `supabase/tests/database/0223_state_machine_fixes.test.sql`, `supabase/tests/database/0225_matching_and_connections.test.sql`.
- `tests/accountDeletionFinalizer.test.ts`, `tests/membership.test.ts`, `tests/referralPending.test.ts`.
- `docs/state-machine-reports/3-accounts.md`.

Existing test updates: the seven database files listed above now seed entitlements for active Premium scenarios; `0223` describes promotion through the entitlement projection. Its historical orphan-repair fixtures remain deliberately inconsistent. The finalizer unit test now covers all four media buckets and lost claims; membership tests add time/state validation. No existing product expectation was relaxed.

Database feedback corrections: `0196_waitlist_launch_hardening.test.sql` correctly caught an inbox-enumeration regression; removed this batch’s waitlist override, preserving the latest existing uniform-response function. `0208_selfie_verification.test.sql` caught an unnecessary restrictive UPDATE policy naming the insert-only selfie bucket; removed that redundant policy, retaining the deletion-time INSERT guard. Both existing tests are unchanged. The `0226` fixture was wrong to send `.test` addresses to public intake; it now uses validator-accepted addresses, checks private reservation preservation separately from the uniform public reply, and exercises valid selfie inserts before and after a deletion request. Only this batch’s migration, pgTAP file and report changed in this correction.

Second database feedback correction: the supplied run reached every assertion, with 1,133 passes and only the pre-deletion selfie insert failing. The repository’s bare-Postgres shim grants schema usage but no INSERT privilege on `storage.objects`; this RLS test had assumed the platform table grant. The test now grants only INSERT to `authenticated` inside its rolled-back transaction before switching roles. RLS remains enabled and the production migration is unchanged. The post-deletion assertion now requires the error naming `account_deletion_stops_media_inserts`, so an unrelated table-permission error cannot masquerade as successful deletion protection. Only `supabase/tests/database/0226_accounts_and_premium.test.sql` and this report changed in this correction. The supplied summary omitted the caught error; the missing-grant diagnosis is based on the shim source and awaits confirmation by the next database run or full diagnostic.

Validation: `npm test` passed all 536 tests; `npx tsc --noEmit -p .` passed. ESLint passed for the changed client and unit-test files with zero warnings in the original batch. Commands used the Windows `.cmd` launchers because PowerShell blocks the `.ps1` shims. SQL parsing passed: 250 migrations, 76 database test files and 100 SQL function bodies. The new pgTAP file contains 74 assertions. The supplied first database run reported 1,058 passes, two failed assertions and an aborted `0226`; the second reported 1,133 passes and one failed assertion. The next database run is pending. Supplied rule parity reported 89,700 ordered pairs and zero disagreements. Existing localized error copy is reused; no new visible strings were added.

Not verified: corrected pgTAP execution, database migration semantics and concurrent schedules await the supplied database runner; native startup/foreground/expiry behavior and actual Storage/Auth/mail operations were not exercised locally. Storage and Auth cannot share a transaction: lease renewal fences ownership before destructive calls but cannot cancel an external request already in flight. Legacy no-argument consent callers still cannot identify which versions they displayed. Production data, cron health and purchasing integrations were not inspected. No Supabase project, deployment, pre-existing migration or `.env*` file was touched.
