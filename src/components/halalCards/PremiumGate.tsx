import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PremiumLogo } from '@/components/brand/PremiumLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { USE_MOCKS } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { space } from '@/theme/tokens';
import { SurfaceToneProvider } from '@/theme/tone';

/**
 * Shown when neither member has unlocked Halal Cards. Everything stays
 * browsable; only starting a shared session needs Premium.
 */
export function PremiumGate({ partnerName }: { partnerName: string }) {
  const copy = useCardsCopy();
  const { setTier } = useSession();
  return (
    <Card tone="dark" style={styles.card}>
      <SurfaceToneProvider tone="dark">
        <PremiumLogo width={150} />
        <View style={styles.text}>
          <Text variant="displaySmall">{copy('premiumTitle')}</Text>
          <Text variant="bodySmall">{copy('premiumBody', { name: partnerName })}</Text>
        </View>
        <Button
          label={copy('premiumCta')}
          variant="onDark"
          // Demo builds can switch Premium on locally; a real build goes to the
          // membership card, where purchases live.
          onPress={() => (USE_MOCKS ? setTier('premium') : router.push('/(tabs)/you'))}
        />
      </SurfaceToneProvider>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  text: { gap: space.sm },
});
