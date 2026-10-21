# Halal Mode launch audit — refreshed 21 October 2026

This is the current status for `feature/halal-cards`. It replaces the earlier 20 October audit's stale counts and status claims. The work described here is still local until committed, pushed, reviewed by CI and—where needed—approved and deployed. No production database, function, website or Expo update was changed during this audit.

## Current verdict

The requested code work is in place and the client verification passes. The remaining launch gates are operational: the new database migration and mail worker have not been deployed, production email quotas and Supabase Auth limits still need the owner's dashboard checks, and Apple sign-in still needs the owner's Apple credentials. The waitlist has deliberately been left without a rate limit or email-confirmation gate, as requested; that keeps shared Wi-Fi from blocking real groups but leaves spam/queue exhaustion as an accepted risk.

| Area | Current status | What remains |
|---|---|---|
| Production app configuration | **Fixed in code** | Public project URL/key and analytics defaults are bundled by design, with environment overrides. No EAS build or update has been published. |
| Waitlist scope | **Matches the decision** | The static site is the only waitlist. App `/join` was removed; app routes stay out of the waitlist. The new migration and waitlist-only web rules still need deployment. |
| Waitlist throttling | **Intentionally none** | The migration removes the hourly and network caps. There is a one-million-row ceiling, not an anti-abuse limit. This is the owner's chosen trade-off; see load risks below. |
| Waitlist email | **Code ready; quota/deploy pending** | Resend remains the fallback. The worker uses SES only when AWS reports production access and sending enabled, then honors AWS's actual daily and per-second quotas. Current database default is 100 emails per day, with 10 reserved for operational mail. |
| Premium launch rewards | **Migration written; not live** | CI must pass pgTAP, then the owner must approve applying the migration. |
| Email canonicalization and referral credit | **Migration written; not live** | Alias matching and app-member referral credit are covered by the new database tests; production behavior remains unchanged until migration deployment. |
| iOS provider display | **Fixed in code** | Apple is always shown on iOS; the owner must still configure Apple in Supabase Auth before App Store submission. Android and web show Google only. |
| Email sign-in 429 | **Fixed in code** | The screen explains the limit and offers a direct Google sign-in action. Supabase SMTP and Auth limits remain owner-side checks. |
| Privacy and Terms | **Fixed in code** | App, database registry and website derive from one legal-document source. Website deployment is pending. |
| Profile completion checklist | **Fixed in code** | Every incomplete checklist item now scrolls to its first missing field; Preferences opens the correct tab. |
| Web onboarding city | **Fixed in code** | GPS is matched locally against 34,174 GeoNames cities within 50 km. The 1.2 MB dataset is a separate, lazy web chunk; no third-party lookup is used. |
| Post-launch referral routing | **Plan ready; launch switch intentionally off** | Existing `halalmo.de/?ref=CODE` links remain unchanged. The homepage must not route to the app or stores until launch approval. Android Install Referrer and verified app links are documented as later build work. |
| Native release / APK | **Not rebuilt in this task** | No Android or iOS binary/update was produced or installed for this audit. |

## Load scenarios and user impact

The database records waitlist joins independently of email delivery. The current `mail_settings.daily_limit` default is 100 messages per rolling day; the worker reserves 10 for reports and other operational mail, leaving up to 90 for waitlist traffic while Resend is active. Email delivery is therefore the bottleneck, not waitlist admission.

| Scenario | Waitlist result | Email result and user impact |
|---|---|---|
| **Best case: 500 joins in an hour, SES approved and configured** | All 500 can join; there is no per-hour or per-network block. | The worker's maximum is about 12,000 messages/hour, in batches capped at 200 per minute, but actual delivery is limited by AWS's granted send rate and 24-hour quota. If those quotas support it, the welcome backlog clears in minutes. |
| **500 joins in an hour, current Resend budget** | All 500 are recorded. | Up to 90 waitlist messages/day; roughly 410 wait for later daily capacity, so the last could take about six days. Referred members need the email confirmation before their referral counts. |
| **10,000 joins in an hour, SES approved with adequate quota** | All 10,000 can join. | At the worker's upper bound, the queue could clear in about 50 minutes, provided AWS grants at least that daily quota and send rate. AWS may grant less; use the actual SES account quota, not a presumed 50,000/day. |
| **10,000 joins in an hour, current Resend budget** | All 10,000 are recorded. | At 90 waitlist messages/day, clearing the ordinary welcome queue could take about 111 days. This is not acceptable for a public launch announcement; SES approval or a separately approved paid email plan should precede a large announcement. |
| **Worst case: scripted or junk submissions** | No network or hourly limit stops them. Email plausibility checks and a one-million-row ceiling are not bot protection. Joins take a shared database lock, and no production load test has established its saturation point. | Junk rows can occupy queue capacity, consume the mail budget, delay real people and eventually use the ceiling. No Turnstile/CAPTCHA is installed. This risk is knowingly accepted with the no-throttling decision. |

These estimates assume one welcome message per new join, a 24-hour mail budget, and no unusually high operational mail. They are not a load test or a guarantee of SES approval or throughput.

## Findings by severity and status

### Critical / launch gates

- **C1 — Store builds without backend config: fixed in code.** `src/lib/publicConfig.ts` supplies only public Supabase/PostHog values as safe defaults and still allows local/EAS overrides. These are intentionally public client values, not secrets. No EAS build/update was run here.
- **C2 — Email capacity: code prepared; owner decision still required before a large announcement.** SES fallback checks `ProductionAccessEnabled` and `SendingEnabled` and uses the live quota. Until SES is approved and the worker is deployed with its required secrets, the current database budget is 100/day (10 reserved). Do not promise fast delivery at 500–10,000 joins/hour based on the source code alone.
- **C3 — Promised launch Premium: migration implemented, production pending.** The migration grants rewards when the profile is ready and lets rewards grow with referral tiers. It is not effective until approved and applied.
- **C4 — Apple sign-in: app behavior fixed, Apple setup pending.** The iOS screen always offers Apple. The owner's Apple Developer credentials and Supabase Auth configuration are still required before review.
- **C5 — App email limits: recovery fixed, dashboard status unknown.** HTTP 429 now offers Google sign-in. Check Supabase Auth custom SMTP, per-hour email limit and sign-in/IP limits in the dashboard before launch.

### High

- **H1 — No waitlist rate limit: intentional, accepted risk.** The previous 10,000/hour and five-per-network limits are removed to avoid blocking real groups behind shared Wi-Fi or carrier NAT. No replacement CAPTCHA has been added.
- **H2 — Gmail alias referral farming: migration implemented, production pending.** Canonical email is lower-cased, plus tags are removed, Gmail dots are ignored and `googlemail.com` is normalized to `gmail.com`.
- **H3 — App-owned referral codes on the waitlist: migration implemented, production pending.** Confirmed joins can credit an app member's code and are counted once across the waitlist and app by canonical inbox.
- **H4 — Legal links and single source: fixed in code, website deploy pending.** The static site and app use the shared legal URLs and include the GeoNames attribution where relevant.
- **H5 — Spam can delay genuine mail: accepted consequence of H1.** The 100/day default and queued delivery amplify the impact of junk joins while Resend is active. Deploy SES only after AWS production access is granted; monitor the queue and bounce/complaint rates after launch.
- **H6 — Preview OTA behavior: unchanged operational risk.** The `codex/premium-foundation` branch is the current default and its Expo workflow can publish preview updates. Keep this work on `feature/halal-cards` until CI is green and a deliberate release merge is approved; do not treat a feature-branch push as a production deployment.

### Medium / low

- **Profile checklist navigation: fixed in code.** Every incomplete step navigates to its first missing field; Preferences opens the Preferences tab.
- **Referral verification link reuse: fixed in the migration.** A referrer's still-valid link is reused rather than invalidating links in older emails.
- **Match-screen stage copy: fixed in code.** The “choose three questions” instruction is shown only at the appropriate stage.
- **Android permissions: fixed in app config.** Unneeded fine-location and foreground-media permissions are blocked; device-level onboarding was not retested in this turn.
- **Web onboarding dead end: fixed in code, web export verified.** The nearest GeoNames city is resolved from browser GPS locally; a GPS position farther than 50 km from a listed city still returns no city rather than inventing one.
- **Verified app links and deferred install attribution: open by design.** The typed-code fallback remains. App Links / Universal Links need the release SHA-256 and Apple Team ID; Android Play Install Referrer is a separate post-launch native module, documented in `docs/POST_LAUNCH_REFERRALS.md` but not implemented or enabled.
- **Other older observations:** the earlier audit's match-reveal timing and SES duplicate-send behavior were not independently re-tested in this continuation. Do not mark them fixed from this work.

## Verification evidence

- `npm run verify:client`: **passed** — typecheck, lint with zero warnings, SQL parse check (209 migrations, 57 database tests, 78 PL/pgSQL bodies, zero issues), and **435/435 unit tests**.
- `npx expo export --platform web`: **passed**. The export produced a separate `geonames-cities15000` chunk at about 1.2 MB, rather than adding the dataset to the initial app bundle. Exported 31 static routes. This is a local build, not a website deployment.
- GeoNames attribution and CC BY 4.0 notice are included in `site/licenses/geonames.html` and linked from the generated Privacy page. Dataset source: [GeoNames export](https://www.geonames.org/export/).
- pgTAP for 0192, 0196 and 0198 has **not** run locally because Docker is unavailable. It must pass in GitHub Actions after push; assertions must not be weakened to get a green result.
- No production signup, email delivery, database migration, function deployment, static-site deploy, EAS build or OTA update was performed.

## Owner-side launch actions

1. Review the commit and CI result. Approve the production migration and `send-mail` deployment separately before either is run.
2. Confirm AWS SES production access, sending status, region, daily quota and send rate. If SES is not approved, decide whether the current Resend cap is acceptable or approve a paid plan; do not silently raise the production mail budget.
3. Check Supabase Auth's custom SMTP and email/IP rate limits. The Google recovery action helps with email 429s but does not raise Auth capacity.
4. Configure Sign in with Apple in Supabase Auth before iOS review.
5. Supply the Android release-signing SHA-256 fingerprint and Apple Team ID before enabling verified app links.
6. Only after launch approval, change homepage routing. Keep `halalmo.de/?ref=CODE` stable; the homepage and eventual Install Referrer should preserve the code.

## Branch / commit plan

Keep `feature/halal-cards` as the working branch while its focused commits and database tests are reviewed. Once CI is green and the release contents are agreed, promote the verified result to the current default/release branch in one reviewed merge. The default branch also triggers the Expo preview workflow, so merge/push there is a release action—not merely a way to tidy the branch list. The existing Halal Cards copy commit remains separate from these launch-fix commits.
