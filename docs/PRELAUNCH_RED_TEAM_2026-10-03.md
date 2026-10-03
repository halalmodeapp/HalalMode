# Halal Mode — pre-launch red-team assessment

Assessment date: 3 October 2026. Read-only application/database assessment; no fixes or production changes performed. Translation work belongs to Claude and is deliberately excluded from the defect list.

## Executive Assessment

**The product has a worthwhile core and real security foundations, but I would not open this deployment to the general public yet.** This is not a recommendation to rewrite it. The largest problems are inconsistent enforcement across old and new RPCs, misleading privacy promises, synthetic engagement still enabled, and reliability defects around answers and notifications.

The good parts are substantive: private storage, restricted profile access, server-mediated answer disclosure, bounded daily introductions, blocked-pair checks, and service-only matching internals. A live authenticated-role probe could see its own profile, not other profiles, unrelated connections or raw answers. Direct private-preference access was denied. I did **not** find evidence of a universal profile dump or account takeover.

The weakness is that protections have accumulated in layers. A newer screen or RPC can enforce a rule while an older callable route does not. Fix the shared backend boundary rather than adding another client check.

Matching also needs intellectual honesty: selecting each other from a supplied set does not prove the app found either person's best suitable partner. Current selection order is not reliable preference-order evidence. No audit performed here proves 100,000-user throughput or real-world predictive accuracy.

### Scope and evidence limits

- Repository: `C:\Users\Mohammed\Documents\HalalModeX`, branch `feature/social-sign-in`, HEAD `b69d4e8`; substantial concurrent uncommitted work. Findings describe the inspected snapshot, not a frozen release build.
- Active linked Supabase project: `ziboxxxiedcqfdgzqgjv`, verified against local configuration. The connector exposed a different, old project; its state was **not** used as evidence for the active deployment. Live checks used the linked CLI instead.
- `npm run verify:sql`: **passed** parsing 158 migrations, 46 database-test files and 62 language-SQL bodies, zero parser problems. This is syntax parsing, **not execution of 46 database tests**.
- `npm run verify:client` and standalone `npm test`: stopped at missing imports while translations were being assembled. Tests did not execute. Per the owner's instruction, this work in progress is not a reported defect; a green client baseline remains unverified.
- Live read-only authenticated-role probe, using an existing demo identity: own visible profiles **1**, other profiles **0**, raw answers **0**, unrelated connections **0**. Separate direct private-preferences query: permission denied. This is a useful narrow check, not exhaustive penetration testing.
- Live metadata: all public tables inspected had RLS; no authenticated SELECT grants on private-schema tables; media buckets private; 504 storage objects all attached at inspection; no overdue deletion backlog. Cron history showed successful invocations and retained HTTP responses were 200. Neither proves downstream delivery or full workflow correctness.
- No native UI inspection, accessibility-device pass, new large load test, destructive abuse, concurrent write reproduction, or deployment was performed. Race findings below are code-derived unless explicitly stated otherwise.

### Product truth that needs reconciling

The supplied brief says **one interest per five introductions** and answer-by-answer disclosure. October decisions/code instead permit **Free 3 of 5, Premium 10 of 10**, and reveal answers only after completing all your own answers. Those may be deliberate improvements; I have not treated them as unauthorized bugs. Reconcile the specification, legal text and user-facing explanation before release. Do not automatically revert them.

## Critical Issues

### C1 — Privacy promises contradict the implementation

**Area:** Privacy / trust. **Severity:** Critical for public launch.

**What happens:** The privacy document says precise location is not stored, but the location RPC stores supplied latitude/longitude. The AI recap implementation sends first names and answers to Anthropic when configured; the notice does not clearly explain this transfer. Deletion wording also needs reconciliation with the recovery/finalization lifecycle.

**Example:** A privacy-conscious member agrees believing only their city is retained; the database actually retains their precise device coordinates.

**Why it matters:** Restricted access is good, but does not make an inaccurate collection promise true. These answers can contain religious, family and personal information.

**Evidence:** `src/data/legalDocuments.ts`, `public.update_my_location` in `0045_device_only_profile_location_updates.sql`, `supabase/functions/connection-summary/index.ts`, `0031_account_deletion_requests.sql`. The active location function was inspected. Exact coordinates were not returned by the inspected safe profile response.

**Recommended fix:** Decide the minimum location precision genuinely needed, document actual storage/retention, and clearly disclose AI processing before use. Minimize names and unnecessary answer content sent externally. Bump the legal version after appropriate review. Do not merely change the comment.

**Fix before launch? YES.** Jurisdiction-specific lawful basis and sensitive-data requirements need qualified legal review; this audit is not that review.

### C2 — Synthetic matches and engagement remain enabled

**Area:** Trust / release configuration. **Severity:** Critical if publicly accessible as genuine matching.

**What happens:** Live `demo_introductions` is enabled while `controlled_beta` is false. An empty real pool can request demo introductions. Demo logic generates reciprocal interest, answers and chat replies. Turning off new demo rounds alone does not necessarily retire existing demo conversations.

**Example:** A new member finds a seemingly interested partner when the actual local pool is empty.

**Why it matters:** Fake engagement is particularly damaging in a paid or emotionally sensitive product. This is acceptable in a clearly isolated demonstration, not as an undisclosed substitute for real members.

**Evidence:** `src/api/introductions.ts`, `0148_demo_members.sql`, active flags and 32 demo-member records. I found no persistent machine-checkable demo marker carried through the inspected client profile type; I did not verify every demo biography or rendered screen. Some sample messaging may identify itself, which is not equivalent to an upfront persistent label. Existing demo triggers check membership rather than the new-round feature flag.

**Recommended fix:** Disable and isolate demo paths for public accounts; retire/exclude existing demo relationships and outcomes from public matching and analytics. Keep an explicitly labelled tester-only experience if useful.

**Fix before launch? YES for public launch; not a reason to halt isolated testing.**

## High-Priority Issues

### H1 — Fajr visibility is not enforced at every data boundary

**Area:** Authorization / daily rounds. **Severity:** High.

**What happens:** The current-round getter checks opening time, but introduction/media helpers and the legacy selection path do not consistently require `opens_at <= now()`.

**Example:** A modified client reads its already-prepared future introductions and acts before its dawn.

**Why it matters:** Hiding the daily screen is not a server authorization rule. Media exposure can precede the promised window.

**Evidence:** `0127_a_round_opens_when_it_opens.sql`; active `can_read_current_introduction`, `can_read_profile_media`, and `submit_round_selections_after_legal_consent`; underlying definitions in migrations 0048, 0017 and 0019. Confirmed by deployed function inspection, not an actual early selection mutation.

**Recommended fix:** Reuse one authoritative current-relationship/window predicate for raw reads, safe-profile/media access and selection writes. Recheck hidden/deleting/blocked state at commit.

**Fix before launch? YES.**

### H2 — Older selection RPC bypasses the answer-debt gate

**Area:** Backend / product integrity. **Severity:** High.

**What happens:** The ranked submission RPC checks whether the member owes answers; the older callable selection RPC does not enforce the same gate.

**Example:** An old app continues receiving/submitting sets while leaving another person waiting, despite the new rule.

**Why it matters:** Versioned clients are normal, not exotic attackers. Core behavior must survive them.

**Evidence:** `0150_interest_limits_answer_gate_saved_answers.sql`; authenticated execution grant on `public.submit_round_selections` confirmed live; its underlying implementation lacks the new check.

**Recommended fix:** Put the check below both entry points or retire the older route with a deliberate compatibility policy. Test old and new RPCs directly.

**Fix before launch? YES if retaining this core gate.**

### H3 — Concurrent final answers can leave a completed pair waiting

**Area:** Concurrency / icebreakers. **Severity:** High; code-derived race, not reproduced with writes.

**What happens:** Each transaction inserts its final answer and checks the other answers without first serializing on the connection. Both can observe the other transaction's answer as absent and leave the stage unchanged.

**Example:** Both people finish together; all answers exist after commit, but the connection remains in answering.

**Why it matters:** This defeats the central reward after considerable user effort.

**Evidence:** `0153_reveal_after_all_your_answers.sql`, `refresh_connection_stage_after_answer` in `0020_question_catalog.sql`. Live trigger inspection found no answer-table trigger repairing this; the connection pair-lock trigger only runs when a connection mutation actually occurs.

**Recommended fix:** Acquire a consistent per-connection lock before answer insertion/transition evaluation; provide an idempotent repair/read reconciliation. Prove with a two-session final-answer test.

**Fix before launch? YES.**

### H4 — Network ambiguity makes a successful selection look failed

**Area:** Reliability / daily UX. **Severity:** High.

**What happens:** A committed submission retried after timeout returns already-submitted rather than the original outcome. Client selection state is not a durable submission receipt.

**Example:** A train enters a tunnel after the server commits; retry says the set was already submitted, while the person thinks nothing happened.

**Why it matters:** One consequential choice per cycle requires recoverable confirmation.

**Evidence:** `src/state/round.tsx`, `src/api/introductions.ts`, legacy submission implementation in 0019.

**Recommended fix:** On ambiguous failure reload canonical round status; make equivalent retry idempotent and clearly distinguish pending, confirmed and failed.

**Fix before launch? PREFERABLY; essential before describing submission as reliably recoverable.**

### H5 — “First choice” currently means tap order, not preference

**Area:** Matching / measurement. **Severity:** High.

**What happens:** Selected IDs retain interaction order, including display order from select-all; ranked submission treats that ordering as preference evidence. The current choice dialog swaps a selection, not an explicit ranking confirmation.

**Example:** A person saves an acceptable profile first, then their favorite. The algorithm records the acceptable one as number one.

**Why it matters:** The owner's main success metric becomes contaminated. Better-looking reciprocal-top-pick numbers could reflect UI mechanics rather than quality.

**Evidence:** `src/state/round.tsx`, `app/(tabs)/daily.tsx`, `src/api/introductions.ts`, ranked recording in 0150.

**Recommended fix:** Ask a simple explicit first-choice question when multiple interests are allowed, or mark order as unknown and stop treating it as ranking. Do not require a complicated full ranking UI unnecessarily.

**Fix before launch? YES before claiming or optimizing measured mutual first choice.**

### H6 — Safety actions depend on accepting updated legal terms

**Area:** Safety. **Severity:** High.

**What happens:** Block/report wrappers require current legal consent.

**Example:** A person returns to stop harassment and encounters a new terms gate before their safety action succeeds.

**Why it matters:** Protection and account exit should not require agreement to newly changed service terms.

**Evidence:** `0047_legal_consent_rpc_boundary.sql`, active block wrapper and application legal gate.

**Recommended fix:** Authenticate and authorize safety actions independently of ordinary product-consent gates; keep blocking, reporting and deletion accessible.

**Fix before launch? YES.**

### H7 — Direct reports bypass safeguards; deletion can erase reports

**Area:** Safety / RLS / retention. **Severity:** High.

**What happens:** Direct report INSERT checks reporter ownership but bypasses contextual RPC restrictions. Reports referencing either profile cascade when that profile is deleted.

**Example:** A harasser submits arbitrary reports about a known UUID, then deletes their own account after being reported; relevant report records can disappear.

**Why it matters:** Reports must be credible, bounded and reviewable, not merely writable. Deletion and safety-evidence retention need a deliberate policy.

**Evidence:** Active reports grants, INSERT policy and reporter/subject foreign keys; deletion finalizer. No separate durable evidence archive was established in this assessment.

**Recommended fix:** Require a bounded contextual report RPC; revoke unnecessary raw writes. Retain narrowly scoped, access-controlled safety evidence under an explicit retention policy instead of indiscriminately retaining all chats.

**Fix before launch? YES.**

### H8 — Shared-device push ownership regressed

**Area:** Privacy / notifications. **Severity:** High.

**What happens:** Registration now upserts on user/platform/token, while a global platform/token uniqueness constraint remains. A second account registering the same device token can conflict instead of transferring ownership. Sign-out does not establish reliable deregistration.

**Example:** A signs out, B signs in on the same phone, and A's device record remains associated with that phone.

**Why it matters:** Notification routing can cross account boundaries; even discreet content reveals activity.

**Evidence:** Active `register_my_notification_device`, migrations 0036 and 0141, live unique constraints, `src/state/auth.tsx`.

**Recommended fix:** Restore explicit exclusive token ownership transfer, invalidate/revoke on account transitions, and test A→B→A on one device.

**Fix before launch? YES while push is enabled.**

### H9 — Notification processing lacks durable delivery control

**Area:** Reliability / cost. **Severity:** High.

**What happens:** Claiming increments attempts but does not establish an in-flight lease. Overlapping workers can claim the same rows after the claim transaction commits. Multiple devices can expand 100 rows beyond Expo's 100-message request limit. Ticket IDs are not followed through to receipts; invalid-device cleanup is too broad.

**Example:** One stale device invalidates a member's other registrations, or duplicate jobs send repeated pushes.

**Why it matters:** A successful cron invocation is not successful delivery. Queue throughput is also bounded: 100 rows every two minutes is at most 72,000 rows/day before retries under that schedule.

**Evidence:** `0141_actually_send_notifications.sql`, notification worker implementation and active function inspection. Local Fajr spreads demand but does not eliminate regional bursts.

**Recommended fix:** Lease claims, batch per-device payloads at the provider limit, retain receipt IDs, invalidate only the affected token, expire stale work and recheck relevant connection state. Respect quiet-hour preferences.

**Fix before launch? YES for ownership and duplicate/stale privacy behavior; PREFERABLY for full delivery observability at small beta scale.**

### H10 — Private photos are not revocable once delivered

**Area:** Media privacy. **Severity:** High if promises imply revocation.

**What happens:** Signed URLs are bearer access lasting beyond the relationship check; native disk caching can outlive a block. Storage authorization is folder/relationship-based rather than restricted to currently attached photo paths.

**Example:** A blocked member opens a previously issued URL, or accesses an old still-stored object in a permitted member folder.

**Why it matters:** “Private bucket” does not mean “cannot be saved” or “instantly recalled.” No software can reliably retract a screenshot.

**Evidence:** `src/api/profileMedia.ts`, `src/lib/privateMediaCache.ts`, `0017_private_profile_media.sql`, HeroCard image cache usage. At inspection all stored objects were attached, so detached-object exposure is a policy weakness, not a demonstrated current leak.

**Recommended fix:** Authorize attached paths and current relationship/window, use short bounded signed lifetimes, invalidate local media caches on safety transitions, and explain the unavoidable screenshot/download limitation honestly.

**Fix before launch? YES for truthful promises and authorization boundaries; cache hardening PREFERABLY.**

### H11 — Upload boundaries do not establish safe, bounded image content

**Area:** Abuse / media / cost. **Severity:** High.

**What happens:** Client compression can fall back to the original file while upload labels it JPEG. Client processing can be bypassed. Per-file storage limits do not impose a per-account total-upload allowance.

**Example:** An attacker uploads many unattached objects, or a broken conversion stores unexpected bytes/metadata under an image label.

**Why it matters:** Attachment limits alone do not bound storage cost or strip location metadata.

**Evidence:** `src/api/profileMedia.ts`, storage insert policy in 0017, write-boundary hardening in 0055, active bucket limits. Arbitrary external photo URL attachment is already restricted; that protection should stay.

**Recommended fix:** Fail closed on decode failure; validate and sanitize accepted image bytes on a trusted path, bound issued uploads/total size, and expire unused uploads. Add a proportionate moderation/report route.

**Fix before launch? YES for publicly writable upload abuse boundaries.**

### H12 — Enabling the new matcher can regress personal-Fajr behavior

**Area:** Matching / time. **Severity:** High, release-path risk.

**What happens:** The legacy generation path computes per-member dawns; the enabled new-matcher path uses shared run expiry and does not follow the same dawn-schedule path. Polar calculations can produce no opening within the search horizon. Expiry is a fixed 24 hours rather than necessarily the next dawn.

**Example:** An optimization rollout changes when Tokyo and San Francisco members can act; a high-latitude member never gets a calculated opening during part of the year.

**Why it matters:** Speed cannot trade away existing product semantics.

**Evidence:** `supabase/functions/generate-round/index.ts`, `src/lib/prayerTimes.ts`, `0128_every_member_their_own_dawn.sql`; live `reciprocal_matching_v1` is false. This is not a claim that the currently disabled path is disrupting today's rounds.

**Recommended fix:** Share the authoritative personal-window contract across implementations. Specify a high-latitude fallback, missed-job recovery and travel policy; verify cross-timezone behavior before changing the flag.

**Fix before launch? YES for affected supported regions and before matcher activation.**

### H13 — Scale and predictive quality remain unproven

**Area:** Matching / marketplace. **Severity:** High for growth claims, not proof a small beta cannot work.

**What happens:** Bounded output is not necessarily bounded candidate work. Existing historical benchmark evidence also warns that set-local top-choice success and independent preference prediction are different measurements.

**Example:** Five mutually acceptable profiles produce a favorable metric while better suitable profiles were never considered, or preparation still scans large opposite-side pools despite returning few edges.

**Why it matters:** The app cannot promise universal best matches or cheap linear growth from these results.

**Evidence:** `docs/MATCHER_BENCHMARK_VALIDITY.md`, snapshot/allocator implementation and disabled live new-matcher flag. Historical benchmark findings are not a fresh benchmark of today's code.

**Recommended fix:** Retain existing implementations for comparison. Budget candidate work using coarse reciprocal hard constraints and rotating unexplored subsets; score soft preferences rather than filtering them. Measure independent held-out choice prediction, candidate quality/coverage, reciprocal exposure, low-percentile outcomes, latency and database work together. Do not optimize a self-grading simulation.

**Fix before launch? YES before mass-scale claims; a capped, instrumented beta can precede 100,000-user proof.**

## Medium Issues

### M1 — Nobody suitable cannot finish the daily set

**Area:** UX. **Severity:** Medium. **What happens:** Send is disabled with zero selections although the backend can accept an empty selection. **Example:** A member likes nobody and cannot deliberately finish. **Why it matters:** Encourages filler choices or abandonment. **Evidence:** `app/(tabs)/daily.tsx`, selection RPC. **Recommended fix:** A calm “Nobody today — finish” action, no individual rejection ritual. **Fix before launch? PREFERABLY.**

### M2 — Read-receipt privacy and unread state are coupled

**Area:** Chat / privacy. **Severity:** Medium. **What happens:** Disabling receipts suppresses read updates also used for personal unread state; direct participant message reads can bypass RPC masking of existing receipt fields. **Example:** Read conversations remain unread indefinitely. **Why it matters:** Badges lose credibility and privacy controls are inconsistent. **Evidence:** `src/api/connections.ts`, connection unread query in 0153, messages SELECT policy. **Recommended fix:** Separate private read progress from shared receipts and restrict exposed receipt columns consistently. This does not let an attacker force someone to generate a new receipt. **Fix before launch? PREFERABLY.**

### M3 — City labels can disagree with actual coordinates

**Area:** Matching / location. **Severity:** Medium. **What happens:** Nearest curated city has no guaranteed country-boundary or maximum-distance correctness. **Example:** A border resident gets the neighboring country's label and incorrect country eligibility. **Why it matters:** Quietly wrong introductions. **Evidence:** `src/data/cities.ts`, `src/lib/deviceLocation.ts`. **Recommended fix:** Keep canonical country IDs separate from translated labels; handle uncertain labels explicitly and test border/remote coordinates. Resolve the pending manual-city decision rather than silently changing it. No paid geocoding provider is inherently required. **Fix before launch? PREFERABLY.**

### M4 — Offline message mutations need serialization and expiry

**Area:** Mobile reliability. **Severity:** Medium; race risk. **What happens:** Read-modify-write outbox operations can overwrite concurrent changes; pending messages need safety/account-transition invalidation. **Example:** Two quickly queued offline messages lose one entry, or an obsolete message is retried later. **Why it matters:** Trust in conversation delivery. **Evidence:** `src/lib/messageOutbox.ts`, related outbox policies. **Recommended fix:** Serialize scoped mutations and revalidate connection/account state on send; clear terminal failures and expire stale drafts. Preserve existing secure storage. **Fix before launch? PREFERABLY.**

### M5 — Profile lookup failure can look like incomplete onboarding

**Area:** Authentication / recovery. **Severity:** Medium. **What happens:** A profile-loading failure is converted into an onboarding-not-complete state. **Example:** A returning member sees setup again during a backend outage. **Why it matters:** They may think their account disappeared. **Evidence:** `src/state/auth.tsx`. **Recommended fix:** Distinguish unknown/loading/error from confirmed incomplete; retry safely. Also verify OAuth callback ownership across API and link listener to prevent duplicate exchange. **Fix before launch? PREFERABLY.**

### M6 — Answers permit harassment/contact leakage before chat

**Area:** Safety / icebreakers. **Severity:** Medium, operationally important. **What happens:** Length validation does not reject meaningless, threatening or contact-sharing answers. Chat-specific contact controls do not establish the same protection for answers. **Example:** “Add me on WhatsApp…” is used to bypass the intended getting-to-know-you stage. **Why it matters:** The gate guarantees participation, not thoughtful or safe participation. **Evidence:** Answer submission in 0153 versus message-boundary rules. **Recommended fix:** Apply consistent policy where intended and provide answer-context reporting. Do not pretend AI-authorship detection can reliably judge sincerity. **Fix before launch? PREFERABLY; effective reporting before launch is essential.**

### M7 — Operational telemetry is incomplete and error text is not sanitized

**Area:** Operations / privacy. **Severity:** Medium. **What happens:** Analytics sink defaults to null with no registration found; raw error messages can retain values despite stack removal. Anonymous error intake shares a global quota. **Example:** One actor exhausts unauthenticated reporting while an actual sign-in outage occurs. **Why it matters:** Silent failures and unnecessary sensitive logs. **Evidence:** `src/lib/analytics.ts`, client-error RPC. **Recommended fix:** Minimal allowlisted events/error codes, explicit sink, separate abuse-limited ingress. Never collect answer bodies, private preferences or coordinates as analytics properties. **Fix before launch? PREFERABLY.**

### M8 — Recap generation needs bounded repeated work

**Area:** AI / cost / safety. **Severity:** Medium. **What happens:** Concurrent cache misses and language variants can repeat external generation; free text can steer generated content. **Example:** Multiple devices request the same recap and spend several model calls. **Why it matters:** Cost and unreliable statements about compatibility. **Evidence:** `supabase/functions/connection-summary/index.ts`; feature requires provider configuration not verified here. **Recommended fix:** Single-flight or bounded job per connection/language/version, timeout and graceful fallback, authorization recheck before delivery, clearly non-authoritative language. Coordinate with Claude rather than editing active translation work. **Fix before launch? PREFERABLY if enabled.**

### M9 — Waitlist writes are not proof of email ownership

**Area:** Abuse / operations. **Severity:** Medium. **What happens:** Public waitlist upsert can alter details for a supplied email without verifying control. **Example:** Someone overwrites another subscriber's city/age. **Why it matters:** Polluted launch data and potential unwanted contact. **Evidence:** `0093_waitlist.sql`, anonymous execution grant. **Recommended fix:** Keep unverified submissions append-only/bounded or verify email before updates; rate-limit intake. **Fix before launch? PREFERABLY.**

## Minor / Polish

### L1 — Product language needs one source of truth

**Area:** UX / trust. **Severity:** Low for wording, higher when contractual. **What happens:** Terms describe outdated keep limits; “match,” “interest” and “introduction” can imply different states. **Example:** Five introductions are understood as five people already interested. **Why it matters:** Avoidable disappointment. **Evidence:** `src/data/legalDocuments.ts`, `DECISIONS.md`, daily/connection flow. **Recommended fix:** Canonical capability values and precise copy; preserve “Halal Mode Premium.” **Fix before launch? PREFERABLY; legal contradictions belong in C1.**

### L2 — Accessibility and visual polish are not verified by this audit

**Area:** Accessibility / mobile. **Severity:** Low as an evidence gap; discovered critical-action barriers could be high. **What happens:** No native screen-reader, large-font, reduced-motion or keyboard run was completed. **Example:** A beautifully animated fan might still have confusing focus order. **Why it matters:** Source labels do not prove usability. **Evidence:** Verification scope above. **Recommended fix:** One targeted native pass through sign-in, daily choice, answer, block/report and deletion on small-screen large text plus VoiceOver/TalkBack. Do not redesign blindly. **Fix before launch? PREFERABLY, with critical-action barriers fixed before release.**

## 1. Broken or Missing User Flows

These are the concrete dead ends found or needing verification, not a claim every possible flow was executed:

| State transition | Finding / required behavior |
|---|---|
| Signed out → authenticating → profile loading → onboarding/ready | Profile-load error needs its own retry state, not onboarding (M5). |
| Partial onboarding → background/termination → resume | Verify persisted step/data and permission-denial recovery on native; untested here. |
| Round prepared → personal opening → reviewing → submitting → confirmed | Early access H1; timeout recovery H4; zero-choice completion M1. |
| One-sided interest → other person's later window → mutual or expired | Preserve interest independently of own window; verify actual cross-timezone run, block/deletion/material-profile-change handling. No premature rejection status. |
| Mutual → questions chosen → answering → recap → chat | Final-answer race H3; answer-debt bypass H2. |
| Active connection → blocked/deleted → old link/push | Deny new reads/sends; stale URL/cache and queued push limits H9/H10. |
| Report submitted → moderation → action/appeal | Evidence survival H7; operational ownership and response time must be demonstrated. |
| Deletion requested → recovery window → finalized | Explain immediately hidden versus permanently erased; safety-retention exception explicit. |
| Push permission denied / token rotates / account switches | App remains usable; ownership H8. |
| Offline chat → retry → terminal failure | No silent lost drafts or messages to a closed connection (M4). |

## 2. Privacy Attack Map

| Target | Attempt | Assessment |
|---|---|---|
| Identity | Recognize name/photo, reverse-image-search, screenshot | Inherent once disclosed. Minimize presentation; do not promise anonymity. |
| Exact location | Raw profile read as another member | Narrow live test denied; safe profile omitted coordinates. Good boundary. |
| Location inference | Change radius/preferences and observe repeated eligibility | Plausible inference risk, not reproduced; limit probing and avoid precise diagnostic feedback. |
| Photos | Future-round storage access; save signed URL; retain cache after block | H1/H10; private bucket alone insufficient. |
| Attraction | Probe one-sided outcomes or interpret notification timing | Do not expose one-sided counts/status. End-to-end timing non-disclosure not proven here. |
| Private preferences/scores | Direct authenticated table query | Preferences denied in runtime probe; private-table SELECT grants absent. No claim every RPC was exhaustively tested. |
| Messages | Read unrelated connection / old deep link | Unrelated connections hidden in narrow probe; test each send/read after block with real JWTs. |
| Answers | Fetch raw answers before contributing | Raw answer probe returned none; approved all-own-answer gate exists. Race/alternate route tests still needed. |
| Activity | Shared device token, stale lock-screen notifications | Confirmed ownership design regression H8. App name itself can disclose usage. |
| Sensitive narrative | AI recap or raw error message | C1/M7/M8; distinguish authorized processing from disclosed processing. |

## 3. Abuse Cases

The following are attack scenarios, not 24 claims of successful exploitation:

1. Scrape one's prepared introductions before dawn — H1.
2. Reuse a media URL after blocking — H10.
3. Screenshot and reverse-search a woman's photo — inherent disclosure risk.
4. Upload stolen/AI-generated photos — moderation/identity assurance unverified.
5. Upload thousands of unattached objects — H11.
6. Report a known UUID without eligible interaction — H7.
7. Mass-report a member through many accounts — rate limits and human context needed.
8. Delete an account to remove report evidence — H7.
9. Re-register after suspension — ban-evasion resistance not established.
10. Pose as unmarried — self-report is not marital-status certification.
11. Request money/visa fees after building trust — context report and scam education.
12. Move a member off-platform through an icebreaker — M6.
13. Put threats/sexual material in answers — M6.
14. Copy pleasant boilerplate into every answer — participation is not sincerity.
15. Use an older RPC to bypass answer obligations — H2.
16. Manipulate tapping order to affect supposed rank telemetry — H5.
17. Receive another account's pushes on a shared phone — H8.
18. Probe location by changing filters repeatedly — inference risk, not proven.
19. Spoof device coordinates — range validation does not establish physical presence.
20. Repeatedly request uncached recap variants — M8.
21. Exhaust anonymous error-report quota to hide faults — M7.
22. Overwrite someone else's unverified waitlist details — M9.
23. Pressure another person with “the app says we are compatible” — make recap explicitly non-authoritative.
24. Return via a second account after a block — account-level blocking is not person-level protection.

## 4. Marketplace Failure Modes

Illustrative arithmetic, **not a simulation**: in a balanced fully reciprocal heterosexual pool, daily five distinct opposite-side introductions consume potential partners quickly if nobody can repeat. Real hard constraints make the effective pool much smaller.

| Total active members | Balanced opposite-side upper bound/member | At five/day with no repeats | Practical implication |
|---|---:|---:|---|
| 50 | 25 | 5 days | One city's narrow preferences exhaust almost immediately. |
| 500 | 250 | 50 days | Countries/age/language can fragment this into tiny pools. |
| 5,000 | 2,500 | 500 days | National signup count is not local reciprocal liquidity. |
| 50,000 | 25,000 | 5,000 days | Plenty in aggregate can coexist with empty specific cohorts. |

These are absolute idealized inventory ceilings, not forecasts. Inactivity, blocks, existing connections and reciprocal constraints reduce them. Ten introductions/day halves the arithmetic horizon. The legacy no-repeat behavior therefore needs an explicit exhausted-pool strategy, not fillers.

For a 4:1 population imbalance and symmetric exposure, if every minority-side member receives at most five, majority-side average exposure cannot exceed 1.25. No algorithm can give both sides five without changing those capacity assumptions. Explain shortages honestly.

Show fewer genuinely eligible people with a neutral explanation and next check time. Offer optional preference review without disclosing anyone else's private constraints. Never silently relax must-haves. Distinguish regional expansion from paid eligibility. Reciprocal country openness remains bilateral.

Rotating coarse pools is sensible **if** coarse pruning uses safe hard constraints, avoids permanently excluding plausible international pairs, and records exploration so obscure members are not stranded. Random buckets alone do not guarantee eventually seeing everyone when the pool changes or work budgets are finite. Measure coverage and opportunity cost.

Universal reciprocal first choices are mathematically impossible in some preference graphs: two people can both rank the same person first, while that person has only one first choice. Optimize probability and genuine fit; never guarantee the impossible or lower set quality to manufacture the metric.

## 5. Database/RLS Findings

**Positive evidence:** RLS enabled, private media buckets, no authenticated private-table SELECT, own-profile-only result, no unrelated connections/raw answers in the scoped probe. No exposed service-role key was established by this assessment. Absence of a finding is not a completed secret scan of all history or deployment systems.

**Separate concerns:**

1. Introduction SELECT helper lacks opening-time condition (H1).
2. Storage relationship helper lacks that same temporal boundary (H1/H10).
3. Legacy selection route lacks new obligation check (H2).
4. Selection commit needs current safety/eligibility revalidation (H1).
5. Answer transition serialization missing (H3).
6. Reports raw INSERT bypasses contextual validation (H7).
7. Reports cascade with reporter/subject deletion (H7).
8. Device upsert conflicts with exclusive-token constraint (H8).
9. Notification claim has no lasting lease (H9).
10. Folder-based media permission is broader than attached-object permission (H10).
11. Upload total-account quota not established (H11).
12. Participant raw message access and receipt masking differ (M2).
13. Anonymous write endpoints need distinct abuse controls (M7/M9).
14. Broad TRUNCATE/TRIGGER privileges should be removed where unnecessary. No remotely callable exploit using them was established; do not label this an existing public data-wipe endpoint.
15. Private-schema USAGE is not itself a leak; some helpers are needed by RLS. Do not revoke indiscriminately and break policies.

Keep existing unique constraints, transaction boundaries and pair locks. Add focused regression tests at the actual role/RPC boundary, including older callable functions. Parsing migrations is not a substitute for applying/testing them on an isolated database.

## 6. UX Confusion Points

- Introductions are not mutual matches; five cards do not mean five admirers.
- “First choice” currently is not an explicit choice (H5).
- Different free/premium selection limits appear across brief, terms and implementation.
- All-your-answers-first differs from question-by-question reveal; explain the actual gate once.
- Waiting is not rejection, and a missing member should not reveal whether they blocked or deleted.
- “No introductions” must distinguish finishing today, temporary service failure and genuinely limited supply without private diagnostics.
- “Private photos” must not imply screenshot protection.
- Recovery-window deletion is not instantaneous erasure.
- “At Fajr” needs a named location/calculation basis and travel behavior.
- Summary text should invite conversation, not declare religious or marital suitability.

## 7. Women's Safety Review

Photo recognition and off-platform retaliation can matter more than raw database secrecy. Fix early media access, clarify downloadable-image limits, provide immediate block/report even during legal gates, and avoid exposing the reporting party. Discreet pushes should be opt-in with previews explained; installed-app identity cannot be hidden by generic text alone.

A report must capture the relevant answer/message/photo context before it disappears. Prove a real escalation owner can respond to stalking, threats and impersonation. Do not present email/phone verification as proof of identity, marriage status or safety. Live identity-verification flag was off.

Do not add a family/wali circle: the owner explicitly excluded it. Instead make the product's limits clear so people requiring family-mediated interaction can decide whether it fits them.

## 8. Men's Safety/Scam Review

Synthetic interest is especially corrosive when a member rarely receives real interest. Remove public demo contamination before measuring conversion or selling Premium. Provide report categories/context for financial solicitation, impersonation and repeated off-platform pressure.

Low match rates do not establish low personal worth. Avoid opaque desirability labels or paid boosts framed as fixing the person. More interests for Premium can change congestion and dilute the meaning of interest; track real two-sided conversation activation rather than paid selections alone. Verification does not eliminate organized scams.

## 9. Internationalization Problems

**Claude's in-progress translations are excluded.** No missing-language-file finding is assigned here, and no translation files were changed.

Structural follow-up, coordinated after that work settles:

- Canonical IDs for countries, questions and enums must be independent of display language.
- Static legal-document delivery remains separate from ordinary translated UI; obtain reviewed language versions rather than silently serving an unreadable consent document.
- Personal Fajr calculation needs high-latitude and location-change policy, not translated strings alone.
- Check mixed RTL names/phone numbers, screen-reader order, long buttons, plural rules, date/age boundaries and non-Latin search on actual devices.
- Do not infer shared conversational language from translated UI or an AI-generated recap.
- Avoid religiosity labels implying one culture's vocabulary is a universal scale. No theological certification is claimed by this assessment.
- Multi-language question IDs must still identify the same question when reusing saved answers; stale answers need an obvious edit/review path.

## 10. Edge-Case Matrix

| Scenario | Required behavior | Current evidence/status |
|---|---|---|
| A reads B's raw profile | Deny private row | Narrow live probe passed. |
| Before personal Fajr | No future profile/media/selection access | H1 boundary gap. |
| Tokyo chooses San Francisco | Later local window can reciprocate | Full cross-timezone write scenario not run. |
| Both submit final answer together | Exactly one consistent stage advance | H3 race. |
| Submit commits but response disappears | Reload/retry confirms original result | H4 gap. |
| Select nobody | Finish respectfully | M1 UI gap. |
| Old app submits while owing answers | Same rule as new app | H2 bypass. |
| Block races message | Serialize/order authorization consistently | Existing pair locks useful; two-session proof outstanding. |
| Delete races generation | No new eligible exposure after hide boundary | Needs explicit commit-boundary test. |
| Report races deletion | Minimal authorized evidence survives | H7 cascade problem. |
| A signs out, B signs in same device | Exclusive push ownership | H8 regression. |
| Two notification workers overlap | One active lease per item | H9 gap. |
| Two devices answer same question | Idempotent answer, consistent stage | Unique answer helps; end-to-end race test needed. |
| GPS denied | Clear supported fallback or explanation | Manual-city approval unresolved. |
| Border/remote village | Correct canonical region or uncertainty | M3. |
| Polar region | Explicit supported fallback | H12. |
| Date line / DST / travel | No extra free set or silently lost window | Policy and runtime verification needed. |
| Fake phone clock | Server remains authoritative | Verify countdown display cannot change authorization. |
| Block then open old push | Generic unavailable state; no fresh data | Queue/media qualifications H9/H10. |
| Six photos attached, many unbound uploads | Total quota and cleanup | H11. |
| AI service fails | Existing answers usable; recap recoverable | Timeout/fallback proof needed. |
| Read receipts off | Personal unread still clears | M2. |
| Small phone, largest text, RTL | Critical actions reachable and labelled | Native verification outstanding. |
| App killed during upload/onboarding | No false completion; recoverable draft | Native interruption tests outstanding. |

## 11. Launch Blockers

Only these should block **public** release now; not every polish item above:

1. Correct privacy/processing/retention promises and legal version (C1).
2. Remove public synthetic engagement and separate test data (C2).
3. Close early-window and older-RPC authorization gaps (H1/H2).
4. Make the core final-answer transition reliable (H3).
5. Make safety actions always reachable and reports durable/bounded (H6/H7), with an actual moderation response owner.
6. Fix shared-device notification ownership and stale/duplicate safety handling, or temporarily disable push (H8/H9).
7. Enforce bounded, authorized uploads/media access consistent with the privacy promise (H10/H11).

Conditional gates: do not turn on the new matcher until local-Fajr invariants hold; do not claim measured mutual-first-choice optimization until H5 is fixed; do not market 100,000-user capacity before realistic evidence. These need not prevent a tightly capped beta on the existing path.

After concurrent translation work finishes, obtain a clean client test run and a small native critical-flow pass. The present blocked run is **not** evidence Claude's translation work is defective.

## 12. First 30 Days After Launch

Use minimal pseudonymous operational events, short retention and no raw answers/preferences/location in analytics.

| Measure | What it reveals |
|---|---|
| Eligible active members and actual introductions per member, p10/median/p90 | Scarcity and starvation concealed by averages. |
| Reciprocal exposure, one-sided edge count | Core consistency; unexplained one-sided edges demand investigation. |
| Explicit mutual-first-choice rate plus whole-set quality and denominator | Whether the central objective improves without manufacturing it. |
| No-choice rate, repeat rate, days without a suitable candidate | Exhaustion and filler pressure. |
| Selection → mutual → answers started/completed → conversation activated | Where meaningful connections fail. |
| Waiting time by side/timezone, abandonment after answer debt | Friction and asymmetric effort. |
| Conversation continuation through voluntary actions, not message content | Actual sustained engagement. |
| Block/report rate per exposure and response time | Safety, adjusted for opportunity rather than raw totals. |
| Round latency, DB work, queue age, retries, stale work, cost/member | Operational capacity and cost. |
| Submission ambiguity, stuck completed-answer stages, auth recovery errors | Concrete silent failures. |
| Successful deletion completion and unresolved safety-retention requests | Trust and operational hygiene. |

Separate demo, internal tests, inactive users and returning users. Do not celebrate raw swipes, notifications sent, time spent, select-all rate or AI recap requests as relationship success. Avoid publishing tiny-cohort metrics that reveal individuals.

## 13. Things That Look Like Good Ideas but Could Backfire

- **Exactly five every day:** creates pressure to add unsuitable filler. Fewer honest candidates is better.
- **Unlimited/no-repeat forever:** preserves novelty until a small pool becomes permanently empty.
- **More Premium interests:** may dilute sincere signaling and overwhelm the scarce side.
- **Ranking everyone:** can create self-reinforcing popularity strata without improving individual fit.
- **Mutual-top rate alone:** can rise when options get worse or narrower.
- **Strict answer-debt gate:** rewards courtesy but can feel punitive if the other side stalls; provide clear safe exits.
- **Reused answers:** reduces typing but can spread outdated or sensitive details across connections.
- **Compatibility prose:** sounds authoritative even when based on a few self-reports.
- **Private-photo marketing:** can falsely reassure users about screenshots.
- **Daily dawn ritual:** distinctive, but religious meaning raises expectations around calculation and respectful communication.
- **“Free infrastructure”:** deferred cost is still cost; storage, SMS, media, moderation and AI need explicit budgets.
- **Family features:** would violate the owner's present concept; do not add them as a generic safety fix.

## 14. What I Am Probably Not Thinking About

1. A backend migration can leave old app versions bypassing new rules even when the latest screen is perfect.
2. Language-specific recaps multiply cache entries and model cost; translation is also an operational concern.
3. Report retention and deletion pull in opposite directions; solve narrowly before a real abuse case forces a rushed decision.
4. Profile edits after interest can materially change what someone agreed to; define when renewed confirmation is appropriate without leaking old sensitive data.
5. Multiple accounts defeat person-level safety even when account-level blocking is correct.
6. One side's very low participation can make balanced registrations look healthy while actual reciprocal capacity collapses.
7. Synthetic data can poison future ranking/calibration if excluded only in the UI, not training/metrics.
8. A push or app icon can disclose marriage-app usage even with no name in its body.
9. A new matcher rollout can silently change time semantics despite improving measured speed.
10. Disaster recovery, support access, retention in backups and restore drills were not established here. A successful daily cron is not operational readiness.

### Platform and legal review, not legal advice

UGC safety must be operational: filtering appropriate to risk, reporting, blocking and a reachable support function are part of [Apple's review requirements](https://developer.apple.com/app-store/review/guidelines/). Social/dating products also need to address [Google Play's child-safety standards](https://support.google.com/googleplay/android-developer/answer/14747720); have a responsible person verify the current declarations and escalation process before submission.

Religious information can be special-category data under UK GDPR; lawful basis, additional conditions, transparent processing and retention need jurisdiction-specific review, not a generic checkbox. See [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/special-category-data/). Verification or facial biometrics, if later introduced, require a separate assessment rather than inheriting ordinary photo consent.

Push tickets are not final delivery receipts; provider batching and receipt handling should follow [Expo's notification documentation](https://docs.expo.dev/push-notifications/sending-notifications/). Storage protection depends on policies and URL behavior, not just the private-bucket switch; see [Supabase storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## 15. Priority Fix List

**Fix now**

1. Freeze a reviewable snapshot after Claude's work; rerun baseline. Do not interfere with translations.
2. Confirm actual 3/10-interest and all-own-answers behavior as the canonical product contract.
3. Fix shared backend authorization predicates and legacy entry-point parity (H1/H2/H6).
4. Fix answer transition serialization with one targeted concurrent test (H3).
5. Fix device ownership; disable push temporarily if safe ownership cannot be established (H8).

**Fix before public launch**

6. Resolve privacy text/processing/retention and demo isolation (C1/C2).
7. Harden reports/evidence and prove the moderation response workflow (H7).
8. Bound media ingestion/access and notification delivery work (H9–H11).
9. Add explicit first-choice evidence or stop using tap order as rank (H5).
10. Complete a concise real-device flow: sign-in → onboarding → daily set → mutual → answers → chat → block/report → deletion, with one offline retry and account switch.
11. Verify local-Fajr invariants before any matcher flag change; retain rollback.

**Fix soon after launch / before increasing beta limits**

12. Nobody-today completion, read/unread separation, submission/outbox recovery, uncertain-location handling and minimal analytics (H4/M1–M7).
13. Benchmark the actual candidate preparation plus allocation pipeline at increasing bounded sizes on isolated representative data; include skew, sparse pools and concurrent API traffic. Publish measured cost/latency, not extrapolated guarantees.
14. Add bounded recap caching/timeouts and finish structural native localization/accessibility checks with Claude's completed work.

**Monitor**

15. Reciprocal quality plus whole-set quality, low-percentile exposure, pool exhaustion, answer abandonment, safety response times, queue backlog and cost/member. Expand only when evidence supports it.

**Recommended approach:** repair the existing boundaries and reliability defects, not a new architecture. No paid maps provider, global all-pairs scan, extra family system, or giant new ranking framework is required to close these findings.

## Source navigation

All paths below refer to the reviewed workspace. Functions may have later replacements in migrations; live deployed definitions were consulted for the specific live findings above.

- [Product decisions](C:/Users/Mohammed/Documents/HalalModeX/DECISIONS.md)
- [Legal content](C:/Users/Mohammed/Documents/HalalModeX/src/data/legalDocuments.ts)
- [Daily screen](C:/Users/Mohammed/Documents/HalalModeX/app/(tabs)/daily.tsx)
- [Round state](C:/Users/Mohammed/Documents/HalalModeX/src/state/round.tsx)
- [Introductions API](C:/Users/Mohammed/Documents/HalalModeX/src/api/introductions.ts)
- [Auth state](C:/Users/Mohammed/Documents/HalalModeX/src/state/auth.tsx)
- [Profile media](C:/Users/Mohammed/Documents/HalalModeX/src/api/profileMedia.ts)
- [Media access migration](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0017_private_profile_media.sql)
- [Question transitions](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0020_question_catalog.sql)
- [Legal RPC boundary](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0047_legal_consent_rpc_boundary.sql)
- [Introduction authorization](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0048_introduction_scoped_safety_actions.sql)
- [Personal dawns](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0128_every_member_their_own_dawn.sql)
- [Notification migration](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0141_actually_send_notifications.sql)
- [Demo implementation](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0148_demo_members.sql)
- [Interest limits and answer gate](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0150_interest_limits_answer_gate_saved_answers.sql)
- [Answer reveal rules](C:/Users/Mohammed/Documents/HalalModeX/supabase/migrations/0153_reveal_after_all_your_answers.sql)
- [Round worker](C:/Users/Mohammed/Documents/HalalModeX/supabase/functions/generate-round/index.ts)
- [Recap worker](C:/Users/Mohammed/Documents/HalalModeX/supabase/functions/connection-summary/index.ts)
- [Historical benchmark validity review](C:/Users/Mohammed/Documents/HalalModeX/docs/MATCHER_BENCHMARK_VALIDITY.md)

No application fixes, migrations, commits or deployment were performed as part of this assessment. This report is the only file created by the assessor.
