# Private Matching Signal Estimator — Claude Review Handoff

**Purpose:** review the current Codex implementation as a second set of eyes. This is a private matching signal for Halal Mode, not a public profile score or a replacement for stated preferences. The work is on `feature/halal-cards` and has not been deployed. Do not deploy it or change the production database as part of this review.

## Product intent

Halal Mode should make reciprocal introductions, not rank people in public or leave people with fewer signals out of the pool. A private score summarizes how a member is being received in the current pool. Higher means the available behavioral and presentation signals are more positive; it does not mean more worthy, more compatible, or better as a person. The score is never shown to members, including the person it describes.

The score is one modest input to reciprocal matching. Preferences and eligibility still define who can be considered. A separate exposure rotation continues to protect opportunities; a low score never removes someone from that rotation. Reception similarity is a small preference between two people, never a band or eligibility gate. The existing fairness and capacity rules remain in place.

The purpose is to improve reciprocal outcomes for both sides. If the score later informs product experiments or Premium timing, that must be a separate, reviewed use—not an implicit consequence of this matching change.

## Current flow

```text
Short-lived on-device timers + authoritative choices
            ↓ normal round-submission RPC
Private DB validates the round and applies server-owned metric switches
            ↓ bounded, confidence-aware estimate
Private member snapshot → reciprocal matcher → existing fairness rotation
```

Members do **not** receive score values, metric weights, component values, Luna settings, or per-metric yes/no flags. They do not get a control to opt individual metrics in or out. Their current privacy-consent version gates server storage and processing. The app keeps raw milliseconds in memory, rounds durations to five-second increments, caps each item at 120 seconds, and submits them with the member's normal round choices. The database decides whether each metric is currently enabled and discards disabled measurements before storage. If all attention metrics are off, the server skips saving those observations.

Selection and rank evidence comes from the database's own round records; the client cannot claim who selected whom. Photo observations are accepted only for a photo currently on that introduced profile. The submitted storage path is hashed server-side and only the hash and bounded seconds are retained in the observation table.

## Configurable signals

Global config lives in `halal_mode_private.matching_signal_metric_config`. Component weights are normalized over the enabled person-level components, so disabling a component does not require rewriting or rescaling every other setting.

| Metric key | Default | Evidence / role |
| --- | ---: | --- |
| `selection_rate` | on, 0.40 | Chosen introductions divided by authoritative exposures, with a neutral prior. |
| `first_choice_rate` | on, 0.20 | How often the member is ranked first among their selections, with a neutral prior. |
| `profile_attention` | on, 0.05 | Relative profile-reading time within the viewer's round. |
| `bio_attention` | on, 0.10 | Relative bio-reading time within the viewer's round. |
| `photo_attention` | on, 0.15 | Relative attention to photos; photos are averaged per member per round so members with more photos do not get extra sample weight. |
| `mutual_first_choice` | on, 0.15 | History of being one another's first choice. |
| `luna_presentation` | **off**, 0.10 | Optional photo-presentation features; costs API usage when processed. |
| `reception_similarity` | on, 0.08 | Separate pair-level soft preference; it is not part of the individual score. |

The person-level estimate is bounded from 0.05 to 0.95. New or weakly observed members start near 0.50 with low confidence. Confidence blends the estimate toward neutral in the matcher. Attention ranks are calculated within each viewer/round, reducing the effect of one person's general browsing speed. Evidence uses a rolling 180-day window.

The matcher applies the reception similarity setting as a multiplier on the existing reciprocal score. The current weight is capped at 0.20, so even its maximum cannot become a hard exclusion. The score and confidence are frozen into each matching-run snapshot so a run does not change halfway through.

## Optional Luna photo analysis

Luna is disabled by default. When enabled by a trusted backend operator, eligible current profile photos are analyzed by the existing server-side moderation worker using the existing OpenAI credential and image detail `low`. It requests only four presentation measures: clarity, lighting, framing, and background distraction. It is explicitly instructed not to assess attractiveness, identity, age, ethnicity, religion, emotion, personality, or suitability.

Enabling Luna does not backfill every existing photo. Newly eligible photos can queue; an operator must separately invoke the bounded backfill (at most 50 per call). The existing moderation worker claims at most two Luna photos per invocation, and the queue checks the current switch and consent again before work and before saving. Turning Luna off stops new processing and prevents results from changing the score. Claude should specifically verify the disable behavior and queue cleanup paths.

## Backend controls and security boundary

The migration provides service-role-only backend functions to inspect and change one metric at a time and to queue a bounded photo backfill. These functions are not for a browser client. Private tables have RLS enabled and no direct app grants. The matching service accessor that returns the per-member snapshot is also service-role-only. Do not add the service-role key to Expo, web JavaScript, or an `/admin` static bundle.

There is no admin dashboard in this implementation. A separate `halalmo.de/admin` dashboard would be useful once these controls are used regularly: it can present the global switches and weights clearly and expose safe operational status. It must not rely on the route being obscure. Build it only with server-verified admin authorization, a narrowly scoped server endpoint/Edge Function, and an audit record for every global change. Keep Luna's explicit backfill as a separate, confirmed action. Until that exists, controls remain backend/operator-only.

## Files to review

- `supabase/migrations/20261021102527_private_matching_signal_estimator.sql` — private schema, scoring, retention, backend controls, legal version, matching snapshot, and Luna queue.
- `src/lib/matchingEngagement.ts` — in-memory profile/bio/photo timer aggregation and bounded snapshots.
- `src/state/round.tsx`, `app/introduction/[id].tsx`, `app/gallery/[id].tsx` — timer lifecycle and normal round submission integration.
- `src/api/introductions.ts` — new ranked submission RPC and compatibility fallback for an older database.
- `src/matching/estimate.ts`, `supabase/functions/generate-round/matching.ts` — confidence blend and soft pair preference, separate from fairness rotation.
- `supabase/functions/moderate/index.ts` — Luna processing on the existing server worker.
- `src/data/legalDocuments.ts` — the single app source for the updated privacy notice.
- `tests/matchingEngagement.test.ts`, `tests/matchingEstimate.test.ts`, `supabase/tests/database/0199_private_matching_signals.test.sql` — client logic and database access/config checks.

## What to scrutinize

1. Verify a disabled attention metric is not written even when another attention metric is enabled; verify all attention metrics off means no observation retention.
2. Verify current legal consent is required before observation or photo processing, and that withdrawal, photo replacement/removal, account deletion, and demo/test accounts cannot leak stale data into a score.
3. Verify only server-derived selections, ranks, and mutual outcomes affect their components; the client must not be able to inflate another member's score with arbitrary IDs, seconds, or photo paths.
4. Verify private score/component data and metric settings are inaccessible to `anon` and `authenticated`, including through function defaults and views. No member-facing flags should exist.
5. Verify the rolling window, score confidence, no-history neutral prior, and behavior when component weights are all zero.
6. Verify a low score cannot remove eligibility, suppress the independent exposure rotation, bypass stated preferences, or override existing capacity/reciprocity constraints.
7. Review whether the 180-day window and per-profile attention aggregation are statistically adequate at launch volume. Do not add sensitive demographic variables to the score.
8. Review Luna's cost bounds, low-detail image payload, explicit opt-in-by-operator behavior, and whether its presentation signals could produce photo-quality or accessibility bias. Keep it off until the owner deliberately enables it after review.
9. Identify the smallest worthwhile scale test for the 500/hour and 10,000/hour scenarios. The current test suite is not a production load test.
10. Do not build monetization, notifications, Premium prompts, public scores, or an admin dashboard as a side effect of this review.

## Verification status at handoff

`npm run verify:client` passed locally (typecheck, lint, SQL parser, and 442/442 JS tests). CI applied the migrations after a missing-parenthesis fix in commit `21303f9`, and the estimator-specific pgTAP file `0199_private_matching_signals.test.sql` passed. The overall database job is still failing in the consent-version and referral-profile fixtures; see `CLAUDE_HANDOFF_REFERRALS_ESTIMATOR_ADMIN_DASHBOARD.md` for exact failures. No migration, function, secret, website, or app deployment has been performed here.

## Decisions requested from Claude

Return findings in three groups: **must fix before merge**, **safe to launch with monitoring**, and **defer**. For each must-fix item, cite the exact file/function and explain the concrete exploit or user-impact path. Do not broaden scope or change the model's product purpose without asking the owner.
