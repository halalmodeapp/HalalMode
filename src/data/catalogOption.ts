import type { AppLocale } from '@/i18n/locales';

/**
 * A choice a member picks from a fixed list.
 *
 * The `id` is what the database stores and what matching will one day compare;
 * `en` and `ar` are only ever for reading. Storing the id rather than the words
 * is the whole point of these lists: "Actor" and "Thespian" and "actorr" are
 * one person to a matcher, and a member who switches the app to Arabic should
 * not find their own profession has become a foreign word.
 *
 * The wording lives here rather than in the translation catalog on purpose.
 * Two hundred professions would be two hundred keys per language in a file
 * whose job is interface copy, and the pairing between a term and its
 * translation would be split across two places. The cost is that a third
 * language means editing these files too, which is noted in `locales.ts`.
 */
export interface CatalogOption {
  /** Stable, stored, never shown. */
  id: string;
  en: string;
  ar: string;
}

export interface CatalogGroup {
  id: string;
  en: string;
  ar: string;
  options: readonly CatalogOption[];
}

export function optionLabel(option: CatalogOption, language: AppLocale): string {
  return language === 'ar' ? option.ar : option.en;
}

/** Every option across every group, flattened once for lookups. */
export function flattenGroups(groups: readonly CatalogGroup[]): readonly CatalogOption[] {
  return groups.flatMap((group) => group.options);
}

export function findOption(
  groups: readonly CatalogGroup[],
  id: string | null | undefined,
): CatalogOption | undefined {
  if (!id) return undefined;
  for (const group of groups) {
    const found = group.options.find((option) => option.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * What to show for a stored value.
 *
 * A value that is not in the list is shown exactly as it was typed. Profiles
 * written before these lists existed hold free text, and blanking somebody's
 * profession because it predates a dropdown would be worse than showing it.
 */
export function storedLabel(
  groups: readonly CatalogGroup[],
  value: string | null | undefined,
  language: AppLocale,
): string {
  if (!value) return '';
  const found = findOption(groups, value);
  return found ? optionLabel(found, language) : value;
}

/** Strips accents and case so "Cote" finds "Côte" and "phd" finds "PhD". */
export function normaliseForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .trim();
}

/**
 * Groups filtered to the options matching a query, dropping groups left empty.
 *
 * Both languages are searched whichever one is on screen, because a member
 * reading Arabic may well know their field by its English name.
 */
export function searchGroups(
  groups: readonly CatalogGroup[],
  query: string,
): readonly CatalogGroup[] {
  const needle = normaliseForSearch(query);
  if (!needle) return groups;

  const matches: CatalogGroup[] = [];
  for (const group of groups) {
    // A group whose own name matches keeps all of its options: searching
    // "healthcare" should show what is in healthcare, not nothing.
    const groupMatches =
      normaliseForSearch(group.en).includes(needle) ||
      normaliseForSearch(group.ar).includes(needle);

    const options = groupMatches
      ? group.options
      : group.options.filter(
          (option) =>
            normaliseForSearch(option.en).includes(needle) ||
            normaliseForSearch(option.ar).includes(needle),
        );

    if (options.length > 0) matches.push({ ...group, options });
  }
  return matches;
}
