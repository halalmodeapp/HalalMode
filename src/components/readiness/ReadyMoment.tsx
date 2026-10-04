import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

interface ReadyMomentProps {
  visible: boolean;
  name: string;
  onStart: () => void;
  onLater: () => void;
}

/**
 * The moment a member finishes everything: a short celebration, and the one
 * button that starts their introductions.
 */
export function ReadyMoment({ visible, name, onStart, onLater }: ReadyMomentProps) {
  const { t, isRTL } = useI18n();
  const reducedMotion = useReducedMotion();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onLater}>
      <Animated.View
        accessibilityViewIsModal
        entering={reducedMotion ? undefined : FadeIn.duration(180)}
        style={styles.scrim}
      >
        <Animated.View
          accessible
          accessibilityRole="alert"
          entering={reducedMotion ? undefined : FadeInUp.duration(260)}
          style={[styles.card, isRTL && styles.rtl]}
        >
          <View style={styles.medalWrap}>
            <Animated.View
              entering={reducedMotion ? undefined : ZoomIn.delay(120).duration(320)}
              style={styles.halo}
            />
            <Animated.View
              entering={reducedMotion ? undefined : ZoomIn.delay(220).duration(300)}
              style={styles.medal}
            >
              <Text style={styles.medalMark}>✓</Text>
            </Animated.View>
            {SPARKS.map((spark, index) => (
              <Animated.Text
                key={index}
                entering={reducedMotion ? undefined : ZoomIn.delay(420 + index * 70).duration(260)}
                style={[styles.spark, spark]}
              >
                ✦
              </Animated.Text>
            ))}
          </View>

          <Text variant="microAccent" style={styles.centre}>{t('readiness.momentEyebrow')}</Text>
          <Text variant="displaySmall" style={[styles.title, styles.centre]}>
            {t('readiness.momentTitle', { name })}
          </Text>
          <Text variant="bodySmall" style={[styles.body, styles.centre]}>{t('readiness.momentBody')}</Text>

          <Button label={t('readiness.momentStart')} onPress={onStart} style={styles.action} />
          <Button label={t('readiness.momentLater')} variant="quiet" onPress={onLater} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const SPARKS = [
  { top: 6, left: 18, fontSize: 14 },
  { top: 0, right: 22, fontSize: 18 },
  { bottom: 10, left: 6, fontSize: 12 },
  { bottom: 2, right: 10, fontSize: 15 },
];

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  scrim: { flex: 1, justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(10,10,10,0.48)' },
  card: {
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
    borderRadius: radius.xl,
    paddingHorizontal: space.gutterWide,
    paddingTop: space.xxl,
    paddingBottom: space.xl,
    backgroundColor: color.surface,
    ...shadow.modal,
  },
  medalWrap: { width: 132, height: 112, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  halo: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(197,160,84,0.16)' },
  medal: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.gold,
  },
  medalMark: { fontFamily: font.bodyBold, fontSize: 34, lineHeight: 42, color: color.white },
  spark: { position: 'absolute', color: color.goldGlow },
  centre: { textAlign: 'center' },
  title: { marginTop: 8 },
  body: { marginTop: 10, color: color.inkSoft },
  action: { marginTop: space.xxl, marginBottom: 4 },
});
