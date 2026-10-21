# Post-launch referral routing

Keep every existing share URL as `https://halalmo.de/?ref=CODE`. Do not change the referral URL stored by the app, database, or email. The homepage decides what to do based on launch state; the waitlist remains the only signup surface until the owner explicitly launches the app.

## Launch switch

When the owner approves app launch, change only the homepage route:

1. Read and validate `ref` with the same `HM` plus eight uppercase alphanumeric characters rule used by the app.
2. Store the first valid code under `halal-mode-referral-code`; do not replace an earlier valid inviter code.
3. If an installed app opens through a verified App Link / Universal Link, the existing `useReferralLinkCapture` hook stores the code and onboarding claims it.
4. Otherwise send Android visitors to Google Play and iOS visitors to the App Store. A visitor choosing the web app goes to `/app`, where browser storage is shared with the homepage and the existing onboarding reads the saved code.
5. Keep the typed invite-code field in onboarding as the recovery path when a store install cannot carry attribution.

Do not route to `/app` or a store before launch. The current static homepage stays waitlist-only.

## Android deferred install attribution

For a Google Play link, pass `referrer=ref%3DCODE` (URL-encoded `ref=CODE`) to the Play Store listing. On the first Android app launch, use Google's Play Install Referrer client library through a small Expo native module/config plugin:

1. Request the referrer once, close the connection, and parse only the `ref` parameter.
2. Validate it with the shared referral-code validator; never accept arbitrary query data as a code.
3. Save it to the existing `halal-mode-referral-code` storage key only when no valid code is already stored. This preserves the first inviter and reuses the current onboarding claim path.
4. Ignore unavailable Play Store responses and keep typed-code onboarding as the fallback. Do not block startup or sign-up on this API.
5. Add focused parser/storage tests and an Android test for first-install, invalid, repeated, and missing-referrer cases.

Google documents the official API at [developer.android.com/google/play/installreferrer](https://developer.android.com/google/play/installreferrer). It requires Google Play Console distribution and native Android code, so this is intentionally a post-launch build item; no dependency, native config, or EAS build is added here.

## App links are a separate owner-input gate

Verified links require the Android release-signing SHA-256 fingerprint and Apple Team ID. Once the owner supplies them, add the `halalmo.de` Android `assetlinks.json`, Apple `apple-app-site-association`, and the corresponding Expo `intentFilters` / `associatedDomains`. Until then, keep the typed-code fallback and do not claim that the links open the installed app.
