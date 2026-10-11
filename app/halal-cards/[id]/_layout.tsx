import { Stack } from 'expo-router';

import { LeftToRight } from '@/i18n';
import { color } from '@/theme/tokens';

/**
 * Halal Cards for one connection: hub → section → activity → play, the solo
 * preview, and the Shared Journal.
 *
 * Its stories and lessons exist in English only for now, so the whole stack
 * is laid out left to right in Latin type in every app language — otherwise
 * English sentences pick up the Arabic face and right alignment. The hub says
 * so in the member's own language.
 */
export default function HalalCardsLayout() {
  return (
    <LeftToRight>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.surface },
          animation: 'slide_from_right',
        }}
      />
    </LeftToRight>
  );
}
