import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { sendMessage } from '@/api/connections';
import { PremiumLogo } from '@/components/brand/PremiumLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { CATALOGUE_COUNTS } from '@/halalCards/content';
import { useCardsCopy } from '@/halalCards/copy';
import { USE_MOCKS } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { space } from '@/theme/tokens';
import { SurfaceToneProvider } from '@/theme/tone';

/**
 * Shown when neither member has unlocked Halal Cards. Everything stays
 * browsable; only starting a shared session needs Premium. Never a dead end:
 * there is always a preview to try alone, and a way to ask the match, who may
 * have Premium, to start one.
 */
export function PremiumGate({
  partnerName,
  connectionId,
  onTrySolo,
}: {
  partnerName: string;
  connectionId: string;
  onTrySolo?: () => void;
}) {
  const copy = useCardsCopy();
  const { setTier } = useSession();
  const [asked, setAsked] = useState(false);
  const ask = useMutation({
    mutationFn: () => sendMessage(connectionId, copy('askMessage')),
    onSuccess: () => setAsked(true),
  });
  // There is no production purchase SDK or transaction handler yet. A remote
  // flag must not expose a purchase button that only routes to an unavailable
  // screen. Test builds keep their local demo switch.
  const canBuy = USE_MOCKS;

  return (
    <Card tone="dark" style={styles.card}>
      <SurfaceToneProvider tone="dark">
        <PremiumLogo width={150} />
        <View style={styles.text}>
          <Text variant="displaySmall">{canBuy ? copy('premiumTitle') : copy('premiumSoon')}</Text>
          <Text variant="bodySmall">
            {canBuy ? copy('premiumBody', { name: partnerName }) : copy('premiumSoonBody', { name: partnerName })}
          </Text>
          <Text variant="bodySmall">{copy('premiumIncludes', CATALOGUE_COUNTS)}</Text>
        </View>
        {canBuy ? (
          <Button
            label={copy('premiumCta')}
            variant="onDark"
            // Demo builds can switch Premium on locally; a real build opens the
            // membership card in Settings, where purchases live.
            onPress={() => (USE_MOCKS ? setTier('premium') : router.push('/settings' as never))}
          />
        ) : null}
        {onTrySolo ? <Button label={copy('trySolo')} variant={canBuy ? 'quiet' : 'onDark'} onPress={onTrySolo} /> : null}
        <Button
          label={asked ? copy('askSent') : copy('askPartner', { name: partnerName })}
          variant="quiet"
          disabled={asked || ask.isPending}
          onPress={() => ask.mutate()}
        />
      </SurfaceToneProvider>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  text: { gap: space.sm },
});
