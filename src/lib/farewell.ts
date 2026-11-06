import type { Translate } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';

export const FAREWELL_REASONS = ['fit', 'goals', 'timing', 'family', 'spark', 'someone', 'step_back', 'other'] as const;
export type FarewellReason = (typeof FAREWELL_REASONS)[number];

export const FAREWELL_LABELS: Record<FarewellReason, TranslationKey> = {
  fit: 'farewell.fit',
  goals: 'farewell.goals',
  timing: 'farewell.timing',
  family: 'farewell.family',
  spark: 'farewell.spark',
  someone: 'farewell.someone',
  step_back: 'farewell.stepBack',
  other: 'farewell.other',
};

export const FAREWELL_MAX = 300;

/** What the other person reads: the gentle sentence, or the member's own words inside it. */
export function farewellWords(reason: string, message: string | null | undefined, t: Translate): string {
  const key = FAREWELL_LABELS[reason as FarewellReason];
  const because = reason === 'other' && message ? message : key ? t(key) : '';
  return t('farewell.words', { reason: because });
}

export const EXIT_REASONS = ['married', 'engaged', 'met_here', 'met_elsewhere', 'no_matches', 'not_right', 'break', 'privacy', 'other'] as const;

export const EXIT_LABELS: Record<(typeof EXIT_REASONS)[number], TranslationKey> = {
  married: 'exit.married',
  engaged: 'exit.engaged',
  met_here: 'exit.metHere',
  met_elsewhere: 'exit.metElsewhere',
  no_matches: 'exit.noMatches',
  not_right: 'exit.notRight',
  break: 'exit.break',
  privacy: 'exit.privacy',
  other: 'exit.other',
};
