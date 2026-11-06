# Five a day: vision and plan

Status: migrations and functions deployed to production on 2026-11-06, with matching set to start at 14:31 UTC. The app and website have not been updated. Every number here is from the lab (`scripts/backend-sim/lab.mts`, results in `sim-results/lab-final.jsonl`), a simulation whose filters and yes-rates are guesses. No real member has used any of this. Sol 6.1 reviewed this twice: its corrections are included, and it spot-checked six of the numbers against the results.

## The vision

Everyone opens the app to five people, every day, whenever five permitted people exist. Nobody gets an empty day while someone they could be shown is available. New faces come first, a familiar face beats an empty seat, and some of the five are people who have already said yes.

Targets:

- **Five a day:** 100% is the ideal. 95% is the bar for cities of about 3,000 and up. Everyone in the matching pool counts, however hard they are to match. The pool means joined, seen in the last 14 days, and under their connection limit.
- **Matches:** the founder's aim is a match on 75% of the days someone is active. No tested option reached that, so the first working target is a match on about 1 in 4 days a member opens the app, reset once real behaviour is known.

## The rules

1. **Five slots, filled in this order:** people who already said yes, then new people, then people seen once, then people seen more. Premium's ten works the same way.
2. **Two-way first.** Introductions stay mutual while seats last. Anyone still short gets one-way cards, least-seen people first. The rule looks at who is short, never at gender, so it works whichever side is crowded. No fixed cap.
3. **A yes on a one-way card waits up to 7 days** and takes an ordinary slot in the other person's five. It stays until they open a set holding it, so they see it once, then it leaves. If they say yes, it is a match at once. It is cancelled if either person leaves, passes or blocks.
4. **While a yes is waiting, that pair is not dealt again,** either way round.
5. **What each person has seen is counted per person.** A one-way card tells the other person nothing, so it does not count as them having seen anyone.
6. **Repeats are the last resort before a short set,** as soon as the next day, never the same day. They are an order of preference, not a limit: every hard limit tested left more people with nothing.
7. **These never bend:** passes while they last, hides, blocks, connected pairs, must-haves, chosen countries.
8. **A short set still goes out.** Three people possible means three shown. Name a filter only when one is the cause. Under three, say so anyway: "Only 2 today. Few people match your filters and location right now."
9. **Be honest with the person waiting.** A yes may be considered for 7 days and may lapse unseen. Never imply it was seen or rejected.

## On the real backend

The full rules, on a local copy of the real database, with simulated members using the real functions. These filters are looser than the lab's, and each run lasts only 3-5 days, so a city has not run out of people. This is local evidence that it works, on Node rather than the real Edge runtime. The lab is the better forecast.

| Members | Men | Sets with five | Empty sets | One-way cards a day | Most sets anyone was in | Round time | Rules broken |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 300 | 50% | 98-99% | 0 | 44-77 | 11 | 3-4 s | 0 |
| 1,000 | 50% | 99.7-99.8% | 0 | 57-127 | 12 | 9-34 s | 0 |
| 1,000 | 65% | 99.8-99.9% | 0 | 1,733-2,544 | 16 | 9-11 s | 0 |
| 1,000 | 35% | 99.7-99.8% | 0 | 1,664-2,224 | 13 | 9-38 s | 0 |
| 1,000 | 65%, workers killed at random | 99.7-99.9% | 0 | 1,733-2,422 | 12 | 40-69 s | 0 |
| 10,000 | 65% | 99.99-100% | 0 | 16,312-24,282 | 15 | 68-103 s | 0 |

**Stress test in the lab.** If each earlier showing makes a yes 60% less likely, then at 1,000 members the rules above still beat the same stress on today's rule: 9% more matches at 50% men and 73% more at 65%. Five-a-day barely moves. Halving how long people stay and cutting how often they open lowers matches a lot, but not coverage. Nobody yet knows how real people will react.

## What the lab found

45 days, 2 seeds, 2 tastes, a yes waits 7 days.

| City | Today: five / empty | Rules above: five / empty | Cards new / seen once / seen more | Most-seen on the scarce side, different people per week |
|---:|---:|---:|---:|---:|
| 300, 50% men | 39% / 16% | 79% / 7% | 30 / 20 / 50 | about 26 |
| 1,000, 50% men | 77% / 6% | 91% / 2% | 59 / 17 / 24 | about 38 |
| 1,000, 65% men | 30% / 7% | 89% / 3% | 54 / 21 / 24 | 100 men |
| 1,000, 65% women | 33% / 6% | 90% / 3% | 55 / 21 / 24 | 83 women |
| 3,000, 65% men | 33% / 2% | 96% / 1% | 82 / 9 / 9 | 135 men |

The last column is the 95th percentile. Empty means a set of zero.

**The founder's point holds: a repeat beats nothing.** Every repeat rule, five / empty, all with the one-way top-up:

| City | No repeats | Up to 2 showings | Up to 3 showings | No limit, 7 days apart | No limit, 3 days apart | No limit, next day |
|---:|---:|---:|---:|---:|---:|---:|
| 300, 50% men | 22% / 51% | 39% / 32% | 51% / 24% | 52% / 19% | 69% / 11% | **79% / 7%** |
| 1,000, 50% men | 60% / 22% | 78% / 12% | 84% / 9% | 84% / 7% | 89% / 4% | **91% / 2%** |
| 1,000, 65% men | 51% / 26% | 71% / 15% | 78% / 11% | 77% / 9% | 84% / 5% | **89% / 3%** |
| 3,000, 65% men | 82% / 10% | 90% / 6% | 92% / 4% | 91% / 3% | 94% / 2% | **96% / 1%** |

Repeating only people seen once is much better than no repeats, but a closed city soon runs out of them, so the rule above lets the order keep going rather than stopping there.

Share of days in the pool with a new match, and of days the member opened the app and got one:

| Rule | 1,000, 50% men | 1,000, 65% men | 3,000, 65% men |
|---|---:|---:|---:|
| Today | 8%, 22% | 6%, 17% | 8%, 20% |
| Rules above | 10%, 25% | 12%, 25% | 14%, 28% |
| Plus 5 picks, no limit on open connections | 12%, 28% | 15%, 32% | 19%, 37% |
| Plus everyone opening daily | 32%, 41% | 32%, 40% | 40%, 50% |

Known limits of these numbers: a waiting yes counts towards history and weekly audience only once its set is opened, while ordinary cards count when dealt. "No repeats" exempts a waiting yes, so up to 1% of those cards are repeats. Weekly match rates are not quoted, because that measure still drops people who become full mid-week.

## What cannot be done

- **Five for literally everyone.** Someone whose filters allow two people cannot get five, and a small city runs out. Filters explain about 1% of days at 3,000, 4-6% at 1,000 and 11% at 300.
- **A match on 75% of days.** No tested option reached it. It needs about 1 card in 4 to become a match, against about 1 in 60 today, and about 22 new matches a month per person, against five open connections and a limited number of compatible people.

## Plan

Done: the stress test, a permanent second pass, next-day repeats, one-way cards and waiting yeses (`league_returns`, `league_deliver_returns`, `league_deal_topup`, `playOneWay`), and the manifesto. Building it also removed a trigger that held every pair apart for about 10 days or more after being shown, whatever `repeat_gap_days` said.

Still to do:

1. **Release the app and website,** so members can see the kind close, Halal Bot, leaving questions and the under-three message. Until then they are on the old screens, which still work.
2. **Launch city by city.** Publish the daily number by cause, repeat share, weekly audience and short-day streaks.
3. **Replace the guesses.** Measure real yes rates and open rates, then reset the match target.

## On real servers

A throwaway Supabase project on the smallest instance, through real cron, Edge, PostgREST and Auth (`scripts/backend-sim/hosted.mts`):

- **1,000 members, 65% men:** 1,000 of 1,000 sets with five, no failed jobs, no retries, about 2-4 minutes.
- **A worker that dies:** 2 jobs abandoned mid-lease were picked up after it ran out, and the day finished full.
- **12 overlapping calls:** all fine, nothing duplicated. A wrong secret gets a 403.
- **12 members passing twice while submitting at once:** each pass counted once.
- **The whole path:** yes, wait, delivered, answered, match, through real sign-ins.
- **5,000 members:** did not finish in 13 minutes on the final settings. Two functions hit the Edge worker limit and five commits hit their statement timeout. Nothing failed outright and it kept progressing, but **anything above about 1,000 in one country is unproven on the smallest instance.** Retest before a city nears 3,000, and expect to need a bigger instance.

The upgrade was also rehearsed on a local copy of production's data (`scripts/backend-sim/rehearse-upgrade.mts`).

## As it grows

Sol's planning thresholds, not measurements:

- **Done:** make-up waves cut from five to one and tables from 1,000 to 500 people, after real Edge workers ran out of CPU on bigger tables.
- **Bulk changes:** any single statement touching thousands of `pair_exposure` rows runs out of Postgres lock slots on a small instance, because each row takes locks. Batch them.
- **Before about 100,000 active members:** limit delivery by queued rows rather than recipients, and batch the day's dealing, cleanup and notifications.
- **At large country pools:** the schedule gets slow at discovering people, about 20 days to cover everyone at 100,000 in one country and 200 at 1,000,000. Add targeted candidate search when coverage or quality slips.
- **Before 1,000,000:** plan how to keep pair history small, preserving permanent exclusions, and split the day into regional batches.

Watch full-set rates and short-day streaks, and also opening, repeat acceptance, conversations and yeses expiring unseen. If sets stay full while those get worse, filling seats has stopped serving the product.

## Founder decisions, made 2026-11-05

- **Exposure accepted, both ways round.** In a crowded city the most-seen women may be seen by about 100-135 different men a week, and the same for men if women are the crowded side.
- **Repeats accepted.** In a 300-member city half of all cards would be people seen at least twice before, and a quarter at 1,000.
- **A second pass closes a pair for good.**
