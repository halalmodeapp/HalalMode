import { useMemo } from 'react';

import { useI18n } from '@/i18n';
import type { AppLocale } from '@/i18n/locales';
import { ADVENTURES, LAB_LESSONS, QUIZZES } from './content';
import { translateActivity } from './i18n';
import { CARDS_TRANSLATIONS } from './translations';
import type { Activity, Adventure, LabLesson, Quiz } from './types';

export interface CardsContent {
  LAB_LESSONS: LabLesson[];
  QUIZZES: Quiz[];
  ADVENTURES: Adventure[];
  findActivity: (id: string) => Activity | undefined;
}

const cache = new Map<string, CardsContent>();

/**
 * The catalogue in a member's language. Ids, structure and rules never change
 * with language — only the words — so sessions stay compatible between two
 * members using different languages.
 */
export function localizedContent(language: AppLocale): CardsContent {
  const translation = CARDS_TRANSLATIONS[language]?.content;
  const cacheKey = translation ? language : 'en';
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const map = <A extends Activity>(items: A[]) => (translation ? items.map((item) => translateActivity(item, translation)) : items);
  const labs = map(LAB_LESSONS);
  const quizzes = map(QUIZZES);
  const adventures = map(ADVENTURES);
  const byId = new Map<string, Activity>([...labs, ...quizzes, ...adventures].map((item) => [item.id, item]));
  const content: CardsContent = {
    LAB_LESSONS: labs,
    QUIZZES: quizzes,
    ADVENTURES: adventures,
    findActivity: (id) => byId.get(id),
  };
  cache.set(cacheKey, content);
  return content;
}

export function useCardsContent(): CardsContent {
  const { language } = useI18n();
  return useMemo(() => localizedContent(language), [language]);
}
