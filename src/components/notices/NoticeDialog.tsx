import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { fetchMyNotices, markMyNoticesSeen, type NoticeKind } from '@/api/notices';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import { queryKeys } from '@/lib/queryClient';
import { RTL_LAYOUT } from '@/lib/rtl';
import { color, radius, shadow, space } from '@/theme/tokens';

const WORDING: Record<NoticeKind, { title: TranslationKey; body: TranslationKey }> = {
  report_actioned: { title: 'notice.reportTitle', body: 'notice.reportActioned' },
  report_reviewed: { title: 'notice.reportTitle', body: 'notice.reportReviewed' },
  photo_removed: { title: 'notice.photoTitle', body: 'notice.photoRemoved' },
};

/**
 * One moderation notice at a time, oldest first: what came of a member's
 * report, or that one of their photos was removed. Never says what happened
 * to anyone else.
 */
export function NoticeDialog() {
  const { t, isRTL } = useI18n();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const notices = useQuery({ queryKey: queryKeys.notices, queryFn: fetchMyNotices, refetchOnWindowFocus: true });
  const notice = notices.data?.[0];
  if (!notice) return null;
  const wording = WORDING[notice.kind];

  const dismiss = () => {
    queryClient.setQueryData(queryKeys.notices, notices.data?.slice(1) ?? []);
    void markMyNoticesSeen([notice.id]).catch(() => undefined);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View accessibilityViewIsModal entering={reducedMotion ? undefined : FadeIn.duration(160)} style={styles.scrim}>
        <Animated.View
          key={notice.id}
          accessible
          accessibilityRole="alert"
          entering={reducedMotion ? undefined : FadeInUp.duration(200)}
          style={[styles.card, isRTL && styles.rtl]}
        >
          <Text variant="displaySmall" center>{t(wording.title)}</Text>
          <Text variant="bodySmall" center style={styles.body}>{t(wording.body)}</Text>
          <View style={styles.stack}>
            <Button label={t('notice.ok')} onPress={dismiss} style={styles.action} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  scrim: { flex: 1, backgroundColor: 'rgba(10,10,10,0.4)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    paddingVertical: space.xxl,
    paddingHorizontal: space.gutterWide,
    maxWidth: 320,
    width: '100%',
    alignSelf: 'center',
    ...shadow.modal,
  },
  body: { marginTop: space.sm, marginBottom: space.lg, color: color.muted },
  stack: { alignSelf: 'stretch' },
  action: { alignSelf: 'stretch' },
});
