# Handoff notes

Read [docs/MANIFESTO.md](docs/MANIFESTO.md) first.

> **State as of 2026-10-23.** All 223 migrations in `supabase/migrations`
> (`0001`–`0190`, then dated ones through `20261022120000`) are applied to the
> hosted project `lfuuywsmydruvqkqwvzw` (London), and all nine Edge Functions
> in `supabase/functions` are deployed. `npm run verify:client` passes with 449
> client tests, and CI (including the 65-file pgTAP suite) is green.
>
> Work happens on `feature/halal-cards`, which is ahead of the default branch
> `codex/premium-foundation` and is what production was deployed from. Merge it
> before anyone deploys or branches from the default branch.
>
> Still to do for launch: the App Store link and `inviteFlow` in
> `site/launch.js` (see `docs/POST_LAUNCH_REFERRALS.md`), the SES switch once
> AWS approves, and the device pass in `docs/RELEASE_CHECKLIST.md`. The admin
> panel is described in `docs/ADMIN_PANEL.md`.
>
> The sections below are the August notes, kept for their reasoning; numbers
> in them are from then.

## What is actually proven now (August 2026)

A real journey, walked in a browser against the hosted project rather than
argued from tests:

sign in by magic link -> onboarding -> profile readiness -> a generated round ->
reciprocal introductions -> one-sided interest (which created nothing and was
invisible to the other member) -> mutual interest -> a connection at
`choosing_questions`.

Fourteen test members exist, all built through the app's own RPCs. The privacy
promises held at every step that could be checked, and two server boundaries
correctly refused the test harness mid-run.

## Decisions made

1. **The same-country distance cap applies only where a member marks distance a
   "must have".** The app offers that toggle beside age, height and sect; if the
   radius applied regardless, those controls would do nothing. An unmarked
   radius means "ideally nearby" and the score accounts for it, which also keeps
   a thin pool from producing empty rounds. Missing coordinates still fail
   closed, unconditionally. Recorded in `0092`, with the misleading comment that
   caused a near-miss corrected in the live function.

2. **The waitlist is the static site at halalmo.de** (`site/index.html`,
   calling `join_waitlist_now`). The app is not published on the web; `/app`
   redirects to the homepage. Collects email, city, age range.

## Still open

- **The numbers in `league_config` are estimates,** not findings: the one-day repeat gap, the 7-day wait on a yes, like-meets-like
  strength and table size. Changeable without a deploy, none tested against a real member.
- **The league is on production as of 2026-11-06,** and the legacy generator is gone. Its capacity is proven
  to 1,000 members in a country on the smallest instance. See `docs/FIVE_A_DAY_PLAN.md`. The app and website
  have not been updated to match. `scripts/backend-sim/hosted.mts` tests a throwaway project, and refuses this one.
- **`PHOTO_COACH_MODEL` is unconfirmed.** It defaults to `gpt-6.1-luna` and falls back to `gpt-6-luna`.
  Confirm the model on the OpenAI account before Halal Bot goes live.
- **The privacy notice does not mention leaving answers yet.** Photo advice sits close to the existing
  photo-presentation paragraph. Both need a look before release, as legal documents are versioned.
- **The client-side dwell inference has never run in a browser.** The pass and
  soft-select server paths are covered by pgTAP and by `0085` against the live
  database, but the part that watches how long a profile is read has only unit
  tests.
- **Nothing has been seen on a device.** Web is a means, not a target.

## Working on this project

- **Pushing needs the `HalalModeApp` GitHub account.** `gh` has both it and
  `ArtificialMo` logged in; the latter has no write access and pushes 403. Run
  `gh auth switch --user HalalModeApp` — it does not always survive a new
  session.
- **`EXPO_PUBLIC_USE_MOCKS=0`** — the local app talks to the real project. Set
  it back to `1` for a demo build.
- **Test accounts are all `@halalmodetest.com`** and nothing real ever will be.
  Remove every one of them, and everything hanging off them, with a single call:
  `purge_test_accounts_service('delete every test account')` as service role.
- **Running the app on web**: `npx expo start --web`. Metro is slow here — a
  cold bundle is 30s and a rebuild has been seen to take over three minutes, so
  a page that will not load is usually still compiling. Expo's reverse geocoding
  does not work on web, so onboarding cannot pass its location step in a
  browser; call `complete_onboarding` directly instead.

## The failure mode this codebase actually has

Four times in one sitting, a piece of work was complete and correct read on its
own, and did nothing — or the wrong thing — where it sat. Worth knowing, because
none of it was caught by tests passing or migrations applying cleanly:

- `explicit_pass` was read by four call sites and written by none, for eight
  migrations.
- `expire_explicit_passes()` was defined in a schema PostgREST cannot reach and
  called by nothing.
- The SQL and TypeScript halves of the repeat curve diverged when only one
  gained an exponent; both looked right alone.
- A guard added to stop submissions erasing a pass also blocked the expiry that
  is *supposed* to erase it, so bans became permanent.

Two more were regressions from restatements: `0064` restated `update_my_profile`
and dropped the media guard `0055` exists to protect; `0069` restated
`matching_member_signals()` and re-applied a grant `0054` had deliberately
revoked. **`create or replace` carries the body forward and leaves grants alone
— the risk is in the lines written around it out of habit.**

The defences that now exist for this: a mirror test comparing the stored config
to the code, assertion blocks inside migrations that run against the live
database, and CI. Prefer adding to those over adding a comment.

Read [README.md](README.md), [quality gates](docs/QUALITY_GATES.md), and the
[release checklist](docs/RELEASE_CHECKLIST.md) first. These notes describe the
current source; they are not evidence that every capability has passed native
or production verification.

## Working features

- Mock mode runs the core daily round, profile, mutual match, question, recap,
  and chat flow without a backend.
- Real mode has magic-link auth, route gating, onboarding, profile updates,
  reciprocal introductions, questions, recap, messages/read receipts, blocks,
  reports, account controls, and private profile media boundaries.
- English/Arabic typed catalogs and RTL-aware layouts are in source. Question
  copy now has a central locale fallback; adding a language remains a catalog
  and server-content task rather than a screen-by-screen rewrite. Changing
  native direction intentionally waits for a cold restart.
- Profile voice introductions use `expo-audio` and private storage. Chat voice
  sending and actual calling remain unavailable by design until a provider,
  consent model, abuse controls, and retention policy are approved.
- Migrations through `0095` are applied to the hosted project and the Edge
  Function is deployed. Saying no now has four strengths: not selected this
  round, a deliberate pass (rank penalty plus 30 days), a second pass (further
  rank penalty plus ~90 days), and hiding, which is mutual, permanent and only
  ever chosen explicitly. Soft select is the one positive outcome. Repeat
  allowance (2–5) and cooldown (2–21 days) both scale with the reciprocal
  estimate.

## What is not release-ready

1. The isolated pgTAP CI job runs on every push and is green. This machine has
   no working Docker runtime and deliberately does not need one.
2. Maestro source contracts and stable test IDs cover key paths, but they have
   not run against a configured native build with controlled test accounts.
3. The native matrix, Arabic cold-restart behavior, screen reader behavior, and
   media permissions are incomplete.
4. Chat now uses cursor paging, direct realtime cache updates, and a persistent
   text-message outbox; its database contract and native reconnect behavior are
   still unverified.
5. Purchases/entitlements/restore, real calling, in-chat voice notes, contact
   sharing, photo moderation, and release assets are unfinished.
6. The EAS project ID is a placeholder; do not attempt a production build until
   it is replaced with the real project configuration.

## Non-negotiable privacy boundaries

- Never expose `selection_scores`, including to their owner.
- Never expose one-sided interest or private preferences.
- Keep double-blind answer release inside the database RPC.
- Keep profile/media, connection, message, block, report, and deletion rules
  server-authorized with RLS and RPC checks.
- Never ship the service-role key to Expo, source control, logs, or CI output.

## Safe next steps

1. Run the release checklist for the pending migrations and current client work.
2. Validate native builds on the four-size matrix rather than trusting stale
   emulator content or browser previews.
3. Keep **Halal Mode Premium** consistent in member-facing copy and server-side
   tier values; the local session migration accepts the retired `plus` value
   only to upgrade older installed clients safely.

## Working conventions

- Reuse tokens in `src/theme/tokens.ts`; do not hardcode design values.
- Keep mock and real API branches working together.
- Treat localisation, RTL, accessibility, privacy, and error/recovery states as
  part of the feature, not follow-up polish.
- Record only approved departures from the core concept in `DECISIONS.md`, each
  with a one-sentence rationale.

---

# Matching

The reciprocal pipeline, its four allocators and shadow mode have been replaced by the league. See
[docs/BACKEND_SIMULATION.md](docs/BACKEND_SIMULATION.md) for how it works, what proves it and what does not.
The older matcher documents in `docs/` describe code that has gone.

The league is the only matcher. The `halal-mode-league` cron starts a worker each minute, and
`league_matching` is the switch that stops new rounds being built.
