# Dependency security status

Last assessed: 2026-10-23.

`npm audit --omit=dev` reports **20 high, 0 critical, and 6 moderate**
advisories. All of them sit in Expo and React Native build tooling (`@expo/cli`,
`@expo/metro`, `metro`, `@expo/code-signing-certificates` via `node-forge`,
`braces`), not in code that ships inside the app. They are new advisories
against the Expo 57 tree: the 2026-07-29 assessment, right after the Expo 57 /
React Native 0.86 upgrade, found 0 high.

Expo SDK 58 is available; 39 direct dependencies are a major version behind,
most of them the Expo 57 → 58 family. The audit database still suggests
incompatible historical Expo versions as the remedy, so `npm audit fix --force`
remains unsafe. The fix is the SDK 58 upgrade (`npx expo install expo@^58 --fix`
and its release notes), done on its own branch and followed by the device pass
below.

Before a public release, complete a fresh development build on the SDK you ship
and the full Android/iOS device matrix: Arabic cold restart, auth, media,
notifications, and deep-link smoke tests. Do not silence the audit result in
CI.
