Batch 8 implements the assigned 2026-11-07 decisions. All SQL is in `supabase/migrations/20261107100000_accounts_and_rules.sql`; no existing migration was edited. Existing batch 7 work and protected files were preserved.

Per decision:

- **Cancel deletion:** `get_my_account_deletion` and `cancel_my_account_deletion`, plus `src/api/account.ts`, `src/state/auth.tsx` and `AccountDeletionRecovery.tsx`, gate signed-in members with pending deletion. Keeping the account cancels the request, leaves a voluntary pause and records `account_deletion_cancelled`. Continuing leaving signs out without changing the request. Copy explains the 30-day hold, explicit resume and the inability to restore erased data or closed conversations. Cancellation locks the request and refuses expired or claimed work. Removing the request makes both existing claim RPCs skip it and makes lease renewal fail; the finalizer needs no change.
- **Suspensions:** private `member_pause_causes` separates voluntary pause, timed suspension and ban; the deletion request supplies the deletion cause. `is_paused` remains the old-client projection. Both member and report actions record restrictions. A minute job expires suspensions, restores eligibility and preserves voluntary/deletion pauses. Bans require an admin unban. The existing pause RPC retains its restriction and deletion guards.
- **Withdraw consent:** Settings → privacy explains that matching requires religion and ethnicity, and opens the existing optional leaving-answer/deletion flow. That flow uses the same hold and recovery screen. No second deletion mechanism was added.
- **Halal Cards:** active-session reads, answers and completion already survive Premium lapse; retained and tested. New starts already require Premium or a live connection unlock. Accepting an unstarted invitation now checks that unlock too; declining remains available.
- **Selfies:** unresolved human-review evidence is excluded from purge, including replaced selfies. Existing review deadlines are cleared. Human decisions start a 30-day retention period. Automatic rejection retains its existing one-day rule.
- **Marital changes:** existing RPC already permits every transition between available declarations and logs them. Kept it and the suspicious-change watcher; added transition and alert coverage.
- **Leaving answers:** existing separate RPC/client submission already counts an answer even if deletion fails. Retained it; added an explicit failing-deletion test.
- **Old closes and surviving farewells:** the installed `close_connection` RPC now sends a generic kind note. Farewells survive connection/sender deletion with a nullable sender reference and no saved name; the recipient still dismisses them normally. The client renders translated generic wording and an anonymous heading.
- **Reminders:** schedulers enqueue without spending budgets. Private outbox payloads identify the affected budgets; a successful, fenced settlement increments them once. Failures, coalescing, expiry and settlement retries do not spend extra reminders.
- **Admin removal:** removes tester, sample and tester-switch memberships and tester Premium, then refreshes the old-client tier projection. Real subscriptions remain.

Choices and historical limits:

- “In progress” means an accepted, active Cards session; an invitation is not yet in play. Journal rules are unchanged.
- “Any marital change” means transitions among declarations available to that member. The manifesto’s existing gender rule for declaring currently married remains.
- Human-reviewed evidence uses the full permitted 30 days after either verdict. Farewells retain the existing recipient/read behavior and recipient-deletion boundary; no new expiry was invented.
- Suspension expiry runs every minute. Existing restrictions are inferred from retained action jobs, then Auth deadlines; the existing roughly 100-year Auth restriction is treated as a ban. The old schema did not record a voluntary pause beneath an admin restriction, so that lost historical intent cannot be reconstructed. Known restrictions are imported as administrative causes; other existing pauses as voluntary pauses.
- Existing reminder counters are retained. Older outbox rows lack per-connection references, so their historical delivery attribution cannot be reconstructed reliably. Newly scheduled reminders use delivery accounting.

Files touched (catalogs and `src/api/connections.ts` also contained pre-existing batch 7 edits):

- `src/api/account.ts`, `src/api/connections.ts`, `src/state/auth.tsx`, `src/lib/farewell.ts`.
- `src/components/you/AccountDeletionRecovery.tsx`, `src/components/you/SettingsTab.tsx`, `src/components/connections/FarewellNotes.tsx`.
- `src/i18n/catalog.ts` and `src/i18n/catalogs/am.ts`, `bn.ts`, `es.ts`, `fa.ts`, `fr.ts`, `ha.ts`, `hi.ts`, `id.ts`, `ms.ts`, `ru.ts`, `so.ts`, `tr.ts`, `ur.ts`, `zh-Hans.ts`. All new copy and the corrected deletion explanation are translated in all 16 languages.
- `supabase/migrations/20261107100000_accounts_and_rules.sql`.
- `supabase/tests/database/0229_accounts_and_rules.test.sql` (64 assertions).
- `supabase/tests/database/0223_state_machine_fixes.test.sql`: changed human rejection retention from one day to 30.
- `supabase/tests/database/0224_job_workers.test.sql`: changed unresolved-review retention to no deadline and queued-reminder accounting to zero until delivery; corrected enqueue descriptions.
- `tests/accountRules.test.ts`: generic farewell and existing reason/custom-word rendering.
- `docs/state-machine-reports/8-accounts-and-rules.md`.

Verification: `npm test` passed 555 tests; `npx tsc --noEmit -p .` passed. Targeted ESLint passed with zero warnings. SQL parsing passed for 253 migrations, 79 database tests and 103 SQL-language bodies. `git diff --check` passed. Windows `.cmd` launchers were used for npm/npx.

Not verified: pgTAP execution (to be run afterwards as requested), real concurrent transactions, native recovery/consent screens and RTL/accessibility layouts, actual cron execution, provider delivery and storage erasure. No project, deployment or Supabase CLI was used; no `.env*` file was opened, and no commit, push or prohibited Git operation was run. The historical information limits above remain.

Database feedback correction: the supplied run reported 1,232 passes, one failed assertion in `0047_legal_consent_rpc_boundary.test.sql`, and an aborted `0229`. The legacy close wrapper now checks current legal consent directly before delegating to the farewell RPC, preserving the established public boundary; `0047` is unchanged. Two new behavioral assertions verify that missing consent refuses the close without closing the connection or creating a farewell. The `0229` account-erasure fixture incorrectly retained a member JWT, causing the consent-history cascade to hit its append-only guard. Both fixture erasures now use the service-role identity used by the finalizer and switch back to the recipient afterwards. The production append-only guard is unchanged. Only this batch's migration, pgTAP file and report changed in this correction. The corrected database run is pending; the supplied unit tests and rule parity passed.

Correction validation: reran `npm test` (555 passed), `npx tsc --noEmit -p .` (passed), SQL parsing (253 migrations, 79 database tests, 103 SQL-language bodies; zero problems) and `git diff --check` (passed). Confirmed the new pgTAP file plans and contains 64 assertions. No database or project was contacted; corrected pgTAP execution remains unverified pending the next supplied run.

Second database feedback correction: the supplied run completed all 64 assertions in `0229`, with 1,296 passes overall and one failure: answering an active Cards session after Premium ends. The fixture used `answer` as its key, violating the existing `halal_cards_answers.answer_key` constraint (`^[a-z]:[A-Za-z0-9:_-]{1,80}$`). Changed that fixture key to `q:first`, matching the existing Cards tests. The assertion still requires successful answer submission after the entitlement is removed. No production RPC, constraint or migration changed in this correction; only `supabase/tests/database/0229_accounts_and_rules.test.sql` and this report changed. The supplied failure summary does not include the caught exception; the diagnosis follows directly from the invalid fixture value and schema constraint. The corrected database run remains pending.
