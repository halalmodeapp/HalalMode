import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { fetchMyProfileReadiness } from '@/api/profile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { color } from '@/theme/tokens';

/**
 * Shown on Connections once a member has a match and still has optional
 * answers left: the questions that used to stand in the way of sign-up are
 * asked now, when there is somebody to share them with.
 */
export function CompleteProfileNudge({ hasMatch }: { hasMatch: boolean }) {
  const { t } = useI18n();
  const readiness = useQuery({ queryKey: queryKeys.profileReadiness, queryFn: fetchMyProfileReadiness, enabled: hasMatch });
  if (!hasMatch || (readiness.data?.recommended ?? []).length === 0) return null;
  return (
    <Card tone="filled" style={styles.card}>
      <Text variant="label">{t('readiness.nudgeTitle')}</Text>
      <Text variant="caption" style={styles.body}>{t('readiness.nudgeBody')}</Text>
      <Button label={t('readiness.nudgeCta')} variant="secondary" onPress={() => router.push('/(tabs)/you')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  body: { color: color.inkSoft },
});
