import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ProfileImage } from '@/components/ui/ProfileImage';
import { getProfilePhotoSource } from '@/data/demoProfilePhotos';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { askPhotoCoach, fetchPhotoCoach } from '@/api/photoCoach';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { showNotice } from '@/lib/notice';
import { queryKeys } from '@/lib/queryClient';
import { USE_MOCKS } from '@/lib/supabase';
import { RTL_LAYOUT } from '@/lib/rtl';
import { useSession } from '@/state/session';
import { alpha, color, radius, space } from '@/theme/tokens';

/**
 * Halal Bot: honest, gentle advice on the member's own photos, only when they ask. The first look covers
 * the active gallery. Each successful session uses one free allowance.
 */
export function PhotoCoachCard({ photoPaths }: { photoPaths: string[] }) {
  const { t, isRTL } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const [takingLonger, setTakingLonger] = useState(false);
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ width: (progress.value + '%') as `${number}%` }));
  const { language, tier } = useSession();
  const demoPremium = tier === 'premium';
  const queryClient = useQueryClient();
  const coach = useQuery({
    queryKey: USE_MOCKS ? [...queryKeys.photoCoach, photoPaths, tier] : queryKeys.photoCoach,
    queryFn: () => fetchPhotoCoach(photoPaths, demoPremium),
  });
  const ask = useMutation({
    mutationFn: () => askPhotoCoach(language, photoPaths, demoPremium),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.photoCoach }),
    onError: (error) => {
      const key = error.message === 'premium_required' ? 'coach.usedUp'
        : error.message === 'in_progress' ? 'coach.stillAnalyzing'
        : error.message === 'fair_use' ? 'coach.tryTomorrow' : 'coach.error';
      showNotice(t('coach.title'), t(key));
    },
  });
  useEffect(() => {
    if (!ask.isPending) {
      progress.value = 0;
      return;
    }
    progress.value = reducedMotion ? 35 : withTiming(90, { duration: 15_000, easing: Easing.out(Easing.quad) });
    const timer = setTimeout(() => setTakingLonger(true), 15_000);
    return () => clearTimeout(timer);
  }, [ask.isPending, progress, reducedMotion]);
  const state = coach.data;
  if (!state) return null;

  const canAsk = state.unreviewed > 0 && (state.premium || state.freeLooksLeft > 0);
  const usedUp = state.unreviewed > 0 && !canAsk;

  return (
    <View style={[styles.card, isRTL && styles.rtl]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(expanded ? 'coach.minimize' : 'coach.expand')}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(current => !current)}
        style={[styles.header, isRTL && styles.reverse]}
      >
        <Text variant="label" style={styles.title}>{t('coach.title')}</Text>
        <Text variant="caption" style={styles.soft}>{t(expanded ? 'coach.minimize' : 'coach.expand')}</Text>
      </Pressable>
      {ask.isPending ? (
        <View accessibilityLiveRegion="polite">
          <Text variant="caption" style={styles.soft}>{t(takingLonger ? 'coach.stillAnalyzing' : 'coach.asking')}</Text>
          <View style={styles.track} accessibilityRole="progressbar">
            <Animated.View style={[styles.fill, fill]} />
          </View>
        </View>
      ) : null}
      {expanded ? (
        <View style={styles.details}>
          <Text variant="caption" style={styles.soft}>{t('coach.body')}</Text>
          {state.reviews.map((review) => (
            <View key={review.photo} style={styles.review}>
              <View style={[styles.photoLabel, isRTL && styles.reverse]}>
                <ReviewThumbnail path={review.photo} />
                <Text variant="label">{t('coach.photo', { number: review.position })}</Text>
              </View>
              <Text variant="bodySmall">{review.advice.summary}</Text>
              {review.advice.tips.map((tip) => (
                <Text key={tip} variant="bodySmall" style={styles.soft}>{`• ${tip}`}</Text>
              ))}
            </View>
          ))}
          {canAsk ? (
            <Button
              label={t(ask.isPending ? 'coach.asking' : state.firstLookFree ? 'coach.ask' : 'coach.reanalyze')}
              disabled={ask.isPending}
              onPress={() => { setTakingLonger(false); ask.mutate(); }}
            />
          ) : null}
          {!state.premium && state.freeLooksLeft > 0 ? (
            <Text variant="caption" style={styles.soft}>{t('coach.left', { count: state.freeLooksLeft })}</Text>
          ) : null}
          {state.unreviewed === 0 && state.reviews.length > 0 ? (
            <Text variant="caption" style={styles.soft}>{t('coach.upToDate')}</Text>
          ) : null}
          {usedUp ? (
            <View style={styles.details}>
              <Text variant="caption" style={styles.soft}>{t('coach.usedUp')}</Text>
              <Button label={t('settings.premium')} variant="secondary" onPress={() => router.push('/settings' as never)} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ReviewThumbnail({ path }: { path: string }) {
  return <ProfileImage source={getProfilePhotoSource('', [path])} storagePath={path}
    style={styles.thumb} contentFit="cover" accessible={false} />;
}

const styles = StyleSheet.create({
  card: { marginTop: space.md, padding: space.md, gap: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: alpha.line, backgroundColor: color.sand },
  rtl: RTL_LAYOUT,
  reverse: { flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: space.sm },
  title: { flex: 1 },
  details: { gap: space.sm },
  photoLabel: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  thumb: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: color.sandDeep },
  track: { height: 4, marginTop: space.xs, borderRadius: radius.pill, backgroundColor: color.sandDeep, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.ink, borderRadius: radius.pill },
  soft: { color: color.inkSoft },
  review: { gap: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: alpha.line },
});
