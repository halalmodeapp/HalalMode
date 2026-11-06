# Implicit state machines: two independent lists, compared

2026-11-06. Claude and Sol 6.1 (on ultra, in a fresh session) each searched the app without seeing the other's list. My list was written down before I opened Sol's. Sol's full report, with file references for every machine, is in [IMPLICIT_STATE_MACHINES_SOL.md](IMPLICIT_STATE_MACHINES_SOL.md).

An implicit state machine is behaviour that moves through distinct states with rules about legal moves, where neither the states nor the moves are declared in one place.

## Result

| | Claude | Sol |
|---|---:|---:|
| Machines found | 40 | 94 |
| Found by both | 39 of 40 | |
| Only this list | 1 | 22 |

The counts differ mainly because Sol splits more finely: my single Halal Cards entry is about ten of Sol's. Sol also read the client much more deeply. Mine was mostly the database, with a shallower pass over the client.

## Serious claims checked

| Finding | Found by | How it was checked | Result |
|---|---|---|---|
| Bio: the database requires 80 characters and the app accepts 50. Someone with 50-79 looks complete and is never matched | Sol | Read both rules | **Real** |
| Complimentary Premium never ends: expiry deletes the entitlement but the profile stays Premium, and the next run cannot repair it | Sol | Ran it locally | **Real.** Returned 0 ended, tier still premium. No such grants on production today |
| Someone who requested deletion can resume, go back into matching, and still be erased at 30 days | Both | Read the functions and the pool view | **Real** |
| A mutual match waiting for room is not re-tried on unpause or upgrade, only when someone closes or blocks | Both | Listed every caller | **Real** |
| A selfie in `review` has no way out: admin "reviewed" does not change it | Both | Listed every writer | **Real** |
| Deletion leaves blurred photos behind | Sol | Read the deletion function, which names 3 buckets and no blurred one | **Real** |
| Like-back skips the live eligibility and answer-owed checks | Sol | Read the function | **Real** |
| A sealed day can hide failed tables: nothing records or reopens them | Sol | Read `league_advance` and `league_seal` | **Real** |
| Moderation and mail settlement have no claim token, so a slow worker can act on newer work | Sol | Read the functions | **Real** |
| The old `close_connection` still works, so old app versions close with no kind word | Sol | Checked the grant | **Real**, and needed until the app is released |
| Reopening answers makes sent answers look editable, because the cursor uses local state | Sol | Read the screen, not run | Likely |

Everything else in Sol's report is its own static reading and has not been independently verified.

## Top five to make explicit first

| | Claude | Sol |
|---|---|---|
| 1 | Account deletion | Matching eligibility and re-entry |
| 2 | Mutual-match queue | Connection lifecycle |
| 3 | Premium | Mutual-match queue |
| 4 | Connection lifecycle | Account deletion |
| 5 | Daily round status | Premium |

Four are the same. Sol's fifth is the better one: a single eligibility rule fixes more, because pool, commit, show, pick and like-back each check something slightly different. I'd take Sol's list.

## Found only by Claude

- **Verification leftovers:** `profiles.is_verified` and `member_verifications` have no writers, and no screen uses `isVerified` apart from mock data. They look like verification states but do nothing. Sol left these out on purpose as unused scaffolding. Low risk, and worth deleting so nobody trusts them.

## Found only by Sol

| Machine | Sol's severity | |
|---|---|---|
| Profile and preferences autosave (#10) | High | Partial saves, and "Saved" not tied to storage |
| Blurred-photo generation and cleanup (#20) | High | The deletion gap above |
| Location and travel mode (#9) | Medium | Travel overwrites home, and Premium ending cannot restore it |
| Private photo URLs and renewal (#15) | Medium | |
| Estimate refresh (#38) | Medium | |
| Attention timing (#43) | Medium | |
| AI connection summary (#52) | Medium | |
| Mail provider selection (#83) | Medium | |
| Admin session, MFA and step-up (#90) | Medium | |
| Sign-in, sign-in links, crops, avatar crop, conduct, reveal, gallery, voice playback, saved answers, notification taps, web invite, admin team, language direction (#2, 3, 12, 14, 41, 42, 44, 45, 51, 81, 89, 91, 94) | Low | |

## Where the same area differs

- **Waiting yes, Halal Bot, leaving answers and farewell notes (#36, 21, 25, 57):** these were built this week. Sol still found edges: "seen" means opening the app rather than viewing the card, a late Halal Bot save can exceed the free looks by one, and a leaving answer is counted even if deletion then fails.
- **Severity:** Sol rates onboarding, consent and profile readiness high, and I had them as medium. The bio mismatch shows Sol is right about readiness.
- **Neither ran the app:** both lists come from reading source. Only the checks in the table above went further.

## What happened next

Sol 6.1 worked through all 94 items in six batches (`docs/state-machine-reports/`, totals and the founder's open decisions in `SUMMARY.md`), and Claude reviewed the result. Sol's count: 67 fixed, 8 already fine, 15 left alone, 4 waiting on the founder. These fixes are in the repository but **not yet on production**, and they have only run on a local database. They need a hosted test first.

Changes from the review: the matcher's commit keeps its set-based pair check because Sol's shared per-pair function made it about four times slower, and the Premium projection job runs every 15 minutes instead of every minute. The simulations now give Premium members a real entitlement, since Premium no longer comes from the profile's tier.
