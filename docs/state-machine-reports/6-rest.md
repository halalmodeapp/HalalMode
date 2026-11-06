Remaining audit items from `docs/IMPLICIT_STATE_MACHINES_SOL.md`.

- 72 — Fixed: the call button opens the existing translated unavailable screen; removed the timer and callback that simulated a connected call. Enabling the flag cannot establish a fake connection.
- 89 — Already fine: the launch gate and empty iOS listing are documented launch prerequisites. The website saves attribution to the signed-in account before store handoff; the app deliberately signs in separately. Terminal claim results clear the pending code, while request failures retain it. No verified attribution defect justified changing this gated flow.
- 90 — Fixed: parallel admin RPCs share one token refresh, failed refreshes can retry, MFA waits for refresh, and sign-out immediately clears local authority. Late refresh/MFA/RPC responses cannot restore the signed-out session. Role and unlock displays remain snapshots refreshed periodically; live membership, MFA and step-up checks already protect every server action.
- 91 — Founder decision: whether removing an admin also revokes tester/sample access, including separately granted access and tester Premium. Automatic and explicit grants share the same rows without provenance, and a separate audited test-account removal RPC already exists. Left grants unchanged; normal role/removal RPCs already serialize last-owner preservation.

Coverage: earlier reports handle the other 90 unique items. Items 27 and 28 appear in both worker and matching reports; counted once, using the matching report's final disposition. No item was left solely for another batch, and no audit item is unreported. `SUMMARY.md` consolidates all 94 dispositions and founder decisions.

Files touched by this batch:

- `app/connection/[id]/chat.tsx`
- `site/admin.js`
- `tests/adminSession.test.ts`
- `docs/state-machine-reports/6-rest.md`
- `docs/state-machine-reports/SUMMARY.md`

Validation: `npm test` passed all 550 tests, including five new mocked admin-session regressions; `npx tsc --noEmit -p .` passed. Used the Windows `.cmd` launchers. Targeted ESLint and scoped whitespace checks passed. No existing test expectations changed. Existing localized call copy is reused; no new user-visible strings were added.

No migration or pgTAP file was needed: this batch changes no database definition, RPC signature or product rule. Existing migrations and earlier working-tree edits were preserved. No `.env*` file, Supabase project, deployment or prohibited Git operation was accessed.

Not verified: native call-screen behavior, real Auth/MFA/token rotation, remote session revocation, store installation and cross-device sign-in, production grants, or database test execution. Admin tests execute the actual network/session functions with mocked HTTP, rather than contacting Auth. Earlier reports' database reruns and native/provider limitations remain outstanding; this summary does not certify them as resolved.
