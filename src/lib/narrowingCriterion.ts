import type { TranslationKey } from '@/i18n/catalog';
import { normalizeNarrowingCriterion, type NarrowingCriterion } from '@/lib/dailyRoundState';

const NARROWING_CRITERION_KEYS: Record<NarrowingCriterion, TranslationKey> = {
  age: 'filters.ageRange',
  height: 'filters.heightPlain',
  build: 'filters.bodyTypes',
  distance: 'filters.searchDistance',
  practice: 'filters.practice',
  timeline: 'filters.marriageTiming',
  children: 'filters.children',
  sect: 'filters.sect',
  countries: 'filters.countries',
};

/** The words for a member's own choice the server named, or null if it named none it should have. */
export function narrowingCriterionKey(value: unknown): TranslationKey | null {
  const criterion = normalizeNarrowingCriterion(value);
  return criterion ? NARROWING_CRITERION_KEYS[criterion] : null;
}
