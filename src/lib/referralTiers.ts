/** The goals on halalmo.de/refer, and the months of Premium each one unlocks. */
export const REFERRAL_GOALS = [
  { goal: 3, months: 3 },
  { goal: 5, months: 6 },
  { goal: 10, months: 12 },
] as const;

export interface ReferralTier {
  goal: number;
  months: number;
  /** How many friends count toward this goal, capped at the goal. */
  joined: number;
  /** 0 to 1. */
  fill: number;
  /** `reached` gets a tick in gold; `current` is the next goal, in Halal Pink. */
  state: 'reached' | 'current' | 'ahead';
}

/**
 * The reward cards as progress, as on site/refer.html: each bar fills toward
 * its goal, reached goals get a tick and the first unreached one is the next
 * goal. Without a count (no link yet) every bar stays empty.
 */
export function referralTiers(count: number | null): ReferralTier[] {
  const known = count !== null && Number.isFinite(count);
  const n = known ? Math.max(0, Math.floor(count)) : 0;
  let currentFound = false;
  return REFERRAL_GOALS.map(({ goal, months }) => {
    const reached = known && n >= goal;
    let state: ReferralTier['state'] = reached ? 'reached' : 'ahead';
    if (known && !reached && !currentFound) {
      state = 'current';
      currentFound = true;
    }
    return { goal, months, joined: Math.min(n, goal), fill: known ? Math.min(1, n / goal) : 0, state };
  });
}
