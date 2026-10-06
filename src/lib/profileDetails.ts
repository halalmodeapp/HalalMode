import type { Translate } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import type { AppLocale } from '@/i18n/locales';
import { optionLabel, storedLabel } from '@/data/catalogOption';
import { EDUCATION_GROUPS } from '@/data/educationLevels';
import { HAS_CHILDREN_PROFILE, dressOptions } from '@/data/matchingOptions';
import { findEthnicity } from '@/data/ethnicities';
import { heritageName } from '@/data/heritage';
import { SECT_GROUPS } from '@/data/sects';
import { languageName } from '@/data/spokenLanguages';
import type { Profile } from '@/types';

const PRACTICE: Record<string, TranslationKey> = {
  very_practicing: 'filters.practice.very',
  practicing: 'filters.practice.practicing',
  moderate: 'filters.practice.moderate',
  learning: 'filters.practice.learning',
};
const TIMELINE: Record<string, TranslationKey> = {
  within_3_months: 'filters.timeline.3m',
  within_6_months: 'filters.timeline.6m',
  within_1_year: 'filters.timeline.1y',
  '1_to_2_years': 'filters.timeline.2y',
};
const FAMILY: Record<string, TranslationKey> = {
  wants_children_soon: 'filters.children.soon',
  wants_children_later: 'filters.children.later',
  open_to_children: 'filters.children.open',
  no_children: 'filters.children.none',
};

/**
 * A member's own answers as label/value lines, for their profile as others see
 * it. Unanswered lines, and "prefer not to say", are left out rather than shown
 * as gaps. Height, weight and body type are private and never included.
 */
export function profileDetailLines(profile: Profile, t: Translate, language: AppLocale): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];
  const add = (label: TranslationKey, value: string | undefined | null) => {
    if (value) lines.push({ label: t(label), value });
  };

  const sectId = profile.sectDetail ?? (profile.sect !== 'prefer_not_to_say' ? profile.sect : undefined);
  const sectOption = sectId ? SECT_GROUPS.flatMap((g) => g.options).find((o) => o.id === sectId) : undefined;
  add('profile.sect', sectOption ? optionLabel(sectOption, language) : undefined);
  add('profile.practice', profile.religiousPractice ? t(PRACTICE[profile.religiousPractice] ?? 'filters.practice.moderate') : undefined);
  const timing = profile.timeline ? TIMELINE[profile.timeline] : undefined;
  add('profile.timing', timing ? t(timing) : undefined);

  const children = HAS_CHILDREN_PROFILE.find((o) => o.id === profile.hasChildren && o.id !== 'prefer_not_to_say');
  add('filters.hasChildren', children ? optionLabel(children, language) : undefined);
  const family = profile.familyGoals ? FAMILY[profile.familyGoals] : undefined;
  add('filters.childrenTimeframe', family ? t(family) : undefined);

  const dress = profile.gender === 'female' ? dressOptions('female').find((o) => o.id === profile.religiousDress) : undefined;
  add('profile.dress', dress ? optionLabel(dress, language) : undefined);
  const shown = (ids: string[] | undefined) => (ids ?? []).filter((id) => id !== 'prefer_not_to_say');
  add('profile.ethnicity', shown(profile.ethnicities)
    .map((id) => { const option = findEthnicity(id); return option ? optionLabel(option, language) : id; })
    .join(', '));
  add('profile.heritage', shown(profile.heritageCountries).map((code) => heritageName(code, language)).join(', '));

  add('filters.education', profile.education ? storedLabel(EDUCATION_GROUPS, profile.education, language) : undefined);
  add('filters.languages', (profile.languagesSpoken ?? []).map((code) => languageName(code, language)).join(', '));
  return lines;
}
