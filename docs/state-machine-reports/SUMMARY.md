All 94 numbered items in `docs/IMPLICIT_STATE_MACHINES_SOL.md` have a disposition across reports 1–6. No item was deferred solely because it belonged to another batch.

| Primary disposition | Items |
| --- | ---: |
| Fixed | 67 |
| Already fine | 8 |
| Left alone | 15 |
| Founder decision | 4 |
| Total | 94 |

These totals count each machine once by its report's leading disposition. A fixed item can still contain an unchanged policy question; all such founder decisions are collected below. Items 27 and 28 appeared twice; the matching report's final dispositions take precedence (27 already fine, 28 left alone). These are source-review outcomes, not claims of production or database-run verification.

Fixed: 1, 2, 4, 5, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 31, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 48, 49, 50, 51, 52, 55, 56, 59, 60, 62, 63, 65, 66, 68, 69, 70, 71, 72, 73, 74, 76, 78, 79, 80, 82, 83, 85, 86, 87, 88, 90, 92, 93.

Already fine: 6, 18, 27, 33, 34, 75, 84, 89.

Left alone: 3, 9, 28, 29, 30, 32, 45, 47, 54, 61, 64, 67, 77, 81, 94.

Founder decision as primary disposition: 53, 57, 58, 91.

Founder decisions, including questions within otherwise fixed items:

- **5:** Define sensitive-consent withdrawal and what happens to the affected data.
- **8, 93:** Define restoration after administrative restrictions, automatic suspension expiry, how restriction causes are represented, and whether unban restores voluntary pause. Active restriction/deletion guards and action fencing were fixed; restoration policy was preserved.
- **19:** Decide whether unresolved human selfie review extends evidence retention beyond the existing 30-day review clock.
- **22:** Define allowable marital-status transitions; serialization does not choose which declarations are permitted.
- **24:** Decide whether and how account deletion can be cancelled during its hold.
- **25:** Decide whether an anonymous exit-survey answer counts only after a successful deletion request.
- **46:** Decide whether an earned queued mutual survives changed preferences/readiness/consent, waits for eligibility, or expires.
- **49:** Resolve simultaneous answer release in the manifesto versus caller-complete release in DECISIONS. Immutable retry recovery was fixed; release policy was preserved.
- **53:** Define automatic resend, ordering, discard and edit recovery for the durable message outbox together.
- **57:** Define farewell behavior for old clients that supply no reason, and whether farewell text/name survives sender deletion, with a retention policy.
- **58:** Decide whether Premium lapse stops existing Cards play and Journal agreement/removal/restore, beyond the existing restrictions on starts/proposals.
- **79:** Any move from enqueue-based to delivery-based reminder budgets, or reset of quiet-chat budgets after activity, changes reminder policy; enqueue accounting alone was fixed.
- **91:** Decide whether admin removal revokes tester/sample access and tester Premium, how separately granted testing access survives, and whether grant provenance is needed.

The individual reports contain changed-file inventories, verification evidence and remaining limits. Batch 6 passed 550 unit/source-contract tests, the app typecheck and targeted lint. Database execution, pending feedback reruns from earlier batches, real concurrent transactions, native behavior and external provider operations are not certified by these totals. No production project was contacted by batch 6.
