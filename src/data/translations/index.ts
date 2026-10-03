import type { AppLocale } from '@/i18n/locales';
// Relative throughout: the tests load the list files directly and do not
// resolve '@/'.
import type { CatalogGroup } from '../catalogOption';
import { am } from './am';
import { bn } from './bn';
import { es } from './es';
import { fa } from './fa';
import { fr } from './fr';
import { ha } from './ha';
import { hi } from './hi';
import { id } from './id';
import { ms } from './ms';
import { ru } from './ru';
import { so } from './so';
import { tr } from './tr';
import type { ListTranslations } from './types';
import { ur } from './ur';
import { zhHans } from './zh-Hans';

/** Every language other than English and Arabic, which live in the lists. */
export const LIST_TRANSLATIONS: Partial<Record<AppLocale, ListTranslations>> = {
  ur, fa, hi, id, ms, bn, fr, tr, ha, am, so, es, ru, 'zh-Hans': zhHans,
};

type Namespace = 'occupations' | 'education' | 'cities';
const GROUP_NAMESPACE = {
  occupations: 'occupationGroups',
  education: 'educationGroups',
  cities: null,
} as const;

/**
 * Hangs every language's label on each entry of a list, once, when the list
 * loads. After this, `optionLabel` finds any language on the entry itself, so
 * no screen that shows a list needs to know where translations come from.
 */
export function attachListTranslations(groups: readonly CatalogGroup[], namespace: Namespace): void {
  const groupNamespace = GROUP_NAMESPACE[namespace];
  for (const [locale, lists] of Object.entries(LIST_TRANSLATIONS) as [AppLocale, ListTranslations][]) {
    const optionLabels = lists[namespace] ?? {};
    const groupLabels = groupNamespace ? lists[groupNamespace] : {};
    for (const group of groups) {
      const groupLabel = groupLabels[group.id];
      if (groupLabel) (group.t ??= {})[locale] = groupLabel;
      for (const option of group.options) {
        const label = optionLabels[option.id];
        if (label) (option.t ??= {})[locale] = label;
      }
    }
  }
}

/** A conversation question in the given language, if it has been translated. */
export function questionTranslation(questionId: string, locale: AppLocale): string | undefined {
  return LIST_TRANSLATIONS[locale]?.questions[questionId];
}

/** The suggested first lines in the given language, or undefined for English and Arabic. */
export function openersFor(locale: AppLocale): string[] | undefined {
  return LIST_TRANSLATIONS[locale]?.openers;
}
