import type { AppLocale } from '@/i18n/locales';
import type { CardsTranslation } from '../i18n';

/**
 * Halal Cards translations, by app language. Each is a JSON file beside this
 * one with the keys of docs/halal-cards-strings.en.json (made by
 * `npm run cards:strings`, which also checks every file here).
 *
 * To add a language once its file is complete and the check passes:
 *
 *   ar: require('./ar.json') as CardsTranslation,
 *
 * A registered language shows Halal Cards fully in that language, in its own
 * direction. Until then, members using it see English, left to right.
 */
export const CARDS_TRANSLATIONS: Partial<Record<AppLocale, CardsTranslation>> = {
  ar: require('./ar.json') as CardsTranslation,
  ur: require('./ur.json') as CardsTranslation,
  fa: require('./fa.json') as CardsTranslation,
  hi: require('./hi.json') as CardsTranslation,
  id: require('./id.json') as CardsTranslation,
  ms: require('./ms.json') as CardsTranslation,
  bn: require('./bn.json') as CardsTranslation,
  fr: require('./fr.json') as CardsTranslation,
  tr: require('./tr.json') as CardsTranslation,
  ha: require('./ha.json') as CardsTranslation,
  am: require('./am.json') as CardsTranslation,
  so: require('./so.json') as CardsTranslation,
  es: require('./es.json') as CardsTranslation,
};

export function hasCardsTranslation(language: AppLocale): boolean {
  return !!CARDS_TRANSLATIONS[language];
}
