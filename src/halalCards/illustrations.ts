import type { ImageSourcePropType } from 'react-native';

/**
 * Generated illustrations, by image slot id. Empty until pictures are made.
 *
 * To add one: generate it from the slot's prompt (`fullPrompt` in
 * content/images.ts places the scene into the Halal Mode illustration
 * system; docs/halal-cards-illustrations.json lists them all), save it under
 * assets/halal-cards/<slot id>.webp, and register it here:
 *
 *   'adv-ramadan-friday': require('../../assets/halal-cards/adv-ramadan-friday.webp'),
 *
 * Any slot without an entry shows the drawn placeholder.
 */
export const ILLUSTRATIONS: Partial<Record<string, ImageSourcePropType>> = {
  'hub-hero': require('../../assets/halal-cards/hub-hero.webp'),
  'guide-hero': require('../../assets/halal-cards/guide-hero.webp'),
  'lab-zero-cover': require('../../assets/halal-cards/lab-zero-cover.webp'),
  'lab-one-cover': require('../../assets/halal-cards/lab-one-cover.webp'),
  'lab-two-cover': require('../../assets/halal-cards/lab-two-cover.webp'),
  'lab-three-cover': require('../../assets/halal-cards/lab-three-cover.webp'),
  'quiz-know-me-cover': require('../../assets/halal-cards/quiz-know-me-cover.webp'),
  'quiz-guess-cover': require('../../assets/halal-cards/quiz-guess-cover.webp'),
  'quiz-money-cover': require('../../assets/halal-cards/quiz-money-cover.webp'),
  'quiz-family-cover': require('../../assets/halal-cards/quiz-family-cover.webp'),
  'quiz-expect-cover': require('../../assets/halal-cards/quiz-expect-cover.webp'),
  'quiz-future-cover': require('../../assets/halal-cards/quiz-future-cover.webp'),
  'quiz-affection-cover': require('../../assets/halal-cards/quiz-affection-cover.webp'),
  'quiz-likely-cover': require('../../assets/halal-cards/quiz-likely-cover.webp'),
  'quiz-wyr-cover': require('../../assets/halal-cards/quiz-wyr-cover.webp'),
  'adv-ramadan-cover': require('../../assets/halal-cards/adv-ramadan-cover.webp'),
  'adv-1142-cover': require('../../assets/halal-cards/adv-1142-cover.webp'),
  'adv-offer-cover': require('../../assets/halal-cards/adv-offer-cover.webp'),
  'concept-practice-cover': require('../../assets/halal-cards/concept-practice-cover.webp'),
  'concept-mahr-cover': require('../../assets/halal-cards/concept-mahr-cover.webp'),
};
