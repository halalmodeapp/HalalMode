# Implicit state machines: Sol 6.1 on ultra

Independent, read-only review of the source, 2026-11-06. Line numbers are as of that date. See `IMPLICIT_STATE_MACHINES.md` for the comparison and which claims were checked.

I found **94 distinct implicit state machines**, after merging overlapping views of the same lifecycle.

This was a static, read-only review. I did not open `.env*`, edit files, run tests, contact remote services, or run anything against a database. Later migrations and function-body patches take precedence below.

**CONFIRMED** means traced in source, including a concrete interleaving where described; it does not mean reproduced at runtime. **PLAUSIBLE** means the risk remains unverified.

For compact references, `M/` means `supabase/migrations/`, and `F/` means `supabase/functions/`. Layers are written out.

1. **Authenticated admission and route gating — medium.**  
   **Where:** [src/state/auth.tsx:49](src/state/auth.tsx:49), especially lines 61, 86, 125, 198, 227 and 290.  
   **Storage/states:** Independent user, startup-ready, profile-ready and onboarding booleans, consent-query state, request generations and route segments imply starting → signed out → authenticated/profile unknown → setup required → consent required → admitted, with retry/recovery branches.  
   **Transitions:** Startup, callbacks and auth events adopt a principal; profile/consent reads select routes; sign-out clears account state. **Layers:** client, Auth, database.  
   **Risk — CONFIRMED:** Startup identity failure and profile-read failure have different outage semantics. Redirects occur in effects, allowing destination UI to render briefly before replacement. Late profile responses are correctly fenced by principal/request generation.

2. **Email/OAuth sign-in request and recovery — low.**  
   **Where:** [app/auth-email.tsx:49](app/auth-email.tsx:49); `src/api/auth.ts:31`; `app/auth.tsx`.  
   **Storage/states:** Separate sending/provider-sending/rate-limit flags, resend countdown and notices imply editable, requesting, sent/cooldown, rate-limited, provider recovery, cancelled and failed.  
   **Transitions:** OTP success starts a 60-second cooldown; errors expose recovery; OAuth browser completion/cancellation returns control. **Layers:** client, Auth.  
   **Risk — CONFIRMED:** OTP has no application deadline, so requesting can remain unresolved indefinitely. Remount resets the local cooldown. Independent sending flags do not express mutual exclusion between sign-in attempts.

3. **Single-use PKCE callback redemption — low.**  
   **Where:** [src/lib/authCodeExchange.ts:3](src/lib/authCodeExchange.ts:3); `src/state/auth.tsx:131`; `src/api/auth.ts:57`.  
   **Storage/states:** In-flight promises and the last sixteen successful exchanges imply unseen → exchanging → remembered success, or failure → retryable; old successes become evicted.  
   **Transitions:** Startup URL, link listeners and OAuth results share exchanges; failures clear the guard. **Layers:** client, Auth.  
   **Risk — CONFIRMED:** Deduplication is memory-only and bounded. **PLAUSIBLE:** A callback repeated after restart/eviction produces an invalid-link error despite an earlier successful redemption.

4. **Onboarding wizard, retained draft and completion saga — high.**  
   **Where:** [app/onboarding.tsx:43](app/onboarding.tsx:43), lines 86, 125, 228 and 256–311; `src/lib/onboardingDraftStorage.ts:40`; `M/0046_legal_document_registry_and_current_consent.sql:166`.  
   **Storage/states:** Step 0–5, seven-day account-scoped draft, ephemeral selfie/acceptance flags, durable `onboarding_complete`, and an in-memory profile-saved marker imply restoring, editing steps, validating, committing profile, completing follow-ups, retrying and completed.  
   **Transitions:** Final profile creation precedes separate marital declaration, sensitive consent, selfie submission and referral work. **Layers:** client, Auth, database, Storage, later Edge/cron moderation.  
   **Risk — CONFIRMED:** Follow-up failure leaves onboarding durably complete but incomplete elsewhere. Restoring directly to review loses the nonpersisted selfie path; final completion revalidates steps 1–3 but does not repeat the native selfie gate.

5. **Versioned legal and sensitive-data consent — high.**  
   **Where:** [M/0180_sensitive_data_consent.sql:15](supabase/migrations/0180_sensitive_data_consent.sql:15); `M/0046_legal_document_registry_and_current_consent.sql:30,77,124`; `src/api/legalConsent.ts:34`; `app/legal-consent.tsx:24`.  
   **Storage/states:** Acceptance history, current document registry and `sensitive_consent_at` imply missing, partial, current, outdated, unavailable and submitting/error states.  
   **Transitions:** Acceptance records history; publication makes prior acceptance outdated; sensitive consent is recorded separately; protected RPCs enforce current acceptance. **Layers:** client, database, administrative publication.  
   **Risk — CONFIRMED:** Reacceptance sends no displayed document versions: a registry change between display and submission can record acceptance of unseen versions. Sensitive and document acceptance are separate commits. No sensitive-consent withdrawal transition was found.

6. **Profile readiness and completion checklist — high.**  
   **Where:** [M/20261027130000_lighter_profile_requirements.sql:17](supabase/migrations/20261027130000_lighter_profile_requirements.sql:17); `src/lib/profileReadiness.ts:6,49`; `src/components/you/ProfileTab.tsx:196,233`.  
   **Storage/states:** Readiness is derived from required fields; recommendations use additional fields and explicit-answer markers. States are incomplete, complete with recommendations outstanding, ready, degraded, unknown and failed.  
   **Transitions:** Edits, attachments and moderation recalculate readiness. **Layers:** client, database, indirectly Edge/cron.  
   **Risk — CONFIRMED:** Latest SQL requires an **80-character bio**, while the client accepts and ticks **50**. A 50–79-character bio can save with no corresponding client checklist gap while matching remains blocked. The real ready banner is server-gated.

7. **Deferred readiness celebration — low.**  
   **Where:** [src/state/readyCelebration.ts:8](src/state/readyCelebration.ts:8); `app/(tabs)/you.tsx:69,76,88`; `src/components/readiness/ReadyMomentHost.tsx:13`.  
   **Storage/states:** Module-global pending/held flags plus a screen-local prior-readiness reference imply idle → observed/held → released/visible → dismissed/start chosen.  
   **Transitions:** Observed server readiness improvement queues celebration; leaving editing releases it; actions clear it. **Layers:** client.  
   **Risk — CONFIRMED:** The global state has no account identity and is not cleared by auth cache cleanup. **PLAUSIBLE:** An undismissed celebration survives an account switch. Readiness reached outside the observation window can miss celebration entirely.

8. **Member pause/resume — high.**  
   **Where:** [M/0011_account_controls.sql:3](supabase/migrations/0011_account_controls.sql:3); `src/api/account.ts:4`; `src/components/you/SettingsTab.tsx:158`; `M/0031_account_deletion_requests.sql:23`.  
   **Storage/states:** One `is_paused` bit represents member pause, deletion pause and administrative restriction; local state and confirmation flags mirror it.  
   **Transitions:** Member pause/resume RPC, deletion and moderation/admin all write the same bit. **Layers:** client, database, administrative Edge.  
   **Risk — CONFIRMED:** Resume does not distinguish pause causes or exclude pending deletion. A member can resume matching participation while irreversible deletion remains scheduled.

9. **Physical location, permission recovery and travel mode — medium.**  
   **Where:** [src/components/you/ProfileTab.tsx:511](src/components/you/ProfileTab.tsx:511), lines 570 and 598; `app/onboarding.tsx:156`; `M/0045_device_only_profile_location_updates.sql:124`.  
   **Storage/states:** OS permission and UI flags imply absent, explaining, denied, permanently denied, locating, geocoding, saving, physical location and travel location. Both saved locations use identical profile fields.  
   **Transitions:** Device lookup, settings recovery and Premium city selection overwrite location. **Layers:** client/OS, database.  
   **Risk — CONFIRMED, approved departure:** Server accepts arbitrary valid coordinates without enforcing Premium or device provenance. No home/travel distinction or expiry exists, so Premium expiry cannot restore home location.

10. **Profile/preferences autosave and retained edits — high.**  
    **Where:** [src/hooks/useAutosave.ts:46](src/hooks/useAutosave.ts:46); `src/lib/autosave.ts:6`; `ProfileTab.tsx:362,379`; `PrivateTab.tsx:74`; `src/state/unsavedChanges.ts:22`.  
    **Storage/states:** Dirty snapshots, local pending storage, baseline, timers, in-flight promise and failure counters imply locally retained, invalid, debouncing, sending, partially committed, synchronized, offline/backoff and parked after refusals.  
    **Transitions:** Four-second quiet period/minimum gap sends edits; navigation/background flushes; failures retry or park. **Layers:** client/local storage, database.  
    **Risk — CONFIRMED:** Multi-RPC saves can partially commit while cache updates await total success. “Saved” is independent of local persistence success. A flush during an in-flight request clears its timer without ensuring a later dirty version is scheduled. Navigation does not await saving.

11. **Private media upload, validation, attachment and removal — high.**  
    **Where:** [src/api/profileMedia.ts:52](src/api/profileMedia.ts:52); `M/20261016075804_validate_profile_media_bytes.sql:23,107,134`; `F/validate-profile-media/index.ts:91`.  
    **Storage/states:** Storage object, expiring validation bound to object revision, profile attachment and cleanup results imply uploaded/unvalidated → validated → attached; expired validation, detached, cleanup-pending and orphan branches.  
    **Transitions:** Upload, Edge byte validation, database attachment, replacement and separate object removal. **Layers:** client, database/Storage, Edge.  
    **Risk — CONFIRMED:** No durable cleanup queue covers interrupted uploads or failed detach cleanup. Unattached objects consume quotas. Voice attachment retries lack photo attachment’s already-attached shortcut and can fail after a successful but unacknowledged commit.

12. **Photo cropping — low.**  
    **Where:** [src/components/you/PhotoCropSheet.tsx:43](src/components/you/PhotoCropSheet.tsx:43), lines 85, 131 and 144; `ProfileTab.tsx:615,650`.  
    **Storage/states:** URI, dimensions, zoom/pan, saving/error and parent sheet state imply closed → decoding → editing → rendering → handed to upload, with cancellation/failure.  
    **Transitions:** Selection opens, decode enables gestures, confirmation renders JPEG or crop metadata, parent consumes result. **Layers:** client/OS.  
    **Risk — CONFIRMED:** Decode results have cancellation fencing; rendered save results do not. **PLAUSIBLE:** Closing/replacing the sheet while rendering delivers an obsolete result to the parent.

13. **Optimistic photo ordering — medium.**  
    **Where:** [src/components/you/ProfileTab.tsx:762](src/components/you/ProfileTab.tsx:762); `src/components/you/PhotoReorderGrid.tsx`; `M/0145_reorder_profile_photos.sql:17`.  
    **Storage/states:** Local order, captured prior order, request and persisted photo array imply dragging → optimistic/persisting → acknowledged or rollback.  
    **Transitions:** Reordering updates immediately; database accepts only a permutation of current attachments. **Layers:** client, database.  
    **Risk — CONFIRMED:** Repeated reorder requests have no generation/serialization guard; old responses or rollback can overwrite newer order. A legacy tile without a storage path changes locally and exits without persistence or error.

14. **Avatar crop applicability — low.**  
    **Where:** [src/components/you/ProfileAvatar.tsx:26](src/components/you/ProfileAvatar.tsx:26); `src/api/profileMedia.ts:260`; `M/0187_avatar_crop.sql:16`.  
    **Storage/states:** Crop JSON referencing a photo plus current leading photo imply default, applicable crop, stale/ignored crop, editing, optimistic save and refetch-after-failure.  
    **Transitions:** Editing saves crop; changing the leading photo invalidates applicability by path comparison. **Layers:** client, database.  
    **Risk — CONFIRMED:** Database does not require the crop path to be attached or current. Nullable numeric arguments pass the setter’s `NOT BETWEEN` checks, allowing incomplete crop JSON. Stale crop data persists indefinitely.

15. **Private-media authorization and URL renewal — medium.**  
    **Where:** [src/hooks/usePrivateMedia.ts:9](src/hooks/usePrivateMedia.ts:9); `src/lib/privateMediaQuery.ts:6`; `src/api/privateMedia.ts:5`; `src/components/ui/ProfileImage.tsx:6`.  
    **Storage/states:** Account/path-scoped URL cache, 60-second capability expiry, stale threshold, screen activity and one-retry marker imply inactive, requesting, usable, stale, renewing and unavailable.  
    **Transitions:** Focus/ensure/error paths renew; principal changes clear caches. **Layers:** client, database/Storage.  
    **Risk — CONFIRMED:** Issued URLs remain usable until expiry after access revocation. Renewal has no periodic timer; automatic image recovery is once per path, so later failures can require manual retry. **PLAUSIBLE:** Failed native cache clearing retains previously viewed bytes after account change.

16. **Voice-introduction recording and publication — medium.**  
    **Where:** [src/components/you/ProfileTab.tsx:286](src/components/you/ProfileTab.tsx:286), lines 307, 323, 356 and 948.  
    **Storage/states:** Recorder state, permission, finishing/saving flags, local URI and persisted voice fields imply permission → preparing → recording → stopping → uploading → attached → URL resolved/published.  
    **Transitions:** Button or approximately thirty-second limit stops recording; upload replaces prior voice; signing refreshes display. **Layers:** client/OS, database/Storage, validation Edge.  
    **Risk — CONFIRMED:** Attachment commits before URL signing. Signing failure reports save failure despite successful publication. **PLAUSIBLE:** Unfenced completion after navigation/account switch affects stale UI/cache state.

17. **Automatic moderation and human-review handoff — high.**  
    **Where:** [M/0178_content_moderation.sql:10](supabase/migrations/0178_content_moderation.sql:10); latest claim/settle in `M/20261026090000_selfie_verification.sql:129,162`; `F/moderate/index.ts:247`; `M/20261021200000_admin_trust_safety_and_system.sql:13,42`.  
    **Storage/states:** Lease, attempts, decision/decided time and reviewed metadata imply queued, leased, retryable, allowed, removed, human review, reviewed, superseded and exhausted. Decision labels are explicit; transitions are distributed.  
    **Transitions:** Publication enqueues; cron claims; Edge decides; administrative review marks completion. **Layers:** client, database, cron, Edge, admin.  
    **Risk — CONFIRMED:** Content remains visible while pending. Four failed claims leave undecided work outside both normal claims and the human-review list. Settlement/release has no lease token; late workers can affect newer claims. Edge ignores settlement RPC errors.

18. **Selfie submission and verification verdict — high.**  
    **Where:** [M/20261026090000_selfie_verification.sql:35](supabase/migrations/20261026090000_selfie_verification.sql:35), lines 68, 101 and 182; `src/api/selfie.ts:27`; `SelfieVerificationCard.tsx:18`.  
    **Storage/states:** Explicit status plus path/submission/decision metadata imply none → uploaded → pending → verified/review/rejected; replacement returns to pending.  
    **Transitions:** Submission resets verdict; worker settles only the current path; rejection permits retake. **Layers:** client/OS, database/Storage, cron, Edge, admin.  
    **Risk — CONFIRMED:** `review` has no traced verdict-resolution exit: retake UI is hidden, and admin “reviewed” changes queue metadata only. Pending can also stick after exhausted moderation. Matching readiness does not require verification.

19. **Selfie retention and evidence destruction — high.**  
    **Where:** [M/20261027110000_selfie_retention.sql:14](supabase/migrations/20261027110000_selfie_retention.sql:14), lines 34, 51, 69, 84 and 102; `F/moderate/index.ts:254`.  
    **Storage/states:** File registration, `purge_after`, `purged_at`, Storage existence and separate verdict imply orphan, registered/undecided, retention countdown, due, removed/unmarked and purged/verdict retained.  
    **Transitions:** Submission registers; replacement retires prior file; decision sets retention; scheduled cleanup removes bytes. **Layers:** database/Storage, cron, Edge.  
    **Risk — CONFIRMED:** Registered undecided files have no purge deadline, so exhausted moderation can retain them indefinitely. Review evidence can expire while review remains unresolved. Verified status intentionally survives deletion of its evidence.

20. **Blurred-photo derivative generation and garbage collection — high.**  
    **Where:** [M/20261028090000_liked_you_and_retention.sql:252](supabase/migrations/20261028090000_liked_you_and_retention.sql:252), lines 289–336; `F/moderate/index.ts:214,265`.  
    **Storage/states:** Current top-three attachment, derivative object and marker imply missing → generating → uploaded/unmarked → ready → stale → removal-pending → forgotten.  
    **Transitions:** Cron generates missing derivatives and removes marked detached ones. **Layers:** database/Storage, cron, Edge.  
    **Risk — CONFIRMED:** Profile deletion cascades the marker while finalization omits the blurred bucket; garbage collection loses its only index to remaining bytes. Upload followed by marker failure likewise leaves untracked derivatives. No generation lease prevents duplicate work.

21. **Halal Bot photo-advice quota and claims — medium.**  
    **Where:** [M/20261105120000_soft_landing_and_exit.sql:158](supabase/migrations/20261105120000_soft_landing_and_exit.sql:158), lines 170, 212 and 270; `F/photo-coach/index.ts:32`; `PhotoCoachCard.tsx:23`.  
    **Storage/states:** Advice/null, counted flag, claim token/time, first-look marker and usage counter imply free initial batch, reserved look, expired/reclaimable, completed, failed/no charge and exhausted/free-or-Premium access.  
    **Transitions:** Claim reserves quota; token-matching success records advice and charges; failure waits for expiry. **Layers:** client, database, Edge.  
    **Risk — CONFIRMED:** Saving checks token but not deadline/current attachment. An expired removed-photo claim can finish after another photo takes its freed reservation, exceeding the free quota. A request reviewing zero photos can still appear successful.

22. **Marital declaration and acceptance preferences — medium.**  
    **Where:** [M/20261027090000_marital_status.sql:13](supabase/migrations/20261027090000_marital_status.sql:13), lines 18, 56 and 83; `MaritalSections.tsx`.  
    **Storage/states:** Nullable status, accepted-status array and history imply undeclared, never married, divorced, widowed and currently married, with independently saved preferences. Labels are explicit; transitions are not.  
    **Transitions:** Any gender-permitted declaration can replace another; actual changes append history. **Layers:** client, database, matcher.  
    **Risk — CONFIRMED:** No transition rule prevents married → never married. Unlocked read-before-write can log inaccurate history under concurrent declarations. A partial onboarding completion can leave status null while basic readiness passes.

23. **Timed marital-status suspicion detection — medium.**  
    **Where:** [M/20261027090000_marital_status.sql:393](supabase/migrations/20261027090000_marital_status.sql:393), scheduler at 448.  
    **Storage/states:** Status history, duration thresholds, flip counts and `alerted_at` imply unsettled married → settled married → changed/pending observation → qualified/disqualified → alerted.  
    **Transitions:** Hourly cron recognizes qualifying latest changes, creates review/mail work and marks alerted. **Layers:** database, cron, mail/admin; client supplies declarations.  
    **Risk — CONFIRMED:** Correctness depends on the separately maintained history; disqualification has no explicit terminal state. **PLAUSIBLE:** Overlapping invocations select the same unlocked qualifying rows and duplicate alerts.

24. **Account deletion, hold and erasure — high.**  
    **Where:** [M/0031_account_deletion_requests.sql:5](supabase/migrations/0031_account_deletion_requests.sql:5); latest claim `M/0042_account_deletion_30_day_grace.sql:3`; `F/finalize-account-deletions/index.ts:25`; `SettingsTab.tsx:175`.  
    **Storage/states:** Request time, processing lease, attempts/errors, paused profile and closed connections imply requested → thirty-day hold → eligible → leased → partially erased → Auth deletion/cascade success, or failed/reclaimable.  
    **Transitions:** Request pauses/closes; cron finalizes; failure releases; deletion of the request through cascade represents success. **Layers:** client, database/Storage/Auth, cron, Edge.  
    **Risk — CONFIRMED:** No cancellation/recovery transition exists despite the hold. Re-login/resume leaves destruction scheduled. Re-request resets the clock. Cleanup omits orphan original media and blurred media, and lists only one selfie page. Claims lack ownership tokens. **PLAUSIBLE:** Concurrent return/upload races finalization.

25. **Optional exit survey and once-only recording — medium.**  
    **Where:** [M/20261105120000_soft_landing_and_exit.sql:98](supabase/migrations/20261105120000_soft_landing_and_exit.sql:98), lines 107 and 112; `SettingsTab.tsx:577,589`.  
    **Storage/states:** Local reason/note, per-account mark and separate anonymous aggregate imply unanswered → choosing → recording/marked, or skipped; deletion is subsequent.  
    **Transitions:** First answer writes mark and aggregate; retries ignore replacements; deletion removes mark but preserves aggregate. **Layers:** client, database, admin statistics.  
    **Risk — CONFIRMED:** An exit can be counted even when deletion fails or the member returns. Optional recording is awaited without deadline before deletion, allowing the optional step to delay departure.

26. **Matching eligibility, dormancy and re-entry — high.**  
    **Where:** [M/20261105090000_league.sql:230](supabase/migrations/20261105090000_league.sql:230), lines 1049, 1218 and 1469; `M/20261104100000_chosen_countries.sql:20`; `src/matching/league.ts:144`.  
    **Storage/states:** Readiness, pause, consent, preferences, safety history, capacity and activity imply ineligible → eligible → dormant after fourteen days → active again. Pair eligibility changes independently.  
    **Transitions:** Completion, consent, resume, activity and capacity changes affect admission; later commit/show/pick stages recheck different predicates. **Layers:** client, database, cron, Edge.  
    **Risk — CONFIRMED:** Commit/show/pick predicates omit readiness/onboarding checks present in pool admission. Required photos/bio can disappear after preparation without invalidating cards. No deletion-request exclusion exists. **PLAUSIBLE:** Unlocked hard-fact edits race advisory-locked matching operations.

27. **League-day orchestration — high.**  
    **Where:** [M/20261105090000_league.sql:45](supabase/migrations/20261105090000_league.sql:45), lines 671–755; `M/20261105100000_remove_old_matcher.sql:14`.  
    **Storage/states:** Explicit phase check plus wave counters, return cursor and sealing metadata imply prepare → returns → main → makeup waves → top-up waves → sealed. Legal transitions remain implicit.  
    **Transitions:** Worker requests advance phases when associated jobs finish or exhaust attempts; sealing records results and queues notifications. **Layers:** database, cron, Edge.  
    **Risk — CONFIRMED:** Exhausted jobs do not prevent sealing: sealed can mean missing/partially failed rounds. The cycle has no repair/reopen transition. **PLAUSIBLE:** Mid-cycle configuration changes alter the remaining pipeline.

28. **League table-job ownership, partial commit and retry — high.**  
    **Where:** [M/20261105090000_league.sql:65](supabase/migrations/20261105090000_league.sql:65), lines 808, 953 and 1011; `F/generate-round/league.ts:70`.  
    **Storage/states:** Explicit status, token/deadline, attempts, errors and committed-seat counts imply pending → leased → done; failure/expiry → retry; exhaustion → failed.  
    **Transitions:** Claims assign ownership; chunk commits renew leases; retries use remaining seats; Edge budgets start successor workers. **Layers:** database, cron, Edge.  
    **Risk — CONFIRMED:** Four failed claims abandon the table for that day, including preparation work; prior partial commits remain. **PLAUSIBLE:** Slow legitimate work consumes attempts through lease expiry. Token fencing correctly rejects reclaimed workers’ commits.

29. **Country-table rotation and coverage cycle — medium.**  
    **Where:** [M/20261105090000_league.sql:420](supabase/migrations/20261105090000_league.sql:420), schema at 57.  
    **Storage/states:** Frozen group count, games, start date and cycle length plus date/hash arithmetic imply unscheduled → frozen schedule → daily rotation → renewal due → rebuilt.  
    **Transitions:** First use creates schedule; days/games rotate opponent groups; expiry rebuilds against current population. **Layers:** database, cron, Edge.  
    **Risk — CONFIRMED:** Population can change while group counts remain frozen; hashing does not impose a hard table-size bound. **PLAUSIBLE:** Growth or skew creates oversized tables before renewal, breaking worker budget assumptions.

30. **Timed member round — high.**  
    **Where:** [M/20261105090000_league.sql:987](supabase/migrations/20261105090000_league.sql:987), lines 168, 211 and 1314; `M/0004_matcher.sql:114`; `M/0164_hide_is_two_way_in_current_sets.sql:21`.  
    **Storage/states:** Round existence, cycle date, opening/expiry/submission timestamps and introductions imply absent → prepared → open → submitted or expired. Future and current rounds coexist.  
    **Transitions:** Preparation creates; Fajr opens by time; selection submits; cleanup marks stale rounds submitted. **Layers:** client, database, cron, Edge.  
    **Risk — CONFIRMED:** `submitted_at` conflates deliberate submission and housekeeping expiry. Physical decision expiry lags UI time expiry. **PLAUSIBLE:** Missing preparation before Fajr permanently shortens the set because later card additions are prohibited.

31. **Daily availability and answer-debt gate — high.**  
    **Where:** [M/20261105090000_league.sql:1469](supabase/migrations/20261105090000_league.sql:1469); `M/0189_all_owed_answers.sql:5`; `M/20261105100000_remove_old_matcher.sql:58`; `app/(tabs)/daily.tsx:293`.  
    **Storage/states:** Prioritized reads derive consent-required, answers-owed, profile-not-ready, ready, scheduled, complete, capacity-full, missing-inputs, narrow-filters, waiting-first-set and empty. Debt derives from partner/own question and answer completion.  
    **Transitions:** Underlying edits, partner completion, own catch-up, closure and time change the projection. **Layers:** client, database, cron/Edge suppliers.  
    **Risk — CONFIRMED:** Partial answers create no answer debt until one partner finishes. Debt has no timeout. Future rounds outrank today’s completed state. Countdown zero changes wording without forcing refresh, allowing stale foreground screens.

32. **Introduction decisions and ranking — medium.**  
    **Where:** [M/20261105090000_league.sql:1289](supabase/migrations/20261105090000_league.sql:1289); `M/0019_connection_capacity.sql:210`; `M/0066_ranked_selections.sql:39`; `M/0086_expiry_and_single_active_config.sql:20`.  
    **Storage/states:** Selection row/decision enum, rank, decision time and round submission imply undecided → kept/released/soft-selected/passed → expired or connected. Enum values do not declare transitions.  
    **Transitions:** Single actions and bulk submission write decisions; wrappers assign ranks; stale nonmutual keeps expire. **Layers:** client, database, cron.  
    **Risk — CONFIRMED:** Invalid league picks are silently removed without rejected-ID feedback; client confirmation can describe requested rather than accepted picks. Decision/rank/submission fields lack one invariant. Introduction/viewer/subject tuple identity is guarded.

33. **Pair exposure, cooldown and permanent second pass — medium.**  
    **Where:** [M/20261105090000_league.sql:123](supabase/migrations/20261105090000_league.sql:123), lines 1086, 1125 and 1245; `M/0096_make_first_passes_visible.sql:22`.  
    **Storage/states:** Directed exposures, last shown, pass count/time, cooldown and retirement imply unseen → seen/repeatable → first-pass cooldown → eligible again; second pass → retired permanently.  
    **Transitions:** Dealing increments exposure; pass updates pair history; time releases first cooldown; hide retires. **Layers:** client RPC, database, cron/Edge matcher.  
    **Risk — CONFIRMED:** First pass appears as ordinary release in selections while its consequence lives elsewhere. A still-visible card can have its pick silently discarded. The current UI has no pass caller. Historical ninety-day second-pass expiry no longer exists.

34. **Directional blocking with bilateral consequences — medium.**  
    **Where:** [M/0019_connection_capacity.sql:159](supabase/migrations/0019_connection_capacity.sql:159); `M/0033_blocked_member_management.sql:4`; `M/0048_introduction_scoped_safety_actions.sql:92`; `BlockedMembersSheet.tsx`.  
    **Storage/states:** Independent directional block rows produce unblocked, one-sided blocked and mutually blocked states; connection closure and queue removal persist separately.  
    **Transitions:** Block closes/removes relationships and promotes other queued matches; unblock removes only the caller’s row. **Layers:** client, database, matcher.  
    **Risk — CONFIRMED:** Unblocking does not restore a connection or future eligibility where a lifetime connection record exists. The visible block toggle does not represent that permanent consequence.

35. **Permanent bilateral hiding — medium.**  
    **Where:** [M/0071_hide_is_relationship_scoped.sql:21](supabase/migrations/0071_hide_is_relationship_scoped.sql:21); `M/0072_hiding_closes_the_connection.sql:17`; `M/0164_hide_is_two_way_in_current_sets.sql:48`; league lines 1212 and 1239.  
    **Storage/states:** Directional hide, bilateral retirement, filtered cards and closed connection imply visible → hidden/retired.  
    **Transitions:** Contextual hide writes exclusions and closes an existing relationship; no unhide exists. **Layers:** client, database, cron/Edge matcher.  
    **Risk — CONFIRMED:** Permanence depends on multiple representations and predicates, rather than one contract. Sample generation ignores hides, potentially spending seats on cards filtered out afterward.

36. **One-way yes awaiting delivery and response — high.**  
    **Where:** [M/20261105090000_league.sql:103](supabase/migrations/20261105090000_league.sql:103), lines 281–412 and 1314.  
    **Storage/states:** Return row, original keep, delivery ID, reciprocal links and expiry imply undelivered waiting → delivered in recipient seat → mutual or quietly lapsed; unseen delivery can be retried.  
    **Transitions:** Choosing one-way creates return; league delivers; recipient activity determines whether expired delivery counts as seen; deadline/invalidity/pass/connection deletes it. **Layers:** client, database, cron, Edge.  
    **Risk — CONFIRMED:** “Seen” means a Daily-state call during that round, not viewing the card. Cursor timing can defer a new yes until tomorrow. Return deletion and original selection expiry occur in different phases, leaving stale keeps temporarily.

37. **Liked-you visibility and like-back conversion — high.**  
    **Where:** [M/20261028090000_liked_you_and_retention.sql:72](supabase/migrations/20261028090000_liked_you_and_retention.sql:72), lines 149–238; league lines 1333–1358; `app/liked-you/[id].tsx`.  
    **Storage/states:** Keep, closed reverse round, verification/safety/time/cap rules, Premium, returns and retirement imply hidden → blurred teaser/full reveal → matched/queued or disappeared.  
    **Transitions:** Reverse-round closure exposes; Premium permits like-back; expiry and eligibility changes hide. **Layers:** client, database, cron.  
    **Risk — CONFIRMED:** Like-back omits general live pair eligibility and answer-debt checks. Changed must-haves, liker readiness/consent or outstanding answers can be bypassed. Eligibility is not rechecked under its acquired locks. Its window starts at recipient-round closure, not necessarily like time.

38. **Private desirability estimate maturation and cache refresh — medium.**  
    **Where:** [M/20261021102527_private_matching_signal_estimator.sql:254](supabase/migrations/20261021102527_private_matching_signal_estimator.sql:254), lines 602, 908 and 1107; `src/matching/league.ts:240`.  
    **Storage/states:** Score/confidence/components/config version/computed time imply neutral → evidenced → stale → refreshed; no dirty marker exists.  
    **Transitions:** Picks/ranks, connections, attention, photo results, config and daily maintenance recompute selected estimates. **Layers:** client signals, database, cron, Edge.  
    **Risk — CONFIRMED:** Connection-trigger recomputation precedes rank recording; the wrapper refreshes subjects but not the submitting viewer. Partial versus global recomputation can use different attention comparison sets. Removed photo features do not immediately refresh the estimate.

39. **Background matching-photo analysis — medium.**  
    **Where:** [M/20261021102527_private_matching_signal_estimator.sql:668](supabase/migrations/20261021102527_private_matching_signal_estimator.sql:668), schema at 94 and completion at 779; `F/moderate/index.ts:320`; admin dashboard lines 386–475.  
    **Storage/states:** Photo hash/path, lease, attempts and feature result imply disabled/unconsented, pending, leased, retryable, completed and exhausted.  
    **Transitions:** Photo/consent/backfill queues; claims consume attempts; success stores/dequeues; fifth failure exhausts. **Layers:** database, cron, Edge, admin.  
    **Risk — CONFIRMED:** Completion/release lacks claim identity, allowing stale workers to clear newer work or overwrite results. Backfill excludes existing exhausted rows. Implemented but normally dormant because the metric defaults off.

40. **Daily selection, swapping, first choice and submission UI — medium.**  
    **Where:** [src/state/round.tsx:110](src/state/round.tsx:110), lines 224–308; `app/(tabs)/daily.tsx:224,585`; `app/introduction/[id].tsx:269`.  
    **Storage/states:** Selection array/order and separate modal IDs/booleans imply browsing → selecting → swapping/first-choice/nobody confirmation → submitting → complete/match/error.  
    **Transitions:** Limits open swap; multiple picks require first choice; submission updates server and navigation. **Layers:** client, database.  
    **Risk — CONFIRMED:** Choices are not persisted or cleared when cards disappear within the same round. Independent dialogs permit contradictory combinations. Soft-select is written before final submission, leaving positive signals after failed/abandoned submission.

41. **Per-member conduct acknowledgement — low.**  
    **Where:** [src/lib/conductAcknowledgement.ts:3](src/lib/conductAcknowledgement.ts:3); `app/(tabs)/daily.tsx:140,654`.  
    **Storage/states:** Member/version storage plus local visibility imply unchecked → loading → accepted or sheet visible → session accepted/persistence pending.  
    **Transitions:** Member change checks; acceptance hides immediately and persists afterward. **Layers:** client.  
    **Risk — CONFIRMED:** Initial visibility is false before checking; persistence failure permits the session but prompts again later. It is local acknowledgement, with no server participation or device synchronization.

42. **Once-per-round introduction reveal — low.**  
    **Where:** [src/lib/revealSeen.ts:3](src/lib/revealSeen.ts:3); `daily.tsx:168,540`; `FanReveal.tsx`.  
    **Storage/states:** Stored seen marker, revealing flag, reduced-motion/card-count/conduct gates imply unseen → eligible → revealing → seen, with skip branches.  
    **Transitions:** Dismissing conduct permits reveal; completion persists seen. **Layers:** client.  
    **Risk — CONFIRMED:** Leaving before completion or failed persistence replays it. Storage-read failure instead treats it as seen. Eligibility, persistence and completion are spread across three locations.

43. **Profile/bio/photo attention accounting and soft-select inference — medium.**  
    **Where:** [src/lib/dwell.ts:132](src/lib/dwell.ts:132); `src/lib/matchingEngagement.ts:23`; `src/state/round.tsx:193`; introduction/gallery focus handlers; estimator lines 478–596.  
    **Storage/states:** Active IDs, starts, pause targets and accumulated durations imply closed → timing → paused → resumed → banked/submitted → cleared.  
    **Transitions:** Focus/visibility changes bank time; submission snapshots and infers outcomes; round/principal changes reset. **Layers:** client, database.  
    **Risk — CONFIRMED:** Repeated `DwellLedger.pause()` loses the resume target. Recording a submission stops profile timing without restarting after failure, unlike the bio/photo ledger. **PLAUSIBLE:** Native event sequences increase these discrepancies.

44. **Gallery zoom, pan and paging interaction — low.**  
    **Where:** [app/gallery/[id].tsx:345](app/gallery/[id].tsx:345), also lines 49–122 and 165–197.  
    **Storage/states:** Global zoom flag/index versus per-slide scales, offsets and rotation imply paging, zoomed-panning, resetting and springing upright.  
    **Transitions:** Pinch/double-tap changes zoom; zoom disables paging; drag pans or pages; photo changes update attention tracking. **Layers:** client.  
    **Risk — CONFIRMED:** Global zoom and slide transform are independent; navigation does not reset every retained slide transform. **PLAUSIBLE:** Paging/resizing produces a visually zoomed slide with incompatible paging mode.

45. **Voice-introduction playback and source resolution — low.**  
    **Where:** [src/components/introductions/AudioGreeting.tsx:39](src/components/introductions/AudioGreeting.tsx:39); `src/hooks/useScreenActive.ts:6`; private-media resolution.  
    **Storage/states:** Focus/foreground, player status, starting refs, URL and generation imply inactive → resolving → playing → paused/finished/error.  
    **Transitions:** Play ensures URL; background pauses and invalidates pending start; replay seeks to start. **Layers:** client, database/Storage.  
    **Risk — CONFIRMED:** Renewed URLs cause source replacement, losing previous playback position. Generation fencing correctly prevents a late start after blur.

46. **Mutual match queued for capacity — high.**  
    **Where:** [M/0019_connection_capacity.sql:12](supabase/migrations/0019_connection_capacity.sql:12), lines 25–154 and 308; latest pause patch in league line 1371.  
    **Storage/states:** Queue existence versus connection existence, both capacities and pause/safety facts imply immediate activation, waiting for either/both slots, paused waiting, promoted or discarded.  
    **Transitions:** Mutual picks/like-back enqueue; close/block invokes bounded promotion. **Layers:** client, database.  
    **Risk — CONFIRMED:** Unpause and tier changes do not promote. Oldest-ten scanning can repeatedly encounter unpromotable pairs. Promotion omits consent/readiness/general pair eligibility. No expiry or withdrawal exists, allowing stale or indefinitely stranded mutuals.

47. **Connection relationship lifecycle — high.**  
    **Where:** [M/0001_init.sql:186](supabase/migrations/0001_init.sql:186); `M/0020_question_catalog.sql:158`; `M/0007_connection_recap_and_live_visibility.sql:163`; `M/0019_connection_capacity.sql:187`.  
    **Storage/states:** Explicit stage enum plus independent `closed_at` imply choosing questions → answering → recap → open, with closure from any live stage. Transitions remain implicit.  
    **Transitions:** Both question commitments assemble questions; complete answers create recap; either member opens globally; close/block/hide/deletion closes. **Layers:** client, database.  
    **Risk — CONFIRMED:** No schema invariant proves stage prerequisites or couples stage and closure. Stalled live relationships retain capacity without timeout. One member opens for both without a per-member recap acknowledgement.

48. **Question-choice commitment and assembly barrier — medium.**  
    **Where:** [M/0163_three_questions_each.sql:8](supabase/migrations/0163_three_questions_each.sql:8), lines 48 and 68; latest patch `M/20261029090000_two_questions_each.sql:15`; `questions.tsx:22`.  
    **Storage/states:** Per-side picks, catalog version and shared union imply uncommitted → committed/waiting → both committed/assembled. Current rule is two distinct questions each, yielding two to four shared questions.  
    **Transitions:** Exact-two submission locks connection; second commitment builds union and advances stage. **Layers:** client, database.  
    **Risk — CONFIRMED:** A retry after successful final commitment fails the new stage guard rather than returning prior success. **PLAUSIBLE:** Client/catalog mismatch leaves valid server questions unavailable to the client.

49. **Immutable answers and double-blind release — high.**  
    **Where:** [M/0153_reveal_after_all_your_answers.sql:114](supabase/migrations/0153_reveal_after_all_your_answers.sql:114), lines 148 and 170; reader `M/0163_three_questions_each.sql:117,135`; contact/locking patch `M/0165_prelaunch_boundaries.sql:120`.  
    **Storage/states:** Answer existence/timestamp and per-viewer completion imply neither, mine only, theirs only, both, viewer-unsealed and globally recap-ready.  
    **Transitions:** Valid contact-free submission inserts once; own last answer unseals available partner answers; both finish → recap. **Layers:** client, database.  
    **Risk — CONFIRMED:** Release is caller-complete, allowing access to a partner’s partial answers before both finish. This follows DECISIONS but differs from the manifesto’s simultaneous wording. Final-answer retries can fail after stage advancement despite insert idempotency.

50. **Connection routing and local answer progress — high.**  
    **Where:** [app/connection/[id]/answers.tsx:41](app/connection/[id]/answers.tsx:41), lines 68, 119 and 126; `index.tsx:37`; `waiting.tsx:20`; `recap.tsx:32,158`.  
    **Storage/states:** Cached stage plus local cursor/drafts/revealed map imply choosing, waiting, writing, submitting, locally committed, premature recap, ready recap and chat.  
    **Transitions:** Redirect chains and polling route; own last answer always navigates recap; opening navigates chat. **Layers:** client, database.  
    **Risk — CONFIRMED:** Reopening ignores fetched submission markers when deciding editability; prior immutable answers appear editable while server preserves old text. Recap can render before partner completion, lacks connection polling, offers Open prematurely and surfaces no opening error.

51. **Reusable private answer templates — low.**  
    **Where:** [M/0150_interest_limits_answer_gate_saved_answers.sql:126](supabase/migrations/0150_interest_limits_answer_gate_saved_answers.sql:126); `src/api/connections.ts:124`; `answers.tsx:46,74,212`.  
    **Storage/states:** Saved template, current draft, save checkbox and submitted answer imply absent → saved → prefilled → edited → replacement saved, or forgotten.  
    **Transitions:** Template only prefills; explicit submission sends; optional later request upserts template. **Layers:** client, database.  
    **Risk — CONFIRMED:** Template-save failure is swallowed after answer success, silently losing the requested replacement. A forget RPC exists without a traced client entry point.

52. **AI connection-summary lease, cache and fallback — medium.**  
    **Where:** [F/connection-summary/index.ts:70](supabase/functions/connection-summary/index.ts:70), lines 89, 106, 140 and 161; `M/0154_connection_summaries.sql:7`; `recap.tsx:40`.  
    **Storage/states:** Missing row, sentinel `…`, creation time and finished text imply absent → claimed → pending/stale → completed or deleted/failed; client adds timeout/fallback/retry.  
    **Transitions:** Authorized request inserts sentinel; stale claims are reclaimed; provider result updates; client polls. **Layers:** client, database, Edge/provider.  
    **Risk — CONFIRMED:** No owner token fences old workers from deleting/replacing successor work. Final update errors are ignored; consent/relationship is not rechecked after generation. Transient Edge failures become indefinitely stale client fallback until explicit retry.

53. **Durable text-message outbox and recovery — medium.**  
    **Where:** [src/lib/messageOutbox.ts:19](src/lib/messageOutbox.ts:19), lines 44, 67, 95 and 148; `chat.tsx:143,197,241`; `M/0028_idempotent_message_sends.sql:13`.  
    **Storage/states:** Draft, manifest, encrypted native body chunks and stable request ID imply retained → queued → sending → uncertain → delivered/cleanup pending → removed, or failing/corrupt.  
    **Transitions:** Persist before clearing composer; send idempotently; cleanup; manual retry; legacy migration. **Layers:** client/local storage, database.  
    **Risk — CONFIRMED:** No reconnect/background drain, permanent-error classification or discard/edit UI. Closed/blocked/consent-failing messages remain pending. Newer messages can overtake failed older ones. **PLAUSIBLE:** Crash between body and manifest leaves undiscoverable secure chunks.

54. **Unread state and reciprocal read-receipt privacy — medium.**  
    **Where:** [M/0147_read_receipt_preference.sql:19](supabase/migrations/0147_read_receipt_preference.sql:19), lines 75 and 115; consent repair `M/20261021090001_restore_message_consent_guards.sql:10`; `chat.tsx:169`.  
    **Storage/states:** Nullable `read_at` plus preference imply unread, stamped/read, read-but-undisclosed and viewer-hidden receipt.  
    **Transitions:** Focused foreground chat marks incoming messages; opting out makes marking a no-op and masks receipts. **Layers:** client, database.  
    **Risk — CONFIRMED:** Private consumption and public receipt share one field, so opting out leaves consumed messages unread to badges/jobs. Marking covers all incoming messages, including unloaded pages.

55. **Chat history paging and freshness — medium.**  
    **Where:** [app/connection/[id]/chat.tsx:151](app/connection/[id]/chat.tsx:151), lines 225–238; `src/api/connections.ts:152,167`; `src/lib/mergeMessages.ts:1`.  
    **Storage/states:** Message cache, cursor and paging flags imply latest page → loading older → expanded history → refreshed latest page; foreground controls polling.  
    **Transitions:** Cursor fetch merges older history; active chat polls newest fifty every five seconds. **Layers:** client, database.  
    **Risk — CONFIRMED:** Polling replaces expanded cache with the newest page, discarding loaded scrollback/cursor. Current source has polling rather than the realtime subscriptions described in stale handoff notes.

56. **Contact-exchange inference and explicit mutual consent — medium.**  
    **Where:** [M/0062_contact_exchange_signal.sql:18](supabase/migrations/0062_contact_exchange_signal.sql:18), lines 78, 113 and 123.  
    **Storage/states:** Private consent rows and connection exchange timestamp/source imply none → one consent → mutual explicit exchange, or automatically detected exchange.  
    **Transitions:** Message trigger detects contact; explicit calls record mutual consent; first source/time survives. **Layers:** database; client messages trigger inference. Explicit RPC has no traced UI caller.  
    **Risk — CONFIRMED:** Concurrent first consents can both miss the other transaction, leaving both rows without exchange marker until retry. Explicit RPC lacks the mainstream current-consent guard. **PLAUSIBLE:** Regex mistakes another number for contact information.

57. **Farewell delivery and acknowledgement — medium.**  
    **Where:** [M/20261105120000_soft_landing_and_exit.sql:5](supabase/migrations/20261105120000_soft_landing_and_exit.sql:5), lines 17, 53 and 78; `FarewellNotes.tsx:13`; old wrapper `M/0047_legal_consent_rpc_boundary.sql:207`.  
    **Storage/states:** Unique note, `seen_at`, closure and safety filters imply absent → closed/unseen → visible or suppressed → seen; deletion can erase it.  
    **Transitions:** New close transaction writes note; recipient dismissal acknowledges. **Layers:** client, database.  
    **Risk — CONFIRMED:** Legacy granted `close_connection` still permits silent closure. Sender deletion cascades an unread farewell away. Client does not poll or surface farewell failures.

58. **Halal Cards connection unlock — medium.**  
    **Where:** [M/0190_halal_cards.sql:29](supabase/migrations/0190_halal_cards.sql:29), lines 130, 160, 170 and 415; `src/halalCards/access.ts:13`.  
    **Storage/states:** Unlock owner, owner’s current tier and open relationship imply locked → can unlock → unlocked by either partner → lapsed/taken over/inaccessible.  
    **Transitions:** First Premium session owns unlock; tier lapse changes derived access; another Premium start replaces ownership; closure denies relationship access. **Layers:** client, database, entitlement system.  
    **Risk — CONFIRMED:** Lapse is enforced for new starts/proposals, but existing sessions remain playable and Journal agreement/removal/restore remain available. “Lapsed” has no single ongoing-access contract.

59. **Halal Cards relationship track and content eligibility — medium.**  
    **Where:** [M/0190_halal_cards.sql:92](supabase/migrations/0190_halal_cards.sql:92), line 399; `src/halalCards/present.ts:5`; activity screen lines 84, 123 and 134.  
    **Storage/states:** Explicit track check and bundled activity tags imply getting-to-know, engaged or married, with eligible/ineligible content derived separately.  
    **Transitions:** Either member changes track; client filters/annotates content. **Layers:** client, database.  
    **Risk — CONFIRMED:** Detail screen still permits inviting a later-track activity. Server validates activity ID shape rather than catalog/track. Track changes require neither mutual agreement nor transition prerequisites.

60. **Halal Cards invitation/session lifecycle — medium.**  
    **Where:** [M/0190_halal_cards.sql:35](supabase/migrations/0190_halal_cards.sql:35), lines 415, 462, 518, 537 and 564; play screen line 87.  
    **Storage/states:** Explicit status plus timestamps imply invited → active/declined/cancelled/expired; active → completed/cancelled; replay creates another session. Transitions remain scattered RPC branches.  
    **Transitions:** Start, respond, cancel, client completion and lazy expiry. **Layers:** client, database.  
    **Risk — CONFIRMED:** Expiry runs on listing/starting rather than full read, so expired invitations can remain displayed while response fails. Active sessions never expire. Concurrent starts can exceed the unfinished-session limit.

61. **Halal Cards sealed answers — medium.**  
    **Where:** [M/0190_halal_cards.sql:63](supabase/migrations/0190_halal_cards.sql:63), lines 221 and 588; `engine/seats.ts:14`; `engine/session.ts:46`; hooks line 110.  
    **Storage/states:** Immutable arbitrary JSON per session/key/person implies missing → mine waiting/theirs sealed → both visible.  
    **Transitions:** Own answer presence unseals the partner’s same-key answer; engine interprets both. **Layers:** client, database.  
    **Risk — CONFIRMED:** Server validates format/size, not semantic answer correctness, turn or current question. Empty/wrong JSON is immutable and can unseal answers or poison progression. This is part of the approved client-rule architecture.

62. **Halal Cards shared-state arbitration and resolve retries — medium.**  
    **Where:** [M/0190_halal_cards.sql:614](supabase/migrations/0190_halal_cards.sql:614); `src/api/halalCards.ts:118`; `src/halalCards/hooks.ts:99,125,149`.  
    **Storage/states:** Shared JSON/version, expected version and retry counters imply computed → submitting → accepted or stale/refetching; resolution failure → backoff/retry.  
    **Transitions:** Database locks/CAS; stale requests refetch; client retries automatic resolution. **Layers:** client, database.  
    **Risk — CONFIRMED:** CAS prevents conflicting writes but accepts illegal jumps and arbitrary completion. **PLAUSIBLE:** Malformed shared state throws during synchronous engine interpretation outside mutation retry handling.

63. **Halal Cards turn ownership and attention projection — medium.**  
    **Where:** [src/halalCards/engine/session.ts:117](src/halalCards/engine/session.ts:117); `status.ts:14`; hooks lines 110–120; SQL lines 309 and 604.  
    **Storage/states:** Independently writable awaiting-seat, session status, answers and local seat imply your turn, their turn, both, shared reading, invited and finished.  
    **Transitions:** Client computes awaiting on answer/advance/respond; database stores it; badges/pushes consume it. **Layers:** client, database, notification Edge.  
    **Risk — CONFIRMED:** Concurrent answers compute awaiting from stale partner state and do not increment version. Both answers can exist while persisted attention claims one person still owes, generating incorrect badges/pushes.

64. **Relationship Lab progression — low.**  
    **Where:** [src/halalCards/engine/lab.ts:7](src/halalCards/engine/lab.ts:7); `engine/session.ts:49,84`; `LabPlay.tsx:27,139`; bundled lab content.  
    **Storage/states:** Cursor, step type and sealed scenario answers imply reading/discussion → answering → waiting → reveal → next/completed.  
    **Transitions:** Either Next advances shared reading; both scenario answers reveal; final cursor completes. **Layers:** client engine/UI, database store.  
    **Risk — CONFIRMED:** Server enforces neither scenario prerequisites nor one-step progression. One participant can skip steps for both; rules are split across content, engine and component.

65. **Quiz roles, answers, reveal and scoring — medium.**  
    **Where:** [src/halalCards/engine/quiz.ts:15](src/halalCards/engine/quiz.ts:15), lines 33, 59 and 94; `engine/session.ts:59`; `QuizPlay.tsx:29,142`.  
    **Storage/states:** Cursor, format-dependent self/guess fields and alternating subject imply answering → waiting → reveal → review → results.  
    **Transitions:** Required choices submit; both rows reveal; Next advances; final state computes wording/score. **Layers:** client engine/UI, database store.  
    **Risk — CONFIRMED:** Both-row presence is tested before semantic completeness. Accepted malformed answers can become reveal-ready and produce partial results; server does not validate roles, indices or choices.

66. **Adventure shared decisions, branching and endings — medium.**  
    **Where:** [src/halalCards/engine/adventure.ts:23](src/halalCards/engine/adventure.ts:23), lines 59, 81, 142, 170 and 223; `engine/conditions.ts:8`; `AdventurePlay.tsx:175`.  
    **Storage/states:** Scene/step/attempt, roles, flags, variables, history and ending imply actor/watcher, sealed decisions, mismatch/retry, escape option, next scene and ending.  
    **Transitions:** Choices apply effects; joint disagreement retries; repeated mismatch permits deterministic escape; conditions select routes. **Layers:** client engine/UI, database store.  
    **Risk — CONFIRMED:** Server accepts arbitrary actor/state/history/ending writes. **PLAUSIBLE:** Content changes make persisted choices unresolvable. The authored scene graphs themselves explicitly declare routes and are not counted separately.

67. **Halal Cards local catch-up and reveal consumption — low.**  
    **Where:** [src/halalCards/present.ts:28](src/halalCards/present.ts:28); `LabPlay.tsx:31`; `QuizPlay.tsx:33`; `AdventurePlay.tsx:38`; adventure engine line 127.  
    **Storage/states:** Nonpersistent seen cursor/sequence versus shared progress imply caught up → behind → consuming past reveal → current, with ending delayed until local reveal consumption.  
    **Transitions:** Partner advances shared state; local Next consumes backlog before writing progression. **Layers:** client, database shared state.  
    **Risk — CONFIRMED:** Reopening restores only a limited prior reveal, not durable per-member acknowledgement. Adventure retains eight reveals; missed progress can disappear.

68. **Halal Cards content compatibility and restart recovery — medium.**  
    **Where:** [src/halalCards/engine/session.ts:134](src/halalCards/engine/session.ts:134); play screen lines 40, 65 and 126; hooks lines 91–97.  
    **Storage/states:** Persisted content version/kind/cursor/scene versus installed content imply compatible, stale, unknown activity and restarting/cancelling.  
    **Transitions:** App/content changes alter compatibility; recovery cancels/replays known stale sessions. **Layers:** client, database.  
    **Risk — CONFIRMED:** Unknown activities hit generic error before cancellation UI, retaining unfinished slots. Validation misses malformed/negative/noninteger structures, and turn computation precedes compatibility recovery. **PLAUSIBLE:** Bad persisted state crashes before recovery appears.

69. **Solo preview with seat switching — low.**  
    **Where:** [src/halalCards/solo.ts:11](src/halalCards/solo.ts:11), lines 21, 33 and 68; solo screen lines 29, 44 and 65.  
    **Storage/states:** Local run, two seats’ answers and completion imply host action → guest action/mirrored answer → reveal → finished/replay.  
    **Transitions:** Preview eligibility permits entry; private choices switch seat; joint choices mirror; replay resets. **Layers:** client.  
    **Risk — CONFIRMED:** Progress vanishes on unmount. **PLAUSIBLE:** Parameter changes without remount retain a run initialized for another activity.

70. **Shared Journal proposal, agreement, removal and restoration — medium.**  
    **Where:** [M/0190_halal_cards.sql:652](supabase/migrations/0190_halal_cards.sql:652), schema at 75 and RPCs at 677, 718, 742 and 763; Journal screen line 36.  
    **Storage/states:** Proposer, agreement timestamp and independent removal metadata imply own/their proposal → agreed → removed pending/agreed → restored.  
    **Transitions:** Matching normalized proposals deduplicate/agree; partner agrees; either removes/restores. **Layers:** client, database, pushes.  
    **Risk — CONFIRMED:** Unlocked cap/dedup checks allow duplicate proposals and cap overflow; restore bypasses cap. Only one local undo survives, while removed entries disappear from the list, leaving no durable restore UI after navigation.

71. **Sample/mock round and automatic counterpart simulation — medium.**  
    **Where:** [M/0148_demo_members.sql:92](supabase/migrations/0148_demo_members.sql:92), lines 230, 290 and 315; reset `M/0162_tester_reset_without_view.sql:4`; `src/api/halalCardsMock.ts:139,229,386`.  
    **Storage/states:** Tester/sample markers, normal relationship rows, cooldown, mock maps and partner clocks imply enabled → sample fallback → automated pick/answer/reply/turn → reset.  
    **Transitions:** Empty real states request samples; triggers or fetch-driven timers simulate counterpart actions; reset removes selected artifacts. **Layers:** client mocks, database.  
    **Risk — CONFIRMED:** Samples omit normal hard matching/hide rules. Reset leaves hides/blocks and queued mutuals. Mock question/open/reveal/unlock behavior differs from production, so successful demos do not establish real lifecycle correctness.

72. **Dormant call-preview flow — low.**  
    **Where:** [app/connection/[id]/chat.tsx:396](app/connection/[id]/chat.tsx:396), state at 98 and UI at 567, 685; feature defaults line 5.  
    **Storage/states:** Local union, modal, mute and speaker flags imply idle → calling → connected → ended; unavailable is declared but unwritten.  
    **Transitions:** Feature-gated Call starts; timer “connects” after 1.1 seconds; End resets. **Layers:** client only.  
    **Risk — CONFIRMED:** Enabling the live-calling flag exposes a timer-based connected preview with no provider/counterparty connection. Default is off.

73. **Premium entitlement authority and client mirror — high.**  
    **Where:** [M/0025_launch_control_plane.sql:7](supabase/migrations/0025_launch_control_plane.sql:7), lines 66 and 103; `src/state/session.tsx:82`; `SettingsTab.tsx:347`; `PremiumGate.tsx:40`.  
    **Storage/states:** Explicit entitlement enum, tier/provider/expiry, profile tier and client tier/loading/error imply free, active, grace, expired, revoked and locally unknown/stale. Transitions are scattered writers.  
    **Transitions:** Grants/service routines update records; cron expires selected providers; client refresh mirrors them. **Layers:** client, database, cron/admin.  
    **Risk — CONFIRMED:** Reader ignores expiry time and falls back to profile tier. No general reconciliation enforces agreement between records. Client refresh mainly follows principal changes/manual actions, so timed expiry remains stale. Real purchase/restore/webhook handling is not implemented.

74. **Launch/referral Premium reward accrual — medium.**  
    **Where:** [M/20261021090000_fair_waitlist_and_launch_premium.sql:632](supabase/migrations/20261021090000_fair_waitlist_and_launch_premium.sql:632), lines 643, 697, 729 and 760.  
    **Storage/states:** Earned months, already-granted months, current entitlement/provider and readiness imply reserved → waiting for readiness/other Premium → granted → extended → expired.  
    **Transitions:** Ten-minute cron calculates eligibility, adds only new reward months and expires launch entitlements. **Layers:** database, cron; client referrals/readiness supply inputs.  
    **Risk — CONFIRMED:** Rewards depend on cron, while entitlement reads do not time-expire independently. An active/grace nonreward entitlement blocks granting even if its expiration timestamp has passed until another writer changes its state. Already-consumed reward months persist separately from entitlement replacement.

75. **Complimentary Premium grants and expiry — high.**  
    **Where:** [M/20261028140000_admin_premium_grants.sql:25](supabase/migrations/20261028140000_admin_premium_grants.sql:25), lines 42, 93, 152 and 188.  
    **Storage/states:** Grant history/revocation/end dates plus entitlement/profile imply granted-before-profile, active, replaced, revoked and expired.  
    **Transitions:** Owner grants/replaces/revokes; new profile inherits; hourly cron expires. **Layers:** admin client, database, cron.  
    **Risk — CONFIRMED:** Expiry’s sibling data-modifying CTE deletes entitlement, but its `NOT EXISTS` profile-demotion check still sees the pre-delete row. Profile stays Premium; subsequent runs cannot repair it. Entitlement reader then reports active Premium through profile fallback.

76. **Feature rollout, tester privileges and test Premium — medium.**  
    **Where:** [M/0029_server_authorized_release_flags.sql:11](supabase/migrations/0029_server_authorized_release_flags.sql:11); `M/20261031100000_test_tools_launch_controls.sql:16,69`; `M/20261028130000_admin_test_accounts.sql:32,134`; `src/state/featureFlags.tsx:15`.  
    **Storage/states:** Enabled/rollout/cohort rows, tester/sample memberships, tester entitlement and client defaults imply off, cohort-enabled, globally rolled out, tester-authorized, sample-enabled and test-Premium-enabled.  
    **Transitions:** Administrative grants, rollout changes, admin insertion and tester toggles modify independent records. **Layers:** client, database, admin.  
    **Risk — CONFIRMED:** Client flags refresh on principal change, not live administrative changes. Disabling samples retains tester authority. Enabling test Premium overwrites another entitlement provider; disabling the switch does not itself retract existing tester Premium.

77. **Push permission, device ownership and notification preferences — medium.**  
    **Where:** [src/api/notifications.ts:25](src/api/notifications.ts:25), lines 70 and 143; `M/20261016075635_security_boundary_hardening.sql:350,415`; `M/20261028120000_round_expiring_push.sql:19`.  
    **Storage/states:** OS permission, runtime/config eligibility, token ownership/enabled fields and muted-kind rows imply unsupported, denied, token acquisition, registered, rotated, transferred, muted, disabled and forgotten.  
    **Transitions:** Enable requests permission/registers; rotation refreshes; another account takes token; sign-out forgets; disable clears token; per-kind switches delete pending work. **Layers:** client/OS, database.  
    **Risk — CONFIRMED:** Consent is inferred from device rows rather than an independent preference. Failed sign-out cleanup is ignored. Claimed sends can still race disabling/muting after their device snapshot.

78. **Push outbox delivery, leases and terminal outcomes — medium.**  
    **Where:** [M/0166_notification_ownership_and_leases.sql:74](supabase/migrations/0166_notification_ownership_and_leases.sql:74), line 125; enqueue `M/20261028100000_notification_kind_switches.sql:20`; `F/send-notifications/index.ts:291`.  
    **Storage/states:** Send-after, sent timestamp, attempts, lease and error imply delayed → due → claimed → sent/retry/exhausted/expired; dead device is separate.  
    **Transitions:** Events enqueue/coalesce; cron/Edge claims; results settle; twelve-hour expiry retires stale work. **Layers:** database, cron, Edge.  
    **Risk — CONFIRMED:** Network exceptions, 5xx and missing tickets are treated as delivered, intentionally trading loss for fewer duplicates. No claim token fences settlement. Expired and delivered share `sent_at`; send does not revalidate whether the triggering event remains relevant.

79. **Retention/reminder eligibility and send budgets — medium.**  
    **Where:** [M/20261028090000_liked_you_and_retention.sql:358](supabase/migrations/20261028090000_liked_you_and_retention.sql:358); recap reminders `M/20261028110000_decision_and_recap_pushes.sql:88`; expiry reminders `M/20261028120000_round_expiring_push.sql:42`.  
    **Storage/states:** Per-member/kind/reference first-seen, send count/time plus live conditions imply observed → waiting threshold/waking hour → queued → cooldown → exhausted or condition-cleared.  
    **Transitions:** Hourly jobs recognize likes, answer debt, quiet chats, recap and expiring rounds. **Layers:** database, cron, notification Edge.  
    **Risk — CONFIRMED:** Budgets advance even when enqueue does nothing because of mute, missing device, coalescing or swallowed errors. A reminder can be “spent” without delivery. Quiet-chat budgets do not reset with conversation activity.

80. **Member-notice display and acknowledgement — low.**  
    **Where:** [M/0186_member_notices.sql:8](supabase/migrations/0186_member_notices.sql:8), lines 44 and 57; `M/20261028110000_decision_and_recap_pushes.sql:44`; `NoticeDialog.tsx:27`.  
    **Storage/states:** Notice row/seen timestamp and optimistic query removal imply created/unseen → oldest visible → locally dismissed → durably seen or acknowledgement failed.  
    **Transitions:** Moderation/report events create; dismissal immediately removes local row and asynchronously acknowledges. **Layers:** client, database, push Edge.  
    **Risk — CONFIRMED:** Acknowledgement errors are swallowed without rollback, so dismissed notices can reappear after refetch. There is no explicit local pending-ack state.

81. **Notification-tap deferral and deduplication — low.**  
    **Where:** [src/components/notifications/NotificationObserver.tsx:24](src/components/notifications/NotificationObserver.tsx:24); `src/lib/notificationDestination.ts:28`.  
    **Storage/states:** OS last response, route readiness and last-handled ID imply received → ignored, waiting for profile, or routed → cleared.  
    **Transitions:** Listener/cold-start response resolves known kinds; readiness changes retry deferred responses. **Layers:** client/OS.  
    **Risk — CONFIRMED:** Signed-out taps are ignored/cleared rather than retained for sign-in. Payload identifies a kind, not an intended account; deduplication is in-memory and routes use whichever member is current.

82. **Mail outbox leasing, priority, retries and budget — medium.**  
    **Where:** [M/20261021090000_fair_waitlist_and_launch_premium.sql:522](supabase/migrations/20261021090000_fair_waitlist_and_launch_premium.sql:522); settlement `M/20261020110000_mail_daily_budget.sql:130`; `F/send-mail/index.ts:370`.  
    **Storage/states:** Lease, attempts, sent/error and rolling budget imply pending → prioritized/claimed → sent, backoff, quota-held, deferred or exhausted.  
    **Transitions:** Cron claims safety mail first; Edge paces sends; ordinary failure backs off; 429 waits without consuming an attempt. **Layers:** database, cron, Edge/provider.  
    **Risk — CONFIRMED:** Settlement lacks claim identity and can reopen already-sent work on late failure. Twelve attempts exhaust without a normal recovery path. Daily budget counts completed sends rather than reserved in-flight claims. Resend has idempotency keys; SES path does not.

83. **Mail-provider selection and operational readiness — medium.**  
    **Where:** [F/send-mail/index.ts:328](supabase/functions/send-mail/index.ts:328), lines 352, 367 and 378.  
    **Storage/states:** Configuration and live SES account flags/quota imply unavailable, Resend fallback, SES sandbox/unready, SES production and time-budget exhausted.  
    **Transitions:** Each invocation probes SES; production access selects SES; otherwise Resend; runtime budget returns remaining items. **Layers:** Edge/provider, cron/database queue.  
    **Risk — CONFIRMED:** Any SES account-check failure can switch providers between retries, across different idempotency behavior. Missing operator address blocks all kinds, including member waitlist mail. Provider choice is not attached to each queued message.

84. **Waitlist intake and reserved launch place — low.**  
    **Where:** [M/20261022120000_waitlist_country_and_source.sql:52](supabase/migrations/20261022120000_waitlist_country_and_source.sql:52); original table `M/0093_waitlist.sql:14`; website intake.  
    **Storage/states:** Canonical inbox, joined rank, first-touch fields and attribution imply absent → joined/ranked → first-10,000 eligible or later; verification remains separate.  
    **Transitions:** Serialized join creates or reuses place, preserves initial answers and queues welcome. **Layers:** website client, database, mail cron/Edge.  
    **Risk — CONFIRMED:** API response eligibility describes remaining availability, not necessarily that repeat visitor’s existing reservation. Waitlist membership does not gate app sign-up. `invited_at` is retained scaffolding with no traced invitation workflow.

85. **Waitlist email proof and progress-link capability — medium.**  
    **Where:** [M/20261019120000_referral_progress.sql:59](supabase/migrations/20261019120000_referral_progress.sql:59), line 154; latest requests `M/20261021090000_fair_waitlist_and_launch_premium.sql:443`; `F/verify-waitlist/index.ts:27`; `site/refer.html:208`.  
    **Storage/states:** Token hash/ciphertext/expiry/send time and verified/code fields imply no token → issued → unconfirmed → confirmed/progress access → expired/reissued.  
    **Transitions:** Requests reuse sufficiently live tokens or rotate; GET only inspects; POST confirms and extends progress access. **Layers:** website client, database, mail cron/Edge, verification Edge.  
    **Risk — CONFIRMED:** Tokens are reusable progress capabilities rather than consumed proofs; leaked tokens retain access until expiry/rotation. Expired/missing-token mail payloads can leave queued verification mail with nothing sendable.

86. **Referral-code ownership and waitlist/account linkage — medium.**  
    **Where:** [M/20261019140000_one_referral_system.sql:16](supabase/migrations/20261019140000_one_referral_system.sql:16), lines 32 and 53; latest owner resolution `M/20261021090000_fair_waitlist_and_launch_premium.sql:339`.  
    **Storage/states:** Code with waitlist owner, account owner or both implies unissued → waitlist-owned/account-owned → linked.  
    **Transitions:** Confirmation issues code; first account progress request links by confirmed canonical inbox or creates account code. **Layers:** client, database, email-proof Edge indirectly.  
    **Risk — CONFIRMED:** First-time account code creation lacks per-account serialization; concurrent requests can collide on unique owner and fail. Ownership has independent copies on waitlist and code registry, maintained by triggers/procedures rather than one invariant.

87. **Referral capture, first attribution and claim — medium.**  
    **Where:** [src/lib/referralCode.ts:30](src/lib/referralCode.ts:30); `app/onboarding.tsx:310`; claim `M/20261021090000_fair_waitlist_and_launch_premium.sql:387`; `M/20261022090000_invite_flow_clearer.sql:53`.  
    **Storage/states:** Local pending code, waitlist attribution and member referral imply captured → pending sign-up → claimed/already/own/invalid/too-late → local code forgotten.  
    **Transitions:** First link stores; onboarding claims; invite flow respects existing waitlist attribution; claim limited to thirty days. **Layers:** client/website, database.  
    **Risk — CONFIRMED:** Onboarding swallows claim failure then forgets the code, losing retry. Concurrent different claims can both return claimed although only one insert wins. Pending storage is not account-scoped.

88. **Referral conversion and reward-tier recognition — medium.**  
    **Where:** [M/20261021120716_referral_requires_completed_profile.sql:15](supabase/migrations/20261021120716_referral_requires_completed_profile.sql:15), line 125; trigger repair `M/20261021150000_referral_trigger_watches_every_readiness_field.sql:9`; `M/20261019140000_one_referral_system.sql:270`.  
    **Storage/states:** Attribution, waitlist `referral_counted_at`, member `counted_at`, current readiness and canonical-inbox dedup imply pending → currently qualifies → durably counted → reward threshold reached.  
    **Transitions:** Waitlist-related readiness triggers mark; account progress reads persist member conversions; counts derive reward tiers. **Layers:** client, database, reward cron.  
    **Risk — CONFIRMED:** Waitlist conversion becomes sticky on triggers, but app-only conversion becomes sticky when referrer progress is read. Readiness gained then lost before that read can cease counting. Reward entitlement and recognized conversion are separately persisted.

89. **Post-launch web invitation and store handoff — low, currently gated.**  
    **Where:** [site/invite.js:39](site/invite.js:39), lines 64, 108, 122 and 149; `site/launch.js:15`.  
    **Storage/states:** Launch switch, pending code, auth callback and screen ID imply waitlist redirect or start → sign-in → linking → claimed/other/error → app-store handoff.  
    **Transitions:** OAuth/OTP returns; claim succeeds; web session signs out; phone redirects after delay. **Layers:** website client, Auth, database.  
    **Risk — CONFIRMED:** Source launch switch is off and App Store URL empty. Pending attribution is browser-local; store installation does not transfer authenticated state. Failure and terminal results clear/retain codes differently, outside a declared flow contract.

90. **Administrative session, MFA and fresh step-up — medium.**  
    **Where:** [site/admin.js:190](site/admin.js:190), lines 222, 271 and 349; `M/20261021170000_admin_panel_settings.sql:13,29,97`.  
    **Storage/states:** Tokens/sessionStorage, admin membership/role, AAL and TOTP timestamp imply signed out → primary auth → MFA setup/challenge → read-authorized → write-unlocked → step-up expired.  
    **Transitions:** OAuth, TOTP, token refresh, fifteen-minute expiry and sign-out. **Layers:** website client, Auth, database.  
    **Risk — CONFIRMED:** UI role/unlock is a snapshot while server checks live membership/time; stale controls can appear available but fail. **PLAUSIBLE:** Parallel unsynchronized refresh calls race token/session replacement.

91. **Admin-team membership and last-owner preservation — low.**  
    **Where:** [M/20261021170000_admin_panel_settings.sql:330](supabase/migrations/20261021170000_admin_panel_settings.sql:330), lines 346, 383 and 417; tester trigger `M/20261028130000_admin_test_accounts.sql:32`.  
    **Storage/states:** Explicit owner/viewer role and membership existence imply nonadmin → viewer/owner → role changed → removed; tester grants are a side effect.  
    **Transitions:** Owner adds, changes or removes; serialized changes require an owner remain. **Layers:** admin website, database.  
    **Risk — CONFIRMED:** Removing admin membership does not retract tester/sample grants created on insertion. Administrative and testing authority therefore diverge after removal. Last-owner changes through the normal RPC are correctly serialized.

92. **Report action claim and resolution saga — high.**  
    **Where:** [M/20261016075635_security_boundary_hardening.sql:9](supabase/migrations/20261016075635_security_boundary_hardening.sql:9), lines 19, 70 and 98; `M/20261021180000_admin_reports_and_growth.sql:59,86`; `F/report-action/index.ts:71`.  
    **Storage/states:** Open report, action claim/time and resolved timestamp imply open → authorized → claimed → Auth action applied → database resolved/notified/audited; failure releases or leaves retryable claim.  
    **Transitions:** Admin chooses dismiss/suspend/ban; Edge changes Auth before database completion. **Layers:** admin client, database/Auth, Edge.  
    **Risk — CONFIRMED:** Same-action callers reuse a claim rather than own it, permitting duplicate external attempts. Worker death after Auth succeeds leaves unresolved database state; retry can extend restriction duration. Ten-minute expiry permits a different action after an earlier side effect.

93. **Administrative member restriction and reinstatement — high.**  
    **Where:** [F/report-action/index.ts:49](supabase/functions/report-action/index.ts:49); `M/20261021200000_admin_trust_safety_and_system.sql:174,200`.  
    **Storage/states:** Auth `banned_until` and profile pause independently imply active, seven-day suspended, long banned, Auth-expired-but-paused, unbanned and partially applied.  
    **Transitions:** Authorized Edge changes Auth, then pauses/unpauses and audits in database. **Layers:** admin client, Auth/database, Edge.  
    **Risk — CONFIRMED:** No compensation/claim covers direct member actions between Auth and database writes. Seven-day Auth expiry does not clear profile pause. Unban clears the same pause bit used for voluntary pause/deletion. Restriction cause and restoration policy are not represented.

94. **Locale change and deferred native layout direction — low.**  
    **Where:** [src/i18n/index.tsx:24](src/i18n/index.tsx:24); `src/state/session.tsx:49,135`; `SettingsTab.tsx:231`.  
    **Storage/states:** Persisted language, desired direction, native current direction and restart-required projection imply hydrating → aligned locale, or language changed/direction pending → aligned after cold restart.  
    **Transitions:** Language selection persists immediately; browser direction changes immediately; native force-RTL applies on next cold start. **Layers:** client/native runtime.  
    **Risk — CONFIRMED:** New language and old native layout can coexist until restart. Persistence failures are swallowed, allowing displayed language to revert at next launch; no persisted “restart completed” state exists.

**Total: 94 machines.** This excludes deleted historical matchers, unused schema scaffolding, ordinary field enums, decorative animation loops and each explicitly authored story graph.

The five I would make explicit first are:

1. **Matching eligibility and re-entry (#26):** one authoritative predicate and transition policy across preparation, commit, display, pick and re-entry. Current divergence breaks hard product rules.
2. **Connection lifecycle and answer barriers (#47):** make stage prerequisites, immutable commitments, release and closure invariants explicit, incorporating #48–50.
3. **Queued mutual admission (#46):** define revalidation, promotion triggers, withdrawal and expiry so mutuals neither activate illegally nor remain stranded.
4. **Deletion lifecycle (#24):** distinguish pending deletion from ordinary pause, define recovery/cancellation, and make erasure inventory and worker ownership durable.
5. **Premium entitlement authority (#73):** unify expiry, provider replacement, profile projection and reconciliation. The confirmed complimentary-expiry defect demonstrates the cost of competing authorities.

Areas **not fully examined**: every matcher allocation branch; every authored Cards narrative/content node and secondary hub rendering branch; low-level animation/gesture implementations; third-party Auth/Expo internals; native permission, cache and reconnect behavior; provider-side delivery behavior; deployment state, existing database contents and live cron health. No production/runtime correctness is inferred from this source review.