Worker batch report

- 17: Fixed claim fencing, settlement-error handling and exhausted moderation handoff to human review; pending-content visibility remains intended.
- 19: Fixed exhausted selfies staying undecided: handoff starts the existing 30-day review retention clock. Founder decision: whether unresolved review should extend evidence retention.
- 20: Fixed orphaned blur discovery using Storage inventory, including missing/deleted markers. Left duplicate generation alone: deterministic paths and upsert make it redundant work; account deletion already drains this bucket in the earlier fix.
- 39: Fixed photo-analysis completion/release fencing, exhaustion visibility and explicit backfill retry of exhausted rows.
- 52: Fixed summary claim/reclaim/settlement fencing, checked save results and rechecked relationship/consent before saving. Left the client's explicit-retry fallback behavior alone.
- 78: Fixed push settlement/device-retirement fencing; exhausted rows remain visible and no longer block future events. Kept the intentional ambiguous-send policy, existing expiry representation and event-relevance behavior.
- 82: Fixed mail settlement fencing and late failures reopening sent mail; reserve in-flight budget, retain exhausted rows and provide an audited owner retry RPC. SES delivery still lacks provider idempotency.
- 83: Fixed provider pinning from the first fenced claim, separate provider budgets, draining pinned Resend retries after SES activation, uncertain SES probes switching providers and missing operator configuration blocking member mail.
- 92: Fixed shared same-action claims; added a durable, fenced action journal with stable restriction deadlines and visible unfinished intents. An expired unresolved claim cannot change intent.
- 93: Fixed direct-action journaling and database completion fencing. Founder decisions: automatic suspension expiry, restriction causes and restoring voluntary pause on unban; existing behavior remains.
- 23: Fixed overlapping marital-status watcher invocations with serialization. History-based eligibility and disqualification need no new terminal state.
- 79: Fixed reminder budgets advancing on skipped/coalesced/failed enqueues, with serialized scheduling. Left delivery-based budgets and quiet-chat activity resets unchanged: those change the reminder policy.
- 27: Already fine for this batch: the preceding migration retains partial sets and records failed-table counts/errors when sealing. No reopening of potentially opened sets was added.
- 28: Already fine: league jobs already fence commits with lease tokens and retain partial progress; exhaustion is recorded by the existing seal. Retry/reopen policy remains unchanged.

Compatibility: existing RPC names/signatures remain; new fenced entry points have optional token arguments. Legacy callers settle legacy claims, and cannot reclaim or settle token-owned queue work. Fenced work requires the updated Edge workers to drain it. No new member-facing copy was introduced.

Founder decisions: unresolved selfie evidence retention; suspension expiry and pause restoration; any change to delivery-based reminder budgets or resetting quiet-chat budgets after activity. These behaviors were not changed.

Files touched:
- supabase/migrations/20261106100000_job_workers.sql
- supabase/tests/database/0224_job_workers.test.sql
- supabase/tests/database/0192_waitlist_verification_and_referrals.test.sql
- supabase/tests/database/0208_selfie_verification.test.sql
- supabase/functions/moderate/index.ts
- supabase/functions/connection-summary/index.ts
- supabase/functions/send-mail/index.ts
- supabase/functions/send-notifications/index.ts
- supabase/functions/report-action/index.ts
- supabase/functions/_shared/restrictionDuration.ts
- tests/restrictionDuration.test.ts
- docs/state-machine-reports/1-workers.md

Existing tests updated: 0192 and 0208 now inspect the authoritative fenced function bodies rather than the compatibility wrappers. Their behavior assertions are unchanged.

Verification: npm test passed (526 tests); npx tsc --noEmit -p . passed; cached Deno checks passed for all five changed Edge entry points; verify:sql passed. On Windows the requested npm/npx commands were run through npm.cmd/npx.cmd. Added 78 pgTAP assertions and two pure deadline tests.

Not verified: pgTAP execution, concurrent database sessions, deployed workers, live queue contents/cron health and provider delivery. Database tokens fence database writes; they cannot cancel an already-running external Auth/SES/Expo request. Absolute restriction deadlines prevent retries restarting a seven-day suspension, but external exactly-once execution is not proven. Legacy-to-legacy claims lack identity until Edge redeployment; historical mail provider identity cannot be reconstructed. Exhausted moderation is handed off on the next moderation claim (25 per call), while system health retains the stuck count if the worker is unavailable. No Supabase project, existing migration, environment file or unrelated working-tree file was changed.
