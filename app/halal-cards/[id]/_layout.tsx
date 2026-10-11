import { Stack } from 'expo-router';

import { hasCardsTranslation } from '@/halalCards/translations';
import { LeftToRight, useI18n } from '@/i18n';
import { color } from '@/theme/tokens';

/**
 * Halal Cards for one connection: hub → section → activity → play, the solo
 * preview, and the Shared Journal.
 *
 * In a language Halal Cards has been translated into, it follows the app's
 * direction. In any other, it is shown in English, laid out left to right in
 * Latin type — otherwise English sentences pick up the Arabic face and right
 * alignment — and the hub says so in the member's own language.
 */
export default function HalalCardsLayout() {
  const { language } = useI18n();
  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.surface },
        animation: 'slide_from_right',
      }}
    />
  );
  // Translated: the stack follows the app's own direction. Not yet: English, left to right.
  return hasCardsTranslation(language) ? stack : <LeftToRight>{stack}</LeftToRight>;
}
