import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { askPhotoCoach, fetchPhotoCoach } from '@/api/photoCoach';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { showNotice } from '@/lib/notice';
import { queryKeys } from '@/lib/queryClient';
import { RTL_LAYOUT } from '@/lib/rtl';
import { useSession } from '@/state/session';
import { alpha, color, radius, space } from '@/theme/tokens';

/**
 * Halal Bot: honest, gentle advice on the member's own photos, only when they ask. The first look covers
 * every photo. After that each new photo uses one of three free looks, and Premium has no such limit.
 */
export function PhotoCoachCard() {
  const { t, isRTL } = useI18n();
  const { language } = useSession();
  const queryClient = useQueryClient();
  const coach = useQuery({ queryKey: queryKeys.photoCoach, queryFn: fetchPhotoCoach });
  const ask = useMutation({
    mutationFn: () => askPhotoCoach(language),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.photoCoach }),
    onError: () => showNotice(t('coach.title'), t('coach.error')),
  });
  const state = coach.data;
  if (!state) return null;

  const canAsk = state.unreviewed > 0 && (state.firstLookFree || state.premium || state.freeLooksLeft > 0);
  const usedUp = state.unreviewed > 0 && !canAsk;

  return (
    <View style={[styles.card, isRTL && styles.rtl]}>
      <Text variant="label">{t('coach.title')}</Text>
      <Text variant="caption" style={styles.soft}>{t('coach.body')}</Text>
      {state.reviews.map((review) => (
        <View key={review.photo} style={styles.review}>
          <Text variant="label">{t('coach.photo', { number: review.position })}</Text>
          <Text variant="bodySmall">{review.advice.summary}</Text>
          {review.advice.tips.map((tip) => (
            <Text key={tip} variant="bodySmall" style={styles.soft}>{`• ${tip}`}</Text>
          ))}
        </View>
      ))}
      {canAsk ? (
        <Button
          label={ask.isPending ? t('coach.asking') : t('coach.ask')}
          disabled={ask.isPending}
          onPress={() => ask.mutate()}
        />
      ) : null}
      {canAsk && !state.firstLookFree && !state.premium ? (
        <Text variant="caption" style={styles.soft}>{t('coach.left', { count: state.freeLooksLeft })}</Text>
      ) : null}
      {usedUp ? <Text variant="caption" style={styles.soft}>{t('coach.usedUp')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.md, padding: space.md, gap: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: alpha.line, backgroundColor: color.sand },
  rtl: RTL_LAYOUT,
  soft: { color: color.inkSoft },
  review: { gap: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: alpha.line },
});
