# Launch repair register

This register replaces the older checklist, which no longer matched the code.
“Verified” means covered by current source/tests or by the deployed preview, not
that a physical iPhone or Android device was tested. The ARM64 APK is on hold
until Mohammed explicitly confirms.

## Implemented and checked

| # | Result |
|---|---|
| 1 | Email sign-in uses the public auth route and returns through the expected deep link. |
| 2 | Startup/profile requests have deadlines, stale-account guards, and translated recovery UI. |
| 3 | App permission flow uses the native OS prompt/geocoder. Mobile web calls browser geolocation directly from the user tap, which reaches Safari’s prompt without depending on `navigator.permissions`. |
| 4 | Halal Bot summary has bounded waiting, fallback/retry, and the short fake progress bar; redundant “start here” prompts are removed. `connection-summary` is live at version 9. |
| 5 | Message send/history/realtime results merge by message ID and keep read receipts. |
| 6 | Native outbox operations are serialized; browser tabs use Web Locks where supported. |
| 8–10 | Focus lifecycle, delete/sign-out error states, duplicate-action guards, and bounded push cleanup are implemented. |
| 11–15 | Heart/dot drawing, reduced-motion/focus rules, responsive auth text, time-based gyro smoothing, and bounded independent gallery thumbnails/retries are implemented. |
| 16–17 | Private media signing is isolated and bounded. The 10-minute whole-profile renewal workaround is gone; cache freshness is query-scoped, there are no renewal timers, and only authorized media sources can be retried. |
| 18–20 | Connections/Daily use the shared native stretch-scroll wrapper; Fajr refresh and browser geolocation permission handling are lifecycle-aware. |
| 21–23 | Halal Cards covers use an upper-middle focal crop for wide tiles (including all activity covers); the banner/ease-out animation and inactive retry/polling rules are implemented. |
| 24–26 | How-it-works links preserve locale; the activity count is generated from the real catalogue; all 16 locale catalogs are release-tested for missing copy. |
| 28–30 | Entitlements distinguish loading/error/free state; unavailable purchases are not offered; static hosting rules cover every dynamic Expo route. |
| 32–34 | Push registration/tap routing, sanitized diagnostics, and the transparent chrome-heart icon/splash configuration are implemented. |
| 35–36 | Current client gate passes TypeScript, lint, SQL parsing/tests, and client regressions. Backend authorization contracts have source-level and read-only remote review; no schema was changed in this repair batch. |

## Verified in the preview and production

- `/app/auth` at 393 × 852: the layout uses the full mobile width, the new
  Halal Cards paragraph and How it works action are visible, and there are no
  browser console errors. All 10 app fonts now return HTTP 200 as `font/ttf`;
  `document.fonts.check` succeeds for Playfair Display, Noto Sans, and Beiruti.
- `/how-it-works?lang=ar`: four pillars, localized Halal Cards copy, 35
  activities, 16 languages, and RTL direction render correctly.
- The email auth route now renders the same translated Halal Cards title/body
  from the shared catalogue and count, plus its locale-preserving How it works
  link. Source regression tests and the currently deployed JS entry both
  contain the requested copy. The route returns HTTP 200. The browser
  inspector became unresponsive during the final visual capture of this one
  route, so that specific screenshot check is not claimed.
- Mobile Lighthouse on preview: accessibility 100 and best practices 100.
  Production Lighthouse on `/app/auth`: accessibility 100, best practices 100,
  SEO 100. The preview is intentionally blocked from indexing. The experimental
  `llms.txt` suggestion is not a product requirement.
- Production Pages deployment `https://ebf6fc76.halalmode.pages.dev` is live
  behind `https://halalmo.de`. `/`, `/how-it-works`, `/app/auth`,
  `/app/auth-email`, `/robots.txt`, and `/sitemap.xml` return HTTP 200; the
  robots/sitemap content is correct and production pages are not `noindex`.
  Production Expo fonts return `font/ttf`, and all three app font families
  passed browser font checks on the main auth page.
- The first browser audit found that fonts loaded from `node_modules` were
  silently replaced by the landing-page fallback HTML. Cloudflare Pages omits
  `node_modules`; fonts now live in `assets/fonts`, with their OFL notices, and
  a regression test prevents this source-path mistake.
- Final client gate on 2026-10-15: TypeScript passed, ESLint passed with zero
  warnings, 193 migrations / 47 database tests / 77 language SQL bodies parsed,
  and all 389 client tests passed. `npx expo install --check` reports
  dependencies are up to date.
- Android and iOS Expo exports both completed. The Android export includes 11
  TTF assets (10 app font variants plus Expo Material Symbols), totaling
  5,028,240 bytes (4.8 MiB); the iOS Hermes bundle also completed. Neither
  export produced an APK, AAB, or IPA. `preview-arm64` resolves to an APK
  profile and passes `arm64-v8a` through `expo-build-properties`. No physical
  Android device or `adb` is available here for frame-rate, launcher-mask, or
  overscroll acceptance.

## Still needs a deliberate release or evidence we do not have

- **#3 location coverage:** native OS reverse geocoding and Safari’s direct
  permission request are implemented. The browser has no standard reverse
  geocoder, so its no-key fallback uses the curated city list and refuses to
  assign a distant or misleading city. Global remote-area coverage and the
  real iPhone Safari permission flow need acceptance on devices; no external
  geocoding service/key was added.
- **#7 legacy outbox ownership:** ownerless v1 messages are preserved and never
  silently attached to a newly signed-in account. A recovery path cannot be
  made safe until the original account can be established; do not auto-adopt
  these records.
- **#27 translations:** automated completeness, RTL, and rendering checks pass.
  They are not a substitute for a native-speaker terminology/proofreading pass
  in all 16 languages.
- **#32 notifications:** the client creates Android channel `default`; the
  matching `send-notifications` change is staged but intentionally not deployed
  ahead of the native client. Ship the client and function change together.
- **#11–15, #18–20, #21–22, #34–35:** code and automated checks are complete,
  but frame rate, sensor feel, gallery decoding, overscroll, permission prompts,
  large-text layout, image crops, and launcher safe zones still need physical
  Android/iPhone acceptance. No `adb` device is available in this workspace.
- **APK:** no APK was built for this continuation. EAS profile `preview-arm64`
  is configured for `arm64-v8a`; create the final APK only after the remaining
  changes are released and Mohammed confirms.

## Copy discrepancy from the prior pass

The requested Halal Cards pillar was added to source and tests in the earlier
pass, but it was not published to the production Pages project, so the public
link kept serving its older bundle. It is now live on the waitlist, main auth,
and email auth routes, with the fourth How-it-works pillar. The count is read
from the catalogue (currently 35), and the 16-language regression tests pass.
