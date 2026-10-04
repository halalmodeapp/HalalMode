import type { CatalogGroup, CatalogOption } from './catalogOption';
import { ETHNICITY_OPTIONS, UNSTATED } from './matchingOptions';

/**
 * Ethnicity is one of two answers about background; the other is heritage
 * (countries, src/data/heritage.ts). Broad groups only, so nobody is left out
 * by a list of peoples and nationality is not mixed in: "Lebanese American" is
 * Arab, with Lebanon and the United States as heritage. Mixed heritage picks
 * two. See migration 0175.
 */
export const ETHNICITY_MAX = 2;

export const ETHNICITY_GROUPS: readonly CatalogGroup[] = [
  { id: 'group:ethnicity', en: '', ar: '', t: {}, options: ETHNICITY_OPTIONS },
];

/** On a profile, "prefer not to say" is a real answer; in a filter it is not offered. */
export const ETHNICITY_PROFILE_GROUPS: readonly CatalogGroup[] = [
  { id: 'group:ethnicity', en: '', ar: '', t: {}, options: [...ETHNICITY_OPTIONS, UNSTATED] },
];

export function findEthnicity(id: string | null | undefined): CatalogOption | undefined {
  if (!id) return undefined;
  return id === UNSTATED.id ? UNSTATED : ETHNICITY_OPTIONS.find((option) => option.id === id);
}

/**
 * "Prefer not to say" stands alone: choosing it clears the others, and
 * choosing anything else clears it.
 */
export function withUnstatedAlone(previous: readonly string[], next: string[]): string[] {
  const added = next.find((id) => !previous.includes(id));
  if (added === UNSTATED.id) return [UNSTATED.id];
  return next.filter((id) => id !== UNSTATED.id);
}
