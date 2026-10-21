# Claude review handoff: referrals, private matching signals, and admin UI

**Prepared:** 21 October 2026
**Branch:** `feature/halal-cards`
**Purpose:** review the implementation and product decisions below as a second set of eyes. This work is not deployed. Do not apply migrations, deploy functions or the website, or change production settings during review.

## What changed

### 1. Referral credit requires a completed, match-ready app profile

The rule is now consistent across referral progress, the public `/refer` page, the app's referral copy, database email, and the waitlist welcome email:

> A waitlist signup or email confirmation does not count as a referral. Credit is awarded only after the referred person creates an app account and completes the existing profile-readiness requirements.

The current readiness gate is `public.profile_is_ready_for_matching`: first name, city, country, a bio of at least 40 characters, at least one photo, and saved matching preferences. The database sets a referral's `referral_counted_at` once this gate passes. It is sticky: editing a profile later does not take away earned credit. Referral attribution is still captured at waitlist signup, deduped by canonical email, and can qualify after the app launches. Existing waitlist entries are backfilled only if they already have a matching-ready app profile.

Invitees do not need an email-confirmation link. A newly added waitlist member receives a welcome message through the existing optional mail worker; lack of email delivery does not block the signup or referral attribution. The referrer's own email-verification flow for retrieving their referral link remains separate and is not the referred friend's qualifying event.

### 2. Waitlist success state and welcome email

The website's “You’re in” state is now a complete message on its own. It no longer claims that a note is on its way to the inbox. The first-10,000 and later-joiner messages are both localized. Email is an optional follow-up, not a condition of success.

The welcome email currently sent by the mail worker reads:

**Subject:** You’re on the Halal Mode waitlist

> Thanks for joining Halal Mode. Your place is saved—there’s nothing else you need to do.
>
> *(Shown only to eligible first 10,000 members)* You’re one of the first 10,000, so 1 month of Premium is reserved for you, free, at launch.
>
> We’re opening city by city. We’ll be in touch when Halal Mode is ready in your city.
>
> If a friend invited you, they’ll receive referral credit only after you complete your profile in the app. Joining the waitlist or receiving this email does not count by itself.
>
> Halal Mode

There is no confirmation button or token in this invitee welcome email. The Arabic version communicates the same rule.

### 3. Private matching signal estimator

This is an internal, confidence-aware matching signal—not a public rating, a measure of human worth, or an eligibility gate. Members do not receive its score, components, weights, switches, or a choice about local timers. The normal matching preferences and eligibility rules still apply, and the separate exposure rotation remains in place.

The estimator combines server-owned selection/rank/mutual outcomes with bounded, coarse attention observations for the profile, bio, and currently displayed photos. Client timers remain in memory until normal round submission; durations are rounded to five seconds and capped at 120 seconds. The server checks configuration and consent, validates the round and current photo, and ignores disabled metrics. Selection and mutuality evidence is derived from server records, not client claims. Scores are bounded, new/low-evidence members are blended toward neutral, and the pair-level similarity preference is soft and capped.

Metric switches and weights live in the private database. Luna photo-presentation analysis is off by default and uses the existing moderation worker/API only when an authorized operator enables it; it is limited to clarity, lighting, framing, and background distraction, not attractiveness or personal suitability. Keep it off unless separately reviewed and deliberately enabled, since image analysis can incur API cost and introduce bias.

The detailed implementation and security review checklist are in [`PRIVATE_MATCHING_SIGNAL_ESTIMATOR_CLAUDE_HANDOFF.md`](PRIVATE_MATCHING_SIGNAL_ESTIMATOR_CLAUDE_HANDOFF.md). Pay particular attention to consent withdrawal, photo replacement/deletion, service-role-only access, disabled-metric storage, the fairness rotation, and Luna queue shutdown behavior.

### 4. Legal notice and wordmark

The app privacy notice now explains the approximate attention observations, the private estimate, the limited optional photo-presentation analysis, their use, and retention. The legal document version was advanced to `2026-10-21` so members are asked to review the changed notice.

The trademark mark beside the Halal Mode wordmark was increased slightly on the homepage and referral page (9px to 10px), added to the how-it-works page at the same size, and increased on the app auth screen (10px to 11px; compact 8px to 9px).

## Admin dashboard recommendation

### Recommendation: use `https://halalmo.de/admin`, but do not treat the URL as protection

This keeps the first version on the existing domain and hosting, with no new service or recurring vendor cost. A subdomain such as `admin.halalmo.de` can be introduced later if the deployment setup makes separation materially easier; it is not a security boundary either way. A hidden path, client-side check, or an unlinked page will not prevent access.

The dashboard is a later, separate build. There is **no dashboard in this implementation**. Until it exists, metric controls remain backend/operator-only.

### First version: configuration only, useful at launch

Start with one small authenticated “Matching signals” screen:

- A row per signal with enabled state, weight, plain-language purpose, and whether it affects an individual estimate or only pair similarity.
- Luna clearly marked **off by default**, with its cost and narrow scope; any backfill must be a separate, bounded action with an explicit confirmation.
- Save changes atomically, show who changed what and when, and retain an audit trail plus the previous configuration for rollback.
- Show the effective configuration/version and safe operational health (last successful matching run, pending/failed Luna jobs, recent config changes). Initially prefer aggregate score/confidence distributions over a member-by-member “desirability” leaderboard.
- Make configuration changes reversible, validated on the server, and safe when all metrics are disabled or weights are zero.

### Security and low-cost implementation

- Reuse the existing domain, Supabase Auth, database, and Edge Functions; do not add an admin SaaS or put a service-role key in browser code.
- Require server-verified admin authorization for every read and write, preferably an explicit allowlist/role with MFA for administrators. Hiding the route is not authorization.
- Keep private tables inaccessible to normal app roles. Expose only narrow admin operations through a server-checked endpoint or tightly scoped database functions; validate every value server-side.
- Record an append-only audit event for every change. Add role separation (owner/editor/read-only) only when a real operational need appears; do not build a broad CMS now.
- Begin with read-only status plus the few global switches and weights. Add modules only when needed: waitlist/email delivery health, referral operations, feature flags, and matching health can each become separate pages backed by their own permissions and audit events.

This is not a substitute for protecting the scoring pipeline. The matching worker must continue to enforce the same private configuration and authorization even if the dashboard is unavailable or compromised.

## Files / database changes to review

- `supabase/migrations/20261021120716_referral_requires_completed_profile.sql` — sticky completed-profile qualifier, safe backfill, revised progress calculation, and welcome-without-confirmation behavior.
- `supabase/migrations/20261021102527_private_matching_signal_estimator.sql` — private signal config, bounded observations, estimator, backend controls, and Luna queue.
- `supabase/functions/send-mail/index.ts`, `site/i18n.js`, `site/index.html`, `site/refer.html`, app translation catalogs — welcome, success, and referral copy.
- `src/data/legalDocuments.ts` — app privacy notice and version.
- `src/lib/matchingEngagement.ts`, round/profile/gallery integration, and matching workers — bounded observation collection and use.
- `supabase/tests/database/0195_my_referral_progress.test.sql`, `0198_fair_waitlist_and_launch_premium.test.sql`, `0199_private_matching_signals.test.sql`; `tests/marketingContent.test.ts`, `tests/matchingEngagement.test.ts`, `tests/matchingEstimate.test.ts`.

## Verification and release status

- Client verification has passed locally after this handoff document was added: typecheck, lint, SQL parsing, and JavaScript tests (442/442).
- SQL parsing is not the same as running pgTAP. The pgTAP suite was not run locally because Docker is unavailable; CI must run it before merge.
- No production migration, function deployment, secret change, website deployment, or EAS build/update has been performed.
- This document is a review handoff, not approval to deploy. Review findings should be grouped as **must fix before merge**, **safe with monitoring**, and **defer**, with concrete file/function evidence.

## Ask Claude to check

1. Does referral credit become exactly one-time and only after a referred waitlist email maps to an app account that passes the existing matching-readiness gate? Are all legacy referral paths and duplicate emails handled?
2. Does the new waitlist welcome flow avoid making email delivery or confirmation a prerequisite, without breaking the referrer's own link retrieval?
3. Can any member-facing API, view, error, or client bundle reveal the estimator or its controls? Can a client forge another person's selection, ranking, timing, or photo observation?
4. Do disabled signals stop collection/storage/processing, including queued Luna work? Can low scores affect access, stated preferences, or the independent exposure rotation?
5. Are the privacy wording, retention, consent versioning, deletion behavior, and measurement costs accurate to the implementation?
6. Is the minimal `/admin` plan safe with server-side authorization and no service key in the browser? Identify the smallest change needed if not.

Do not deploy or broaden this into a monetization dashboard as part of the review.
