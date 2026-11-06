# Matching and connections

26. **Fixed:** shared member eligibility and reciprocal pair checks now cover pool admission, commit, return delivery, show, pick and like-back; readiness, onboarding, saved preferences, both consents, deletion, gender and lifetime connections are checked consistently. Capacity/dormancy still govern new sets; passes still cannot hide an existing card. SQL `accepts_row` and `src/matching/league.ts` are unchanged.
27. **Already fine:** partial sealing is intentional; the prior batch records failed tables and exposes them in health. Reopening cycles or freezing configuration would change the orchestration contract and is left alone.
28. **Left alone:** token-fenced commits and bounded retries are present; the slow-worker/lease-exhaustion claim was not reproduced, and partial commits must survive retries.
29. **Left alone:** frozen rotation and hash-based grouping are confirmed; imposing hard table bounds would change the explicitly protected table-size/selection design.
30. **Left alone:** submission and expiry share a timestamp, but time gates independently enforce expiry and opened sets cannot grow; no additional correctness defect was verified.
31. **Fixed:** the round provider refreshes at the server's displayed Fajr/expiry boundary. Partial-answer debt, timeout policy and future-round precedence are unchanged.
32. **Left alone:** quiet removal of invalid picks is the existing privacy contract; adding rejection feedback or changing confirmation would change what members are told. Existing tuple, rank and round guards remain.
33. **Already fine:** first-pass cooldown and permanent second pass are deliberate; passes remain excluded from card visibility checks, so a disappearing card cannot disclose one.
34. **Already fine:** unblock removes the directional block; it does not undo a lifetime connection, as required by the manifesto's never-connected rule.
35. **Fixed:** sample selection now excludes bilateral hides before spending seats; production hiding already uses bilateral checks and permanent retirement.
36. **Fixed:** return delivery now shares live eligibility. Daily-based seen tracking, cursor deferral and later keep cleanup remain the existing delivery/expiry contract; no separate notification or rejection is introduced.
37. **Fixed:** like-back uses shared readiness/pair checks, and tier/tray reads now occur under the member locks; the prior batch's answer-debt and pass guards remain intact.
38. **Fixed:** ranked submission refreshes the submitting member after recording ranks, including new mutual-first-choice evidence. Cohort normalization and disabled photo-feature cache timing are left alone because changing them would change scoring.
46. **Fixed:** paused/deleting pairs and full counterparts outside the supplied members no longer crowd out the oldest-ten promotion scan; earned mutuals remain queued. Supplied members may be about to free capacity, preserving the prior deletion fix. Resume/upgrade activation was already fixed; revalidating or expiring earned mutuals needs a founder decision.
47. **Left alone:** client writes are restricted and RPCs authorize stage transitions; no reachable prerequisite bypass was verified. Timeouts and mutual recap acknowledgement would add product rules.
48. **Fixed:** an identical two-question commitment can be retried after stage advancement; changed, duplicate and null choices remain rejected, and closed/nonmember connections remain unavailable.
49. **Fixed / founder decision:** the same final answer can be retried after recap/open without mutation or stage regression. Answer release remains caller-complete under DECISIONS; simultaneous release under the manifesto needs the founder to resolve the conflict.
50. **Fixed:** fetched submission markers lock previously committed answers and display their stored text; recap polls while answers are pending, requests a summary only when ready, disables premature opening and surfaces opening failures using existing translations.
54. **Left alone:** opted-out receipt stamping intentionally returns early. Separating private consumption from public receipts requires coordinated changes to unread projections and reminder jobs; changing this field alone risks receipt privacy. Marking unloaded messages is unchanged.
56. **Fixed:** explicit contact consent requires current legal consent and locks the connection before inserting/checking consent, so concurrent first consents serialize; original exchange time/source remain preserved.
57. **Founder decision:** the legacy close RPC cannot obtain a reason from old clients; choosing a fallback reason would invent member speech. Sender-deletion farewell retention is also a privacy/retention decision; current suppression/cascades and client farewell handling are unchanged.

## Founder decisions

- **46:** Does an already-earned queued mutual keep its promise after preferences/readiness/consent change, wait for eligibility to return, or expire? The current promotion contract is preserved.
- **49:** Resolve the manifesto's simultaneous answer release versus DECISIONS' caller-complete release. No release rule changed.
- **57:** Specify legacy-client farewell behavior and whether a farewell survives sender deletion, including its name/retention policy. No reason or retained identity was invented.

## Files touched

- `supabase/migrations/20261106110000_matching_and_connections.sql`
- `supabase/tests/database/0225_matching_and_connections.test.sql`
- `supabase/tests/database/0212_liked_you.test.sql` (completed-preferences fixture only; assertions unchanged)
- `app/connection/[id]/answers.tsx`
- `app/connection/[id]/recap.tsx`
- `src/state/round.tsx` (the boundary refresh only; existing unrelated edits preserved)
- `docs/state-machine-reports/2-matching.md`

The existing `0212_liked_you.test.sql` success fixture now records explicitly completed preferences; its assertions are unchanged. The new pgTAP file contains 59 assertions covering live eligibility, commit/show/pick/return/like-back, pass privacy, retry recovery, immutable answers, contact consent, immediate mutual-first-choice estimates, queue starvation and hidden samples. Its incomplete-preferences fixture is inserted rather than updated, because the existing UPDATE trigger automatically marks preferences complete; an added assertion verifies that the fixture really is incomplete. No production eligibility check was weakened, no existing migration was edited, and no new pure TypeScript function or user-visible string was added.

## Database test follow-up

The supplied run reported 1,045 passing assertions, one failing assertion in `0225`, and an exception in `0212`. Both were incorrect fixture setup: `0212` expected successful like-back with unsaved preferences, while `0225` attempted to unset completion through a trigger that restores it. The fixture corrections above preserve the intended eligibility rule and every original assertion. The supplied rule-parity run compared 89,700 ordered pairs, accepted 8,513 and found zero disagreements. A fresh database run is still required to verify these corrections.

After these corrections, `npm test` passed all 526 tests, `npx tsc --noEmit -p .` passed, and `npm run verify:sql` again reported zero problems. The new pgTAP plan and assertion count both equal 59. Only the two test files and this report were changed in the follow-up.

## Verification and limits

- `npm test`: **526 passed**, using `npm.cmd` because PowerShell blocks the npm script shim.
- `npx tsc --noEmit -p .`: **passed**, using `npx.cmd`.
- `npm run verify:sql`: **passed**; 249 migrations, 75 database tests and 94 SQL bodies parsed, zero problems.
- ESLint on the three changed client files: **passed**; scoped `git diff --check`: **passed**.
- Database tests were **not executed locally**; the supplied external run and pending rerun are recorded above. SQL parsing does not verify PL/pgSQL semantics, runtime plans, concurrent sessions or migration replay. Contact serialization is covered structurally and sequentially, not by a multi-session race test.
- No Supabase project was contacted; no deployment or prohibited Git action was run; no `.env*` file was opened. Native UI/timer behavior and production-scale performance remain unverified.
