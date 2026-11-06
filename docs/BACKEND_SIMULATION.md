# The league, and how it was tested

Why the matcher is built as it is, what proves it, and what has not been proven. For what the app is for, read [MANIFESTO.md](MANIFESTO.md) first.

## How a round is built

| Step | Where | What happens |
|---|---|---|
| Prepare | Worker | Works out each member's dawn from the cycle's stored start, so a retry gets the same answer. Creates their round |
| Deal | One SQL call | Each seat goes to one of the member's countries, taking the list in turn. Each country is split into groups, frozen for a cycle. Each game, group t of men sits with group t + offset of women |
| Play | Pure TypeScript | Hard rules both ways, then one line of value. Everyone gets a first before anyone gets a second |
| Commit | SQL, 200 at a time | Under the same member locks a block or a pause takes, every proposal is checked against live data. Failures are dropped |
| Make up | Same again | Anyone short tries their next country, up to 5 waves. Premium extras come here, after everyone's five |
| Seal | One SQL call | Sends the notification with the real count, and keeps a record for the admin screens |

Value: `their fit x your fit x new-face bonus x (need + need) x like-meets-like`.

There is no day-wide claim to lose. A worker that dies leaves a lease that runs out, and another takes the table. `league_matching` is the switch, read on every claim and every commit. No private data is snapshotted: a seat holds an id and goes when the account goes.

Settings are in `halal_mode_private.league_config`: table size 500, 5 games, 1 make-up pass, one-day repeat gap, 3 one-way passes, a yes waits 7 days, like-meets-like 2.

## Results on the real database

Every migration, the same RPCs the app calls as each member, RLS and triggers. Simulated members at extreme compression, on one laptop, with all workers sharing one process.

| Members | Round time | Worst table CPU | Sets under 5 by the last day | Invariants broken |
|---:|---:|---:|---:|---:|
| 300 | 2.2 s | 0.1 s | 16% | 0 |
| 1,000 | 7 to 11 s | 0.5 s | 5% | 0 |
| 10,000 | 51 to 71 s | 0.5 s | 0.1% | 0 |

Before: about 16 minutes at 10,000 on the reciprocal pipeline, and 229 s at 2,000 on the generator before that. Both have been removed.

- **Workers killed at random:** 5% of writes died, half after landing with the answer lost. Every round finished, nothing was duplicated, and no invariant broke.
- **Two copies of the rules:** 89,700 ordered pairs of awkward members, table rules against SQL, 0 disagreements (`parity.mts`).
- **Commit under load:** 0.4 s for 200 at 1,000 members, up to 2.8 s at 10,000 with live traffic, against an 8 s limit.

## Results in the lab

`lab.mts` is in memory, so it can compare many methods over many days: separate histories, whole-set capped picks, five taste models. Behaviour is invented, so only what holds across models counts.

**Allocator.** A simple greedy pass reaches 99.5% of the exact optimum, and produces more real matches than exact (95.5% of it), which concentrates. Local search added nothing at 45x the CPU. Choosing at random from eligible people is about 95% of the value line. **The allocator is a small lever.**

**Repeat gap**, 300 in one city:

| Gap | Matches | Under 5 days | Zero days |
|---:|---:|---:|---:|
| 21 days, max 2 (old rule) | 61% | 82% | 41% |
| 14 days | 76% | 78% | 31% |
| **7 days** | 100% | 62% | 15% |
| 3 days | 115% | 44% | 8% |

The match gains are overstated, because a repeat gets a fresh chance of being picked. The fill numbers are not.

**City size** at 7-day repeats, balanced genders: under-5 days are 62% at 300, 22% at 1,000, 10% at 2,000. Members who could only ever reach fewer than 35 people: 35%, 11%, 7%. They depend on invented filter strictness.

**Gender balance.** Sets are filled with one-way cards, so a crowded side no longer goes short. The numbers and how it works are in `docs/FIVE_A_DAY_PLAN.md`.

**Like meets like**, 1,000 members over 60 days. Gap is the average difference in hidden appeal between people introduced, once the score has had time to form. Random pairing is 1.13.

| Strength | Gap | Matches: aiming upward / appeal / stated fit useless | No match | Lowest tenth, no match |
|---:|---:|---:|---:|---:|
| Off | 1.13 | 100 / 100 / 100 | 38.8% | 57.1% |
| 1 | 1.07 | 108 / 98 / 99 | 39.2% | 58.9% |
| **2** | 1.02 | 110 / 98 / 98 | 39.3% | 58.7% |
| 4 | 0.99 | 112 / 97 / 93 | 39.6% | 61.1% |
| 8 | 0.99 | 107 / 95 / 96 | 40.0% | 62.7% |

Under the founder's account of how people behave, it helps by about 10%. Under the others it costs about 2%. It stops improving at about 0.99 however hard it is pushed, because the score can only see appeal through noisy picks. **A stronger or more direct score is what would make like meet like further, not a stronger setting.** The AI photo signal is the obvious next input, and it is switched off.

## What has not been proven

- **Real PostgREST, Edge runtime, pg_cron and pg_net.** Limits are compared with measurements here, not enforced. The fan-out in `generate-round/index.ts` has never run. The first hosted run has to measure Edge CPU.
- **Real taste.** Only real picks can show whether stated fit predicts anything, or whether the score sees what it claims.
- **Real data migration** on a populated database.
- **The app screens** on a device: the country picker, the short-set notice, the note under preferences.
- **Translations,** written by an AI, need a native check.

## Running it

```bash
npm install --no-save pg embedded-postgres@17.11.0-beta.19
```

```bash
node scripts/backend-sim/local/postgres.mjs
```

```bash
node scripts/backend-sim/run.mts --fresh --per-side 500 --days 7
```

Useful flags: `--chaos 0.05` kills workers, `--abroad 0.2` puts members elsewhere, `--day-minutes 12` sets how compressed a day is, `--workers 8`. `parity.mts` compares the rules. `lab.mts` and `lab-batch.mjs` compare methods, for example `league1000x5+slot@level2@gap7`.

The GitHub workflow does the same on the Supabase image with no secrets. It has never run, so its first run needs watching. The manual trigger appears once the file is on the default branch; until then, a push to `backend-sim/**` starts it.

## Delayed introductions for crowded cities (lab only)

The founder's direction for a crowded side, in place of limiting sign-ups. A scarce-side member may sit in several crowded-side sets, up to a cap, and still sees only their own five. Whoever picked them comes back to their set later. Lab option `@delayed{cap}@life{days}`, 1,000 members in one city, 45 days, 3 seeds, 4 tastes:

| Men | Rule | Matches | No match at all | Men's days under 5 | Shown to per day |
|---:|---|---:|---:|---:|---:|
| 65% | today | 100% | 42.0% | 97.7% | 5 or fewer |
| 65% | cap 10, waits 1 day | 156% | 33.7% | 46.4% | 8.4 |
| 65% | cap 10, waits 14 days | 197% | 30.1% | 58.4% | 8.3 |
| 65% | cap 15, waits 14 days | 203% | 30.0% | 36.9% | 9.3 |
| 50% | today | 100% | 37.0% | 23.1% | 5 or fewer |
| 50% | cap 10, waits 1 day | 130% | 31.8% | 20.6% | 5.1 |
| 50% | cap 10, waits 14 days | 160% | 27.8% | 20.4% | 5.0 |

Treat these as upper bounds. Returns are re-checked on delivery for a departure or a pass, but the lab has no fatigue, and it assumes someone picks a person who already picked them as often as anyone else. At 50% most of the gain comes from interest outliving the day, not from the imbalance. It takes at least 9.3 exposures per woman to fill every man's five at 65% men and 15 at 75%, before filters.

Not built. If built: a private queue of returns rather than held twins, on persistently crowded pools only, with the direction fixed for the cycle. The queue must be bounded, must stay out of the Liked-you tray and media access, must re-check safety on delivery, and must not let `expire_stale_rounds` expire the original yes. Telling the crowded side what is happening has to be precise: it may be considered for 14 days and may lapse unseen.
