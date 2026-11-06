# Halal Cards audit batch: items 58?71

58. **Founder decision:** whether a Premium lapse should stop existing play and Journal agreement/removal/restore; the current distinction from new starts/proposals remains unchanged.
59. **Fixed:** normal-client invitations now respect the chosen content track; either-member track changes and client-owned content rules remain intended behavior.
60. **Fixed:** starts serialize the twelve-session check and insert; full session reads persist invitation expiry. Active sessions keep their existing unlimited lifetime.
61. **Left alone:** immutable sealed JSON and client-owned answer rules are approved; server sealing and authorization remain unchanged.
62. **Fixed:** incompatible state and failed story interpretation reach recovery before synchronous turn/resolution code; CAS and client-owned transitions remain intact.
63. **Fixed:** sealed-answer attention is derived under the session lock; fresh answers increment the version, and immutable retries cannot overwrite later attention.
64. **Left alone:** either participant advancing shared Lab reading is part of the approved client-rule architecture.
65. **Fixed:** unusable quiz answers reach restart recovery instead of partial reveals/results; roles, required fields and option indices are checked in the client.
66. **Fixed:** unusable current story choices reach recovery; arbitrary server state writes remain part of the approved architecture, and authored branches were not rewritten.
67. **Left alone:** local catch-up and the eight-reveal window remain; durable acknowledgements would expand persistence and product scope.
68. **Fixed:** malformed structures/counters are rejected before interpretation; unknown activities can be cancelled, and incompatible invitations can be restarted too.
69. **Fixed:** changing the solo route resets its run before interpretation; losing a preview on unmount remains intended local-only behavior.
70. **Fixed:** proposal/dedup/cap checks serialize with restore; duplicates can agree at capacity, and restores cannot exceed the cap or duplicate an active entry. The existing single local undo remains; an archive UI is outside this targeted fix.
71. **Fixed:** sample reset removes waiting sample mutuals while preserving real waits; mock answer versions match the new database behavior. Hide/block filtering is already present in the latest sample generator; safety choices and intentional sample/mock differences remain.

## Files touched

- `supabase/migrations/20261106130000_halal_cards.sql`
- `supabase/tests/database/0227_halal_cards.test.sql`
- `supabase/tests/database/0190_halal_cards.test.sql` ? updated the old version assertion from 2?3 to 4?5 because two fresh answers now increment versions; preserved its pre-existing entitlement fixture change.
- `src/halalCards/engine/session.ts`
- `src/halalCards/hooks.ts`
- `src/api/halalCardsMock.ts`
- `app/halal-cards/[id]/activity/[activityId].tsx`
- `app/halal-cards/[id]/play/[sessionId].tsx`
- `app/halal-cards/[id]/solo/[activityId].tsx`
- `tests/halalCards.test.ts`
- `docs/state-machine-reports/4-cards.md`

## Verification and limits

- `npm test`: 540 passed; `npx tsc --noEmit -p .`: passed. Used the `.cmd` launchers because PowerShell blocks the `.ps1` wrappers.
- Focused ESLint: passed. SQL parser: 251 migrations, 77 database test files, zero problems.
- Added 29 pgTAP assertions. Database execution and true simultaneous-transaction tests await the supplied runner; lock ownership assertions are not a concurrency stress test.
- Native screens, route reuse, old installed clients and notification delivery were not exercised. RPC signatures/defaults and existing grants are preserved; no migration was edited.
- Existing stale attention, duplicate Journal entries or over-cap data are not backfilled; no live data was inspected. Recovery cancels/restarts incompatible sessions rather than repairing immutable answers.
- No new user-visible copy was introduced; existing localized Cards copy is reused. No Supabase project, environment file, deployment or prohibited Git operation was used.
