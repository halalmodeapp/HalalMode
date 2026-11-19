export const dailyRoundStatuses = [
  'ready',
  'profile_not_ready',
  'no_suitable_introductions',
  'waiting_for_first_set',
  // Part of today's matching failed, so the set is short through no fault of the member's.
  'set_incomplete',
  'matching_inputs_unavailable',
  'awaiting_turn',
  // A set that exists and has not opened yet. Rounds open at each member's own
  // Fajr, so between being built and being seen there is a real, ordinary wait
  // that is not any kind of problem, unlike every other status here.
  'next_set_scheduled',
  // Today's set has been chosen. Kept on the server so a reload cannot turn
  // "you chose" into "we found nobody".
  'set_complete',
  'at_match_capacity',
  'filters_too_narrow',
  'legal_consent_required',
  // Someone chose or answered questions for this member, who has not done theirs.
  // No set is shown until they have.
  'answers_owed',
] as const;

export type DailyRoundStatus = (typeof dailyRoundStatuses)[number];

/**
 * Criteria the server may name as the costliest must-have. Anything else is
 * discarded rather than rendered, so a malformed response cannot put arbitrary
 * text in front of a member.
 */
export const mustHaveCriteria = [
  'age', 'height', 'build', 'distance', 'practice', 'timeline', 'children', 'sect', 'countries',
  'has_children', 'occupations', 'languages', 'education', 'dress', 'ethnicities', 'heritage', 'grew_up', 'diet',
] as const;

export type NarrowingCriterion = (typeof mustHaveCriteria)[number];

export function normalizeNarrowingCriterion(value: unknown): NarrowingCriterion | null {
  return typeof value === 'string'
    && (mustHaveCriteria as readonly string[]).includes(value)
    ? value as NarrowingCriterion
    : null;
}
export type DailyRoundEmptyReason = Exclude<DailyRoundStatus, 'ready'>;

/**
 * Treat an unknown server value as the least revealing empty state. This keeps
 * an older or malformed response from implying that another member exists or
 * that a particular private preference caused the empty round.
 */
export function normalizeDailyRoundStatus(value: unknown): DailyRoundStatus {
  return typeof value === 'string'
    && (dailyRoundStatuses as readonly string[]).includes(value)
    ? value as DailyRoundStatus
    : 'no_suitable_introductions';
}

/** The least the presentation needs to know about a round. */
export type DailyRoundCards = { introductions: readonly unknown[] };

export type DailyPresentation<R extends DailyRoundCards = DailyRoundCards> =
  | { kind: 'loading' }
  | { kind: 'fetch-error' }
  | { kind: 'owed-list' }
  | { kind: 'profile-readiness' }
  | { kind: 'consent' }
  | { kind: 'server-complete' }
  | { kind: 'scheduled' }
  | { kind: 'filters-too-narrow'; criterion: NarrowingCriterion }
  | { kind: 'empty-state'; reason: 'awaiting-turn' | 'at-capacity' | 'matching-inputs' }
  | { kind: 'first-set' }
  | { kind: 'incomplete' }
  | { kind: 'generic-wait' }
  | { kind: 'local-complete' }
  | { kind: 'live-cards'; round: R };

export type DailyPresentationInput<R extends DailyRoundCards> = {
  isLoading: boolean;
  conductReady: boolean;
  hasFetchError: boolean;
  round: R | null | undefined;
  emptyReason: DailyRoundEmptyReason | null;
  owedCount: number;
  profileReady?: boolean;
  narrowingCriterion: NarrowingCriterion | null;
  submitted: boolean;
};

/**
 * Resolve the Daily screen before choosing a renderer. Order is intentional:
 * a usable owed list wins first, readiness is only a gate without cards,
 * consent can override cards, and server completion is only for an empty set.
 */
export function resolveDailyPresentation<R extends DailyRoundCards>(
  input: DailyPresentationInput<R>
): DailyPresentation<R> {
  const cards = input.round && input.round.introductions.length > 0 ? input.round : null;
  if (input.isLoading || !input.conductReady) return { kind: 'loading' };
  if (input.hasFetchError) return { kind: 'fetch-error' };
  if (input.emptyReason === 'answers_owed' && input.owedCount > 0) return { kind: 'owed-list' };

  if (
    !cards
    && (input.emptyReason === 'profile_not_ready' || input.profileReady === false)
  ) {
    return { kind: 'profile-readiness' };
  }

  if (input.emptyReason === 'legal_consent_required') return { kind: 'consent' };
  if (!cards && input.emptyReason === 'set_complete') return { kind: 'server-complete' };

  if (!cards) {
    if (input.emptyReason === 'next_set_scheduled') return { kind: 'scheduled' };
    if (input.emptyReason === 'filters_too_narrow' && input.narrowingCriterion) {
      return { kind: 'filters-too-narrow', criterion: input.narrowingCriterion };
    }
    if (input.emptyReason === 'awaiting_turn') {
      return { kind: 'empty-state', reason: 'awaiting-turn' };
    }
    if (input.emptyReason === 'at_match_capacity') {
      return { kind: 'empty-state', reason: 'at-capacity' };
    }
    if (input.emptyReason === 'matching_inputs_unavailable') {
      return { kind: 'empty-state', reason: 'matching-inputs' };
    }
    if (input.emptyReason === 'waiting_for_first_set') return { kind: 'first-set' };
    if (input.emptyReason === 'set_incomplete') return { kind: 'incomplete' };
    return { kind: 'generic-wait' };
  }

  if (input.submitted) return { kind: 'local-complete' };
  return { kind: 'live-cards', round: cards };
}
