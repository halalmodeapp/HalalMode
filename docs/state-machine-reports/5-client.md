Client flows: items from `docs/IMPLICIT_STATE_MACHINES_SOL.md`.

- 2 — Fixed: OTP waits have a deadline, email/Google attempts share a synchronous guard, and the existing cooldown survives screen remounts in this process; server rate limits remain authoritative.
- 3 — Left alone: bounded, in-memory PKCE deduplication works as written; a user-visible failure after restart/eviction was not verified, so no callback secrets were persisted.
- 7 — Fixed: principal changes and explicit sign-out clear the celebration; clearing readiness data also resets its screen-local observation baseline.
- 9 — Left alone: device provenance, Premium travel enforcement and home/travel restoration are an approved departure in DECISIONS.md.
- 10 — Fixed: newer edits are rescheduled after an active save, “Saved” waits for current-version server acknowledgement, local writes/removal serialize, late draft restoration cannot overwrite fresh edits, and partial commits refresh caches while retaining the draft; account checks fence subsequent RPCs/cache writes. Navigation stays nonblocking as documented; saves remain multiple retryable RPCs.
- 11 — Fixed: photo/voice attachment errors check for an already-committed path, and uncertain attachments no longer trigger destructive byte cleanup; durable orphan cleanup remains absent, and this client does not retry the same voice path through the non-idempotent RPC.
- 12 — Fixed: crop completion/error callbacks are fenced against cancellation, replacement and unmount.
- 13 — Fixed: photo reorders cannot overlap, failed/unsupported legacy orders restore the displayed order with the existing error, and late account-owned results cannot update another screen.
- 14 — Fixed: malformed/null crop numbers fall back safely in the client; stale paths already have an applicability check. Dormant metadata and the existing setter remain unchanged; no migration was needed.
- 15 — Fixed: successful image loading rearms automatic renewal for later failures; the short URL capability window and focus-driven renewal remain intentional. Native cache clearing was not verified.
- 16 — Fixed: URL-signing failure after voice publication no longer reports save failure; the stored path remains playable/retryable, and stale completion cannot update another screen/account's cache.
- 40 — Fixed: selections are pruned when cards disappear and dialogs reset when their card set/account changes; session-only choices and pre-submit soft-select telemetry remain unchanged. No additional contradictory-dialog interleaving was verified.
- 41 — Fixed: Daily waits for the account's local conduct lookup before exposing the round; failed persistence still permits the acknowledged session, as the existing code explicitly intends.
- 42 — Fixed: reveal eligibility waits for conduct lookup/acknowledgement. Replay after interrupted animation or failed storage remains the existing cosmetic fallback.
- 43 — Fixed: repeated pauses preserve the resume target, snapshots keep timing the same visit after failed/abandoned submission, and closing while paused prevents unintended resume.
- 44 — Fixed: changing slides or dimensions clears global zoom, and retained slide transforms reset when their zoom flag clears; native gesture behavior still needs device verification.
- 45 — Left alone: renewing a greeting can restart playback; restoring position across asynchronous native source replacement is not worth an unverified playback regression here.
- 51 — Fixed: reusable-copy failure now explicitly says the answer was sent but its reusable copy was not saved, translated in all 16 languages. A template-management/forget entry point was not added.
- 53 — Founder decision: keep the existing durable queue/manual retry; automatic resend, strict ordering and discard/edit behavior need a recovery policy together, since enforcing ordering alone can trap later messages behind a permanently refused draft. Orphan secure chunks were not reproduced.
- 55 — Fixed: latest-page polling merges messages/read receipts and preserves expanded history and its oldest cursor, including exhausted history.
- 77 — Left alone: retained device-scoped opt-in and best-effort sign-out cleanup; a client-only change cannot guarantee cancellation of already-claimed/provider-bound sends.
- 80 — Fixed: notices remain visible while acknowledgement is pending or failed; only confirmed acknowledgement removes the notice, with the existing translated error and retryable OK control.
- 81 — Left alone: ignoring signed-out taps avoids carrying an unbound notification into another account; generic account-authorized tab routing and memory deduplication remain. Recipient binding requires a server payload contract.
- 94 — Left alone: deferred native direction/restart is intentional and restart need is already derived; rare persistence failures remain a limitation rather than changing the shared session contract in this batch.

Founder decisions: item 53's automatic-send, ordering and discard/edit recovery policy. No new product policy was chosen.

Files changed by this batch (earlier working-tree edits in shared files were preserved):

- `app/auth-email.tsx`, `app/(tabs)/daily.tsx`, `app/(tabs)/you.tsx`, `app/connection/[id]/answers.tsx`, `app/connection/[id]/chat.tsx`, `app/gallery/[id].tsx`.
- `src/api/profileMedia.ts`, `src/components/notices/NoticeDialog.tsx`, `src/components/ui/ProfileImage.tsx`, `src/components/you/PhotoCropSheet.tsx`, `src/components/you/PrivateTab.tsx`, `src/components/you/ProfileTab.tsx`.
- `src/hooks/useAutosave.ts`, `src/lib/autosave.ts`, `src/lib/avatarCrop.ts`, `src/lib/dwell.ts`, `src/lib/mergeMessages.ts`, `src/lib/pendingEdits.ts`, `src/state/auth.tsx`, `src/state/round.tsx`.
- `src/i18n/catalog.ts`, `src/i18n/catalogs/am.ts`, `src/i18n/catalogs/bn.ts`, `src/i18n/catalogs/es.ts`, `src/i18n/catalogs/fa.ts`, `src/i18n/catalogs/fr.ts`, `src/i18n/catalogs/ha.ts`, `src/i18n/catalogs/hi.ts`, `src/i18n/catalogs/id.ts`, `src/i18n/catalogs/ms.ts`, `src/i18n/catalogs/ru.ts`, `src/i18n/catalogs/so.ts`, `src/i18n/catalogs/tr.ts`, `src/i18n/catalogs/ur.ts`, `src/i18n/catalogs/zh-Hans.ts`.
- `tests/avatarCrop.test.ts`, `tests/dwell.test.ts`, `tests/messageConcurrency.test.ts`, `tests/unsavedChanges.test.ts`.
- `docs/state-machine-reports/5-client.md`.

Existing test expectations updated: `tests/dwell.test.ts` now expects snapshots to continue an open visit; `tests/unsavedChanges.test.ts` names the toast as server-confirmed rather than optimistic. Added regressions cover repeated pauses, closing while paused, malformed crops and polling with retained history/cursors/read receipts.

Validation: `npm test` passed all 545 tests, including marketing/i18n checks; `npx tsc --noEmit -p .` passed. Windows required the equivalent `npm.cmd`/`npx.cmd` launchers because PowerShell blocks the script shims. Targeted ESLint and diff whitespace checks passed.

No migration or pgTAP file was necessary: RPC signatures and database rules are unchanged. Existing migrations, including `20261106090000_state_machine_fixes.sql`, were not edited. No project, deploy, prohibited git operation or `.env*` file was accessed.

Not verified: native UI/permission/gesture/audio/push/cache behavior, React autosave timing under a mounted device UI, process-kill/storage-failure durability, live database/Storage behavior, provider delivery, and translation review by native speakers. Database tests were not run, per the task boundary. Durable cleanup jobs, voice-RPC idempotence, outbox recovery, recipient-bound taps and rare locale persistence failures remain as described above.
