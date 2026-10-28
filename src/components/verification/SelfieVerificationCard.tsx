import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { fetchMySelfieStatus, submitSelfie } from '@/api/selfie';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { SelfieCapture } from '@/components/verification/SelfieCapture';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { color } from '@/theme/tokens';

/**
 * Asks for a selfie from a member who has none on file, or whose last one
 * could not be verified. It says nothing once a selfie is verified, pending
 * or with a person, so most members never see it.
 */
export function SelfieVerificationCard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const status = useQuery({ queryKey: queryKeys.selfie, queryFn: fetchMySelfieStatus });
  if (status.data !== 'none' && status.data !== 'rejected') return null;

  return (
    <Card tone="filled" style={styles.card}>
      <Text variant="label">{t('selfie.cardTitle')}</Text>
      <Text variant="caption" style={styles.body}>
        {status.data === 'rejected' ? t('selfie.cardRetake') : t('selfie.cardBody')}
      </Text>
      <SelfieCapture
        onUploaded={(path) => {
          setError(null);
          void submitSelfie(path)
            .then(() => queryClient.setQueryData(queryKeys.selfie, 'pending'))
            .catch(() => setError(t('selfie.failed')));
        }}
      />
      {error ? <Text variant="bodySmall" style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 5 },
  body: { color: color.inkSoft },
  error: { color: '#A33A3A' },
});
