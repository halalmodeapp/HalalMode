import { useCallback } from 'react';

import { useI18n } from '@/i18n';
import type { AppLocale } from '@/i18n/locales';
import { ENGLISH_COPY, ENGLISH_ONLY_NOTE, type CardsCopyKey } from './copyStrings';
import { CARDS_TRANSLATIONS } from './translations';

export { ENGLISH_COPY, type CardsCopyKey };

/**
 * Halal Cards' interface copy. A language Halal Cards has been translated into
 * (src/halalCards/translations) gets its own copy, laid out in its own
 * direction; any other language sees English, left to right, with one note in
 * its own language saying so. Missing lines always fall back to English.
 */
export function cardsCopy(language: AppLocale, key: CardsCopyKey, params?: Record<string, string | number>): string {
  const translated = CARDS_TRANSLATIONS[language]?.copy[key];
  let message: string =
    translated ?? (key === 'englishNote' ? ENGLISH_ONLY_NOTE[language] : undefined) ?? ENGLISH_COPY[key];
  for (const [name, value] of Object.entries(params ?? {})) {
    message = message.replaceAll(`{{${name}}}`, String(value));
  }
  return message;
}

export function useCardsCopy() {
  const { language } = useI18n();
  return useCallback(
    (key: CardsCopyKey, params?: Record<string, string | number>) => cardsCopy(language, key, params),
    [language]
  );
}
