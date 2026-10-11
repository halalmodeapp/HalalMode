# Halal Mode quality gates

This document describes evidence required for a release candidate. It does not claim a gate passed merely because the code exists.

## Automated now

| Gate | Command | Current scope |
| --- | --- | --- |
| Type safety | `npm run typecheck` | Strict TypeScript across the app source. |
| Lint | `npm run lint` | Expo and React Native static checks. |
| Unit invariants | `npm test` | Daily-round rules, carousel geometry, compatibility privacy, memberships, launch foundations, and question locale fallback. |
| Client bundle | `npm run export:android` | Android JavaScript bundle/export on Linux CI. |
| Combined client gate | `npm run verify:client` | Typecheck, lint, then unit invariants. |
| Database contracts | `npm run db:test` | Replays every migration into a throwaway Postgres 17, then runs the pgTAP contracts. No Docker. |

The GitHub workflow at `.github/workflows/quality.yml` runs the client gate,
Android export, and the isolated database contract job on pull requests and
pushes to `main` or `codex/**` branches. The database job runs the same
`npm run db:test` as a developer machine and has no linked-project or
production credential step.

## Database contract gate: required before production database changes

```bash
npm run db:test                 # every contract
npm run db:test -- 0190 0047    # only files whose names contain these
npm run db:test -- --verbose    # also print Postgres' own log
```

The harness in `supabase/tests/harness/` needs only Node and `npm ci`; it runs
the same way on Windows, macOS, Linux and CI, and takes about 20 seconds:

1. Starts a throwaway Postgres 17 from the `embedded-postgres` npm package in a
   temporary directory, on a free port.
2. Lays down what a fresh Supabase database provides (`baseline.sql`): the
   `anon`, `authenticated` and `service_role` roles, the `extensions`, `auth`
   and `storage` schemas with `auth.uid()`/`auth.jwt()` reading
   `request.jwt.claims` as PostgREST sets it, Supabase's default grants, and the
   realtime publication. `pg_cron`, `pg_net` and `supabase_vault` are small
   stand-in extensions (`extensions/`) that record jobs, requests and secrets
   without running or sending anything.
3. Replays `supabase/migrations` in filename order, one file per transaction,
   exactly as `supabase db reset` does. A failure names the file, line and
   Postgres error.
4. Runs each `supabase/tests/database/*.test.sql` in its own session. `tap.sql`
   implements the part of pgTAP the contracts use, with pgTAP's names and
   output, so the files still run unchanged under `supabase test db`.

The harness never connects to a Supabase project. Do not point tests at the
linked project. When a migration needs something new from Supabase's platform
(another `auth` column, a storage helper, another extension), add it to
`baseline.sql` or `extensions/` with Supabase's own definition; when a test
needs more of pgTAP, add it to `tap.sql` with pgTAP's semantics.

`npm run verify:sql` still parses every migration and test with Postgres'
grammar, which is quicker but proves nothing semantic.

## Native device matrix

Run Expo Go for JavaScript-only changes and a development build whenever native modules, permissions, app configuration, media, notifications, or deep links change.

| Surface | Compact Android | Tall Android | iPhone small | iPhone large |
| --- | --- | --- | --- | --- |
| Sign in, deep link, validation | [ ] | [ ] | [ ] | [ ] |
| Onboarding, keyboard, resume | [ ] | [ ] | [ ] | [ ] |
| Daily deck slow/fast swipes | [ ] | [ ] | [ ] | [ ] |
| Interest, release, and retry | [ ] | [ ] | [ ] | [ ] |
| Profile, photo, and voice-introduction media | [ ] | [ ] | [ ] | [ ] |
| Questions, answers, and recap | [ ] | [ ] | [ ] | [ ] |
| Chat, reconnect, read receipt, close | [ ] | [ ] | [ ] | [ ] |
| Settings, privacy, block/report, deletion | [ ] | [ ] | [ ] | [ ] |

Repeat each relevant path in English and Arabic after a cold restart, at 200% font scale, with a screen reader and Reduce Motion enabled, in airplane mode and on slow network, and with an expired session. Check gesture navigation, display cutouts, keyboard resizing, and bottom safe area.

## Current release debt

- Expo 57 / React Native 0.86 removed the previous high-severity dependency
  advisories. `npm audit --omit=dev` still has 11 moderate Expo-tooling
  advisories with no compatible automated fix; see `docs/DEPENDENCY_SECURITY.md`.
- Stable `testID`s and source-controlled Maestro smoke contracts exist for authentication, daily introductions, recap, and chat; they have not yet run against a configured native build with controlled test accounts.
- The pgTAP contracts run locally and in CI with `npm run db:test`; no Docker
  runtime is needed.
- The Android/iOS matrix remains incomplete; a stale emulator bundle is not release evidence.
- The gallery still needs memory/error-state measurement. The daily deck keeps full-size images mounted to avoid card handoff flashes.
- Chat has cursor paging, direct cache insertion, DELETE-event safety, and a durable text outbox; pgTAP and native reconnect testing remain required before treating it as production proven.
- Calling and in-chat voice-note sending are not production features. Profile voice introductions use private storage and must be tested against real permissions and signed-URL expiry.
- Subscription purchase, entitlement verification, restore, cancellation, and localized pricing are not implemented. A mock membership preview cannot be marketed as Halal Mode Premium.
- Account deletion requests immediately pause a profile and close connections. The service-only finalizer is coded but must not be deployed or scheduled before retention/support approval and worker-secret configuration.
- Blocked-member management, notification-consent registration, and profile-readiness guidance have server contracts and passing isolated pgTAP coverage, but still require native-device validation.
