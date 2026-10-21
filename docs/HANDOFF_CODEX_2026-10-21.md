# Handover to Codex, 21 October 2026

Claude ran out of usage mid-task. At the start of the Codex continuation, `feature/halal-cards` was at `620d1ca`; the owner's Halal Cards copy commit was already present. Keep any later copy edits in a separate commit. The launch-fix work described below was in the working tree. The audit's original status table was stale and has since been refreshed in `docs/LAUNCH_AUDIT_2026-10-21.md`.

## Owner's decisions (follow these)
- **Waitlist: no throttling and no confirm step.** Everyone joins instantly from any network. Rate limits apply only to app *sign-ups* (Supabase Auth), which is a separate matter.
- **Apple sign-in:** always shown on iOS (Apple first, then Google); Android and web show Google only. Don't hide it based on Supabase settings.
- **Terms and Privacy:** a single source, `src/data/legalDocuments.ts`.
- **Mail:** move to Amazon SES once AWS approves production access (support case 179250180300129).

## What was changed

**App**
- `src/lib/publicConfig.ts` (new): live Supabase URL, publishable key and PostHog key built in as defaults. `EXPO_PUBLIC_*` values override them. This fixes store builds and OTA updates crashing on launch, because both EAS environments are empty. `src/lib/supabase.ts`, `src/lib/posthog.ts` and `src/hooks/usePrivateMedia.ts` now use it.
- `src/lib/signInProviders.ts` (new): providers by platform. `app/auth.tsx` uses it, and `fetchEnabledProviders` is removed from `src/api/auth.ts`.
- `src/components/brand/SiteFooter.tsx`: adds Privacy and Terms links. `src/lib/publicLinks.ts`: `PRIVACY_URL` and `TERMS_URL` are derived from the legal documents.
- `src/data/legalDocuments.ts`: adds `LEGAL_SITE`, `legalPath()` and a `url` on each document. `src/lib/legalDocuments.ts`: the fallbacks are now derived from it; they were stale (version 2026-07-29, and a URL that showed the homepage).

**Website**
- `site/site-footer.js`: adds `/legal/privacy` and `/legal/terms`. `site/i18n.js`: adds `navTerms` and `navPrivacy` in all 16 languages, worded exactly as the app's `onboarding.termsLink` / `privacyLink`. The cache-busting `?v=` on both scripts is bumped to `20261021a` in all three HTML pages.
- `scripts/legal-pages.mjs`: the canonical URL and cross-link come from `doc.url`.

**Database**: `supabase/migrations/20261021090000_fair_waitlist_and_launch_premium.sql`
1. `canonical_email()` lower-cases, strips `+tag`, and strips dots for Gmail (googlemail.com counts as gmail.com). It's stored in the generated column `waitlist.email_canonical`. Joins, referral links, `member_referral_code` and `claim_referral_code` all match by inbox, which stops alias referral farming.
2. No waitlist throttling. The hourly cap and the per-network limit are removed; `waitlist_intake_sources` and `request_source_hash()` are dropped. Only a 1,000,000 total ceiling remains.
3. App-member referral codes now credit on the waitlist through `waitlist.referred_code` and the new table `waitlist_code_referrals`. `waitlist_confirm` and `referral_progress` are restated.
4. `claim_mail_service(p_limit, p_daily_limit)`: the old 1-argument version is dropped. `p_daily_limit` (SES quota) overrides `mail_settings.daily_limit`, and the batch limit is up to 200.
5. Launch Premium: `launch_reward_months()` and `grant_launch_reward()` (adds only the difference, stacks on a running reward, never overrides a tester or paid entitlement), `expire_launch_rewards()`, and `apply_launch_rewards()`. A cron job, `halal-mode-launch-rewards`, runs every 10 minutes and grants only once the member's profile is ready for matching.
6. The current `legal_document_registry` rows' URLs become `https://halalmo.de/legal/{type}`. The version is unchanged, so nobody has to re-accept.

**Mail worker** (`supabase/functions/send-mail/index.ts`): uses SES only when its `GetAccount` call reports `ProductionAccessEnabled` and `SendingEnabled`, at the quota and rate AWS granted. Otherwise it falls back to Resend. So `SES_REGION=eu-north-1` can be set now and the switch happens by itself on approval. Each run stops after about 50 s and hands unsent rows back without using an attempt. The response includes the provider used.

**Tests**
- `tests/launchConfig.test.ts` (new).
- `tests/legalDocuments.test.ts`: rewritten as single-source guards covering the database version and URL, the site links and the fallbacks.
- `tests/marketingContent.test.ts`: footer words checked for parity.
- `tests/webRedirects.test.mjs`: updated.
- pgTAP `0196`: updated to "no network limit", plan 12.
- pgTAP `0198_fair_waitlist_and_launch_premium.test.sql` (new): plan 17.

## State of checks at the Claude handoff (historical)
- Typecheck and lint pass. `verify:sql`: 209 migrations, 0 problems.
- Unit tests at handoff: **431 of 431 pass** (`tests/signIn.test.ts` checks for `signInProviders(Platform.OS)`). The continuation added tests; see the current status at the end of this file.
- **pgTAP was not run.** There's no Docker here; it runs in CI with `supabase db reset --local && supabase test db`. Push and read CI.
- `deno check` on `send-mail` failed only on import resolution (`npm:aws4fetch` with no deno.json). That isn't a code error, but it's still unverified.

## Next steps at the Claude handoff (superseded by the continuation status below)
1. Run `npm run verify:client` (typecheck, lint, SQL and unit tests all passed separately), then commit. Leave the owner's Halal Cards edits out unless they ask.
2. Push, get CI green (pgTAP), and fix anything in `0196` or `0198`.
3. **Ask the owner before deploying.** Then: `npx supabase db push`, `npx supabase functions deploy send-mail`, and optionally `npx supabase secrets set --project-ref lfuuywsmydruvqkqwvzw SES_REGION=eu-north-1` (safe now because of the production-access check). After AWS approves, run `update halal_mode_private.mail_settings set daily_limit = null;` if SES quota should be the only limit. Redeploy the site with `npm run deploy:web`.
4. Owner-side: configure Apple in Supabase Auth (Services ID and key) before iOS review. Check that Auth custom SMTP and the email rate limit are set; that's the app sign-up throttle, separate from the waitlist.
5. Optional, step-free bot defence for the waitlist: invisible Cloudflare Turnstile.
6. Update `docs/LAUNCH_AUDIT_2026-10-21.md`. Fixed by this work: C1 (config), C3 (Premium grant), C4 (Apple shown on iOS), H1 (network limit), H2 (aliases), H3 (app-member credit), H4 (Privacy and Terms links). Still open: C2 (mail volume until SES is approved), C5 (Auth email), and the medium and low items.

## Smaller items (status 21 Oct)
1. Profile checklist: make every unticked step tappable and scroll to its field (`src/components/you/ProfileTab.tsx:746` only allows `preferences`).
2. ~~Referral links~~ **Done 21 Oct**: `waitlist_confirm` (in `20261021090000`) reuses the referrer's link while it has more than a day left, so earlier emails keep working.
3. `?ref=` links into the native app: **open, needs the owner.** Add Android `intentFilters` (autoVerify, host halalmo.de, path `/`) and iOS `associatedDomains` (`applinks:halalmo.de`) in `app.json`, and host `site/.well-known/assetlinks.json` (needs the release signing SHA-256 from EAS credentials) and `apple-app-site-association` (needs the Apple Team ID). Until then, referred friends type the code at sign-up.
4. ~~Match screen copy~~ **Done 21 Oct**: `app/match/[id].tsx` shows the 'choose three questions' line only when the stage is `choosing_questions`.
5. ~~Android permissions~~ **Done 21 Oct**: `app.json` drops `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and lists them in `blockedPermissions` so plugins can't re-add them. Check on a device that onboarding location still works on coarse (Balanced accuracy).
6. ~~Dead code~~ **Done in the launch-fix work**: migration `20261021090000` drops the retired `public.request_waitlist_verification`, and pgTAP `0192` and `0196` assert it is gone. `app/join.tsx` and `src/api/waitlist.ts` are removed because the owner decided the waitlist lives only on the static homepage. The 4-argument `join_waitlist` wrapper remains for compatibility.
7. ~~`dist/` folder~~ **Done 21 Oct**: deleted on the owner's instruction (1.2 GB of old APKs and exports, untracked and git-ignored).
8. ~~Stale docs~~ **Done 21 Oct**: README version line, the HANDOFF.md waitlist note, and the `src/data/cities.ts` location comment.

Owner only: set up Sign in with Apple in Supabase Auth (Apple Developer Services ID, Key ID, Team ID and .p8 key). It needs the owner's Apple account and keys, so neither assistant can do it.

## Recommendations: app sign-up and other limits
The waitlist has **no throttling** (owner's decision). Limits now matter only for **app sign-ups**, which go through Supabase Auth:

| Limit | Today | Recommendation |
|---|---|---|
| Same email asking for another link | Every 60 s (`supabase/config.toml`) | Keep it. |
| Sign-in emails per hour, whole project | Supabase default: a few an hour on the built-in sender, 30 an hour with custom SMTP. Unverified, check the dashboard. | **Set custom SMTP to Amazon SES** (eu-north-1, `ses.halalmo.de` already verified) once AWS approves production access; Resend SMTP until then. Then raise Dashboard → Auth → Rate Limits → emails per hour to about 1,000+ (SES allows thousands). |
| Sign-ups/sign-ins per IP | Supabase default, about 30 per 5 minutes | Raise it for launch (campus and mosque Wi-Fi share one address), e.g. 300 per 5 minutes. |
| Google / Apple sign-in | No email involved | Make these the main path at launch: Google on Android, Apple and Google on iOS. Apple still needs the owner's setup in Supabase. |
| Waitlist and referral email (outbox) | 100 a day on Resend's free plan (`mail_settings.daily_limit`) | **Switch to SES**: set `SES_REGION=eu-north-1`. The worker switches itself only once AWS grants production access, then uses SES's real quota (typically 50,000 a day, about 12,000 an hour through the worker). Until then, Resend Pro ($20/month, 50,000 a month) with `daily_limit = null` if volume arrives first. |
| App error on an email rate limit | Generic "couldn't send" (`app/auth-email.tsx:81`) | Small fix: on 429, say "Lots of people are signing in, use Continue with Google" instead. |

**Why SES:** about $0.10 per 1,000 emails, high daily quotas, the domain is already verified, and the worker code is ready. One provider for both Auth email (SMTP) and outbox email keeps a single sending reputation.

## Owner's product model (decided 21 Oct, build to this)
1. **halalmo.de** is the waitlist (the static `site/`) until launch. After launch it becomes either the web app's sign-in or links to the App Store and Google Play.
2. **halalmo.de/app** may later be the web app, built from this same codebase (`npx expo export --platform web`, via React Native for Web).
3. **Neither the mobile app nor the future web app takes waitlist signups.** Someone who has the app means the app has launched.
4. **Referral links** land on the waitlist today. After launch they must open the app and keep the referral code.

### Readiness and what to do
- **Web app at `/app`: mostly ready.** `npm run deploy:web` has app and preview modes that publish the Expo web export under `/app`; the default is waitlist-only, which redirects `/app/*` home. Sign-in already returns to `/app` (`authReturnAddress`). Gap: web onboarding names the city from 198 cities within 150 km (`src/data/cities.ts`), so people farther away can't finish in a browser. Add a web fallback before opening the web app.
- **In-app waitlist removed (done 21 Oct).** `app/join.tsx`, `src/api/waitlist.ts`, the `join.*` strings (16 languages), `testIds.join` and the gate exemption are deleted; `tests/waitlist.test.ts` asserts they stay gone. The old `request_waitlist_verification` RPC is dropped in `20261021090000`. The 4-argument `join_waitlist` wrapper remains (harmless).
- **Web onboarding location.** The browser's GPS already gives coordinates; what's missing is naming the city (browsers have no reverse geocoder), so it uses the nearest of 198 cities within 150 km. Before opening the web app, add a reverse-geocoding call (a small API) or widen the list/radius in `src/lib/deviceLocation.ts`.
- **Referral links after launch: partly ready.**
  1. *One switchable address: done 21 Oct.* `halal_mode_private.referral_settings.link_base` (default `https://halalmo.de/?ref=`) feeds `referral_link(code)`, which `referral_progress` uses, so the app, `/refer` and the emails all follow it. At launch: `update halal_mode_private.referral_settings set link_base = 'https://halalmo.de/app?ref=';` (or wherever the owner decides). Tested in pgTAP `0198`.
  2. *Open the installed app: open, needs the owner's values.* Android `intentFilters` (autoVerify, host halalmo.de) and iOS `associatedDomains` in `app.json`, plus `site/.well-known/assetlinks.json` (release SHA-256 from EAS credentials) and `apple-app-site-association` (Apple Team ID). The app already captures `?ref=` from any link that opens it (`useReferralLinkCapture`) and claims it in onboarding; on the web app, the code carries over through shared browser storage.
  3. *No app installed: open.* The post-launch homepage should store the code (as the waitlist page does) and send people to the web app or the stores. A store install loses the code (no deferred deep link), so keep the typed-code field in onboarding; optionally read the Google Play Install Referrer on Android.

## Decided 21 Oct (later): referral sharing, links after launch, web cities

**Done:** every share message now carries the link **and** the code: "My invite code: HM…" in all 16 languages. The keys are `referrals.shareCode` in the app catalogs and `shareCode` in `site/i18n.js`, used by `app/referrals.tsx` and `site/refer.html`. A store install can lose the link; the code can still be typed in onboarding (`claimReferralCode`).

**Referral links after launch: keep the link the same and let the page decide.** Every link stays `halalmo.de/?ref=CODE`, so links already shared never break. At launch, only the homepage changes. It must:
1. Store the code (same key `halal-mode-referral-code`, as the waitlist page does).
2. Open the installed app through app links. This needs `intentFilters`/`associatedDomains`, `assetlinks.json` and `apple-app-site-association`; see "Smaller items" 3.
3. Otherwise send the visitor to the right store, or to the web app at `/app`, which reads the stored code from shared browser storage.
4. On Android, link to Google Play with `&referrer=ref%3DCODE` and read it with the Play Install Referrer API on first launch, so the code survives the install. iOS has no equivalent: rely on the typed code, optionally plus a "paste your invite code" prompt.

`referral_settings.link_base` stays as a manual override and normally doesn't need touching.

**Web onboarding cities: a bigger list, still GPS-only.** Phones have a built-in coordinates → city service; browsers don't. Bundle GeoNames `cities15000` (34,174 records in the checked extract, CC BY 4.0; attribution is included in the privacy/legal pages) as a static JSON file loaded only on web onboarding. Name the nearest city within 50 km of the browser's GPS reading. Members never type or pick a city, the coordinates stored are their GPS, and no location goes to a third party.

## Codex continuation status — 21 October 2026

- Implemented all four remaining handoff items: every incomplete profile checklist step scrolls to its first missing field; web GPS city naming uses a bundled GeoNames extract; email sign-in HTTP 429 offers Google; and `docs/POST_LAUNCH_REFERRALS.md` records the homepage and Android Play Install Referrer plan without switching routing.
- `npm run verify:client` passed: typecheck, lint, SQL parsing and 435/435 unit tests. `npx expo export --platform web` passed and emitted the GeoNames data as its own ~1.2 MB lazy web chunk.
- The launch-fix work is committed and pushed to `feature/halal-cards`; the Halal Cards copy commit remains separate. No production migration, function, website or Expo update was deployed.
- Owner Halal Cards copy is already isolated in its own commit. The launch fixes, database work, and refreshed audit remain in their own logical commits.

## Post-push CI follow-up — 21 October 2026

- GitHub Actions run [39554067064](https://github.com/halalmodeapp/HalalMode/actions/runs/39554067064): client checks + Android JS export passed; Edge Function typecheck passed.
- Targeted pgTAP files `0192`, `0196` and `0198` passed. `0192` now checks the two-argument budgeted mail-claim function and asserts the old overload is absent. `0198` exercises the trusted server path against the authenticated profile guard; the reward and expiry functions now set the server-controlled profile-update context.
- The full database-contract job is still red on older tests (57 files, 557 tests). The same older failing contracts were present in the preceding run at `620d1ca` (56 files, 538 tests), before this continuation's changes. Keep the branch off the default/release branch until those baseline failures are addressed or intentionally resolved.
- `npm run verify:sql` passes after the pgTAP fixes. Docker is unavailable locally, so pgTAP validation came from GitHub Actions.
