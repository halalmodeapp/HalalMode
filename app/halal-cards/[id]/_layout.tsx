import { Stack } from 'expo-router';

import { color } from '@/theme/tokens';

/** Halal Cards for one connection: hub → activity → play, and the guide. */
export default function HalalCardsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.surface },
        animation: 'slide_from_right',
      }}
    />
  );
}
