/**
 * How long each profile in a set was read, kept on the device.
 *
 * Two things use it. Before a set is sent, the profile read longest among
 * those not chosen is recorded as a soft select. With the submission, a
 * separately configured backend signal receives each profile's time rounded to
 * five seconds and capped at two minutes; raw milliseconds and visit counts
 * stay on-device, and the database discards that value whenever the signal is
 * switched off.
 */

export interface DwellRecord {
  /** The introduction, not the member, nothing here is keyed on a person. */
  introductionId: string;
  /** Total time on the profile across every visit this round. */
  totalMs: number;
  opens: number;
}

export interface DwellThresholds {
  /**
   * Below this a profile was not read, a mis-tap, or a screen opened and
   * immediately backed out of. Counted as never opened, which is what it
   * amounts to.
   */
  minMeaningfulMs: number;
}

export const DWELL_THRESHOLDS: DwellThresholds = {
  minMeaningfulMs: 1_500,
};

/**
 * Picks the profile that was read most among those let go.
 *
 * A free member keeps one of five. The person they read for longest after the
 * one they kept is not a rejection, they are a casualty of the budget, and
 * recording that as an ordinary release throws away the strongest positive
 * signal a round produces.
 *
 * It only says the member lingered, costs them nothing if it is wrong, and is
 * never shown to anyone. Two genuinely read profiles are enough for "most" to
 * have content.
 *
 * A tie returns null: if two were read equally, neither is the one, and
 * choosing by array order would be inventing it.
 */
export function inferSoftSelect(
  records: DwellRecord[],
  releasedIntroductionIds: Iterable<string>,
  thresholds: DwellThresholds = DWELL_THRESHOLDS
): string | null {
  const read = records.filter((r) => r.totalMs >= thresholds.minMeaningfulMs);
  if (read.length < 2) return null;

  const released = new Set(releasedIntroductionIds);
  const candidates = read.filter((r) => released.has(r.introductionId));
  if (!candidates.length) return null;

  let longest: DwellRecord | null = null;
  let tied = false;
  for (const record of candidates) {
    if (!longest || record.totalMs > longest.totalMs) {
      longest = record;
      tied = false;
    } else if (record.totalMs === longest.totalMs) {
      tied = true;
    }
  }
  return longest && !tied ? longest.introductionId : null;
}

/**
 * Accumulates time per profile across visits.
 *
 * Deliberately a plain object rather than a hook, so the arithmetic can be
 * tested without a renderer. The app going away is reported by the caller
 * through pause/resume rather than guessed at in here, because only the caller
 * can tell a backgrounded app from a member who is simply reading slowly.
 */
export class DwellLedger {
  private readonly totals = new Map<string, { totalMs: number; opens: number }>();
  private open: { introductionId: string; at: number } | null = null;
  private pausedOn: string | null = null;

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Banks whatever the open profile has accrued. Returns which one it was. */
  private bank(): string | null {
    if (!this.open) return null;
    const { introductionId, at } = this.open;
    const entry = this.totals.get(introductionId) ?? { totalMs: 0, opens: 0 };
    this.totals.set(introductionId, {
      totalMs: entry.totalMs + Math.max(0, this.now() - at),
      opens: entry.opens,
    });
    this.open = null;
    return introductionId;
  }

  /**
   * Opening a second profile without closing the first closes it implicitly.
   *
   * The visit is counted here rather than on the way out, because a reading
   * still open when the app goes away is a reading that happened. Counting it on
   * close meant a profile the member was on when they took a call recorded time
   * spent but zero visits.
   */
  opened(introductionId: string): void {
    this.bank();
    this.pausedOn = null;
    const entry = this.totals.get(introductionId) ?? { totalMs: 0, opens: 0 };
    this.totals.set(introductionId, { ...entry, opens: entry.opens + 1 });
    this.open = { introductionId, at: this.now() };
  }

  closed(introductionId: string): void {
    if (this.pausedOn === introductionId) this.pausedOn = null;
    if (this.open?.introductionId !== introductionId) return;
    this.bank();
    this.pausedOn = null;
  }

  /**
   * The app went away, a call, a notification, a phone put in a pocket.
   *
   * Nothing else notices this. Navigation is what closes a profile, and
   * backgrounding is not navigation, so without this the profile that happened
   * to be open keeps accruing time for as long as the app is gone. Since the
   * decision is "who was read least", an hour banked against one person moves
   * somebody else to the bottom of the set, the wrong person gets asked about.
   */
  pause(): void {
    if (this.open) this.pausedOn = this.bank();
  }

  resume(): void {
    if (!this.pausedOn) return;
    this.open = { introductionId: this.pausedOn, at: this.now() };
    this.pausedOn = null;
  }

  /** Snapshot without ending a visit, so a failed submit can retry. */
  records(): DwellRecord[] {
    if (this.open) {
      const introductionId = this.bank()!;
      this.open = { introductionId, at: this.now() };
    }
    return [...this.totals.entries()].map(([introductionId, entry]) => ({
      introductionId,
      ...entry,
    }));
  }

  clear(): void {
    this.totals.clear();
    this.open = null;
    this.pausedOn = null;
  }
}
