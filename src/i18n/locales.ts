import { ar, en, type TranslationCatalog, type TranslationKey } from '@/i18n/catalog';
import { am } from '@/i18n/catalogs/am';
import { bn } from '@/i18n/catalogs/bn';
import { es } from '@/i18n/catalogs/es';
import { fa } from '@/i18n/catalogs/fa';
import { fr } from '@/i18n/catalogs/fr';
import { ha } from '@/i18n/catalogs/ha';
import { hi } from '@/i18n/catalogs/hi';
import { id } from '@/i18n/catalogs/id';
import { ms } from '@/i18n/catalogs/ms';
import { ru } from '@/i18n/catalogs/ru';
import { so } from '@/i18n/catalogs/so';
import { tr } from '@/i18n/catalogs/tr';
import { ur } from '@/i18n/catalogs/ur';
import { zhHans } from '@/i18n/catalogs/zh-Hans';
import { nextLocale } from '@/lib/localePolicy';

export type TextDirection = 'ltr' | 'rtl';

/**
 * The locale registry is the single extension point for a new language. Add a
 * complete catalog and metadata here; member-facing screens then inherit its
 * direction, BCP-47 tag, and fallback without scattered language checks.
 *
 * The same sixteen languages, in the same order, as halalmo.de. Lists such as
 * professions and cities are translated in src/data/translations.
 *
 * Tags pin the Gregorian calendar where a language's default is another one,
 * so a date reads the same in every language.
 */
export const localeRegistry = {
  en: { tag: 'en', name: 'English', direction: 'ltr', catalog: en },
  ar: { tag: 'ar-SA-u-ca-gregory', name: 'العربية', direction: 'rtl', catalog: ar },
  ur: { tag: 'ur', name: 'اردو', direction: 'rtl', catalog: ur },
  fa: { tag: 'fa-u-ca-gregory', name: 'فارسی', direction: 'rtl', catalog: fa },
  hi: { tag: 'hi', name: 'हिन्दी', direction: 'ltr', catalog: hi },
  id: { tag: 'id', name: 'Bahasa Indonesia', direction: 'ltr', catalog: id },
  ms: { tag: 'ms', name: 'Bahasa Melayu', direction: 'ltr', catalog: ms },
  bn: { tag: 'bn', name: 'বাংলা', direction: 'ltr', catalog: bn },
  fr: { tag: 'fr', name: 'Français', direction: 'ltr', catalog: fr },
  tr: { tag: 'tr', name: 'Türkçe', direction: 'ltr', catalog: tr },
  ha: { tag: 'ha', name: 'Hausa', direction: 'ltr', catalog: ha },
  am: { tag: 'am-u-ca-gregory', name: 'አማርኛ', direction: 'ltr', catalog: am },
  so: { tag: 'so', name: 'Soomaali', direction: 'ltr', catalog: so },
  es: { tag: 'es', name: 'Español', direction: 'ltr', catalog: es },
  ru: { tag: 'ru', name: 'Русский', direction: 'ltr', catalog: ru },
  'zh-Hans': { tag: 'zh-Hans', name: '简体中文', direction: 'ltr', catalog: zhHans },
} as const satisfies Record<string, {
  tag: string;
  name: string;
  direction: TextDirection;
  catalog: TranslationCatalog;
}>;

export type AppLocale = keyof typeof localeRegistry;

/** The ordered member-facing language list used by language pickers. */
export const supportedLocales = Object.keys(localeRegistry) as AppLocale[];

export function isSupportedLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && value in localeRegistry;
}

export function getLocale(locale: AppLocale) {
  return localeRegistry[locale];
}

/** A language's own name for itself, as shown in pickers. */
export function localeName(locale: AppLocale): string {
  return localeRegistry[locale].name;
}

/** Looks up one string in every catalog, for tests and tooling. */
export function messageFor(locale: AppLocale, key: TranslationKey): string {
  return localeRegistry[locale].catalog[key];
}

/** Advances compact language controls without assuming there are exactly two locales. */
export function nextSupportedLocale(locale: AppLocale): AppLocale {
  return nextLocale(supportedLocales, locale);
}
