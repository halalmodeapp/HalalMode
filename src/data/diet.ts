import type { TranslationKey } from '@/i18n/catalog';

export type Diet = 'halal_only' | 'sometimes_non_halal' | 'vegetarian' | 'pescatarian' | 'vegan';

export const DIETS: readonly Diet[] = ['halal_only', 'sometimes_non_halal', 'vegetarian', 'pescatarian', 'vegan'];

export const DIET_KEYS: Record<Diet, TranslationKey> = {
  halal_only: 'diet.halal_only',
  sometimes_non_halal: 'diet.sometimes_non_halal',
  vegetarian: 'diet.vegetarian',
  pescatarian: 'diet.pescatarian',
  vegan: 'diet.vegan',
};

/** A member can say they grew up in up to two countries (migration 20261027100000). */
export const GREW_UP_MAX = 2;

/**
 * Adds or removes one diet. Halal only and sometimes non-halal are opposites,
 * so choosing one replaces the other; every other pair can be held together.
 */
export function toggleDiet(current: readonly string[], diet: Diet): string[] {
  if (current.includes(diet)) return current.filter((item) => item !== diet);
  const opposite = diet === 'halal_only' ? 'sometimes_non_halal' : diet === 'sometimes_non_halal' ? 'halal_only' : null;
  return [...current.filter((item) => item !== opposite), diet];
}
