Implemented the three 2026-11-07 decisions in this batch.

- **Answers:** the migration uses one both-members-complete check for connection reads, answer submission responses and the legacy recap reader. Partner text and timestamps, recap and compatibility remain sealed until every answer from both members exists. Immutable retries and the two-question commitment remain intact. Answers and recap screens show a translated waiting state instead of an early recap; answering never renders partner text. Mock submission follows the same release boundary.
- **Waiting matches:** existing preference-independent promotion is preserved, with hide checks and immediate cleanup on hide/deletion. Waiting mutuals have no expiry and promotion still requires capacity and neither member paused. A new authorized reader returns only the other member's ID, first name and blurred-photo paths. Connections shows the first blurred photo using the existing Liked-you component/storage boundary, with a positive heading and plain explanation of capacity and pause conditions. Both sides see it, including while paused; promotion moves it into the ordinary list.
- **Messages:** chat offers individual removal from the durable phone outbox through its existing `removePendingMessage` operation. Sent-message withdrawal checks ownership and a private database setting, initially 15 minutes. It leaves a timestamped tombstone and the literal fallback “Message deleted” for installed clients; the new client translates bubbles and connection previews. Polling also updates deleted messages in expanded history, and stale send responses cannot restore text. Original content and metadata remain in private safety evidence, with a service-only report reader, surviving account deletion and purged after two years.

Choices: “both at once” means the same completed database state authorizes either reader, without waiting for both phones to be online. Waiting copy describes general capacity/pause conditions without identifying whose account is full or paused. Only the first blurred photo appears on the compact Connections row; unavailable copies use the existing neutral tile. Phone deletion discards an outbox item and does not claim that an uncertain network send never reached the server. Sender ownership and the configured window also permit withdrawal after closure or blocking; no new history screen was added. The two-year evidence period follows the existing safety-retention policy. No existing RPC signature was changed or removed.

Files touched:

- `app/(tabs)/connections.tsx`
- `app/connection/[id]/answers.tsx`
- `app/connection/[id]/chat.tsx`
- `app/connection/[id]/recap.tsx`
- `src/api/connections.ts`
- `src/components/likedYou/LikedYouPhoto.tsx`
- `src/lib/mergeMessages.ts`
- `src/types/index.ts`
- `src/i18n/catalog.ts`
- `src/i18n/catalogs/am.ts`
- `src/i18n/catalogs/bn.ts`
- `src/i18n/catalogs/es.ts`
- `src/i18n/catalogs/fa.ts`
- `src/i18n/catalogs/fr.ts`
- `src/i18n/catalogs/ha.ts`
- `src/i18n/catalogs/hi.ts`
- `src/i18n/catalogs/id.ts`
- `src/i18n/catalogs/ms.ts`
- `src/i18n/catalogs/ru.ts`
- `src/i18n/catalogs/so.ts`
- `src/i18n/catalogs/tr.ts`
- `src/i18n/catalogs/ur.ts`
- `src/i18n/catalogs/zh-Hans.ts`
- `supabase/migrations/20261107090000_answers_matches_messages.sql`
- `supabase/tests/database/0228_answers_matches_messages.test.sql`
- `supabase/tests/database/0022_compatibility_recap_contract.test.sql`
- `supabase/tests/database/0097_answer_release.test.sql`
- `tests/messageConcurrency.test.ts`
- `tests/messageOutboxIntegration.test.ts`
- `docs/state-machine-reports/7-answers-matches-messages.md`

Existing test updates: `0097` now expects the finished reader to wait for the partner's remaining answer. `0022` seeds completed answers for its recap fixture, preserving its compatibility assertions. The two existing unit-test files gain durable discard, stale-response and expanded-history deletion regressions; their prior expectations are unchanged. The new pgTAP file has 70 assertions covering all three decisions, privacy/ownership boundaries, configurable deadlines, old-client retries and retained report evidence.

Verification: `npm test` passed all 553 tests; `npx tsc --noEmit -p .` passed, using Windows `.cmd` launchers. Targeted ESLint and scoped whitespace checks passed. SQL parsing passed for 252 migrations, 78 database test files and 102 SQL function bodies. All new or changed member-facing copy is translated in all 16 languages; marketing/brand checks pass.

Not verified: pgTAP execution, migration semantics, concurrent database transactions, live Storage signing and evidence-purge cron execution await the database runner. Native layout, RTL, accessibility, outbox persistence across device/process failures and installed-client refresh behavior were not exercised on devices. Translations have not had native-speaker review. No `.env*` file, Supabase project, deployment, existing migration or prohibited Git operation was accessed. Pre-existing changes and excluded files were preserved.


Database feedback correction: the supplied run reported 1,163 passing assertions, zero failed assertions and one aborted file (`0228`): its direct Auth-user deletion cascaded into append-only consent history after the fixture had cleared its JWT claims. This was an invalid test maintenance context, not a defect in message withdrawal or its evidence retention. The existing guard in `0047` explicitly permits service-role maintenance; the existing boundary test also exercises that path. `0228` now sets the service-role claim for this fixture erasure, checks that deletion completes, and confirms that both the Auth user and consent-history rows are gone before checking surviving evidence and reports. No guard is disabled, and none of the evidence-survival expectations was relaxed. Only `supabase/tests/database/0228_answers_matches_messages.test.sql` and this report changed in this correction; the migration and client are unchanged.

Correction verification: `npm test` passed all 553 tests again; `npx tsc --noEmit -p .` passed; SQL parsing again passed for 252 migrations, 78 database test files and 102 SQL function bodies. The test plan now contains 70 assertions. The supplied rule-parity run checked 89,700 ordered pairs, accepted 8,513 and found zero disagreements. Corrected pgTAP execution remains pending with the database runner; the supplied aborted run does not establish that the remaining assertions pass. No Supabase project, existing migration, excluded file, `.env*` file, deployment or prohibited Git operation was accessed during this correction.
