import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import type { ReadinessStep } from '@/lib/profileReadiness';
import { RTL_LAYOUT } from '@/lib/rtl';
import { alpha, color, font, radius } from '@/theme/tokens';

const STEP_LABEL: Record<ReadinessStep, TranslationKey> = {
  essentials: 'readiness.step.essentials',
  photo: 'readiness.step.photo',
  bio: 'readiness.step.bio',
  details: 'readiness.step.details',
  children: 'readiness.step.children',
  faith: 'readiness.step.faith',
  body: 'readiness.step.body',
  preferences: 'readiness.step.preferences',
};

interface ReadinessChecklistProps {
  steps: { id: ReadinessStep; done: boolean }[];
  /** The line under the title: what happens once everything is ticked. */
  lead: string;
  /** Steps still to do become buttons when this is given. */
  onPressStep?: (step: ReadinessStep) => void;
  /** Which steps can be pressed; all of them when omitted. */
  isPressable?: (step: ReadinessStep) => boolean;
}

/**
 * The few things that stand between a member and their introductions, with a
 * large tick for each one done. Done steps stay in the list, so progress is
 * visible rather than a list that only ever shrinks.
 */
export function ReadinessChecklist({ steps, lead, onPressStep, isPressable }: ReadinessChecklistProps) {
  const { t, isRTL } = useI18n();
  const reducedMotion = useReducedMotion();
  const done = steps.filter((step) => step.done).length;

  return (
    <View style={[styles.wrap, isRTL && styles.rtl]}>
      <View style={[styles.head, isRTL && styles.rowReverse]}>
        <Text variant="label" style={styles.title}>{t('profile.readinessTitle')}</Text>
        <Text variant="microAccent">{t('readiness.progress', { done, total: steps.length })}</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: steps.length, now: done }}
      >
        <View style={[styles.fill, { width: `${(done / Math.max(steps.length, 1)) * 100}%` }]} />
      </View>
      <Text variant="caption" style={styles.lead}>{lead}</Text>

      <View style={styles.list}>
        {steps.map((step) => {
          const label = t(STEP_LABEL[step.id]);
          const pressable = !step.done && Boolean(onPressStep) && (isPressable?.(step.id) ?? true);
          return (
            <Pressable
              key={step.id}
              disabled={!pressable}
              onPress={() => onPressStep?.(step.id)}
              accessibilityRole={pressable ? 'button' : undefined}
              accessibilityState={{ checked: step.done }}
              accessibilityLabel={label}
              style={({ pressed }) => [styles.row, isRTL && styles.rowReverse, pressed && styles.pressed]}
            >
              {step.done ? (
                <Animated.View
                  entering={reducedMotion ? undefined : ZoomIn.duration(220)}
                  style={[styles.tick, styles.tickDone]}
                >
                  <Text style={styles.tickMark}>✓</Text>
                </Animated.View>
              ) : (
                <View style={styles.tick} />
              )}
              <Text variant="label" style={[styles.stepLabel, step.done && styles.stepDone]}>{label}</Text>
              {pressable ? <Text style={styles.chevron}>{isRTL ? '‹' : '›'}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TICK = 30;

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  wrap: { gap: 0 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 16 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: alpha.lineFaint, marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.goldGlow },
  lead: { marginTop: 10, color: color.inkSoft },
  list: { marginTop: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44, paddingVertical: 4, borderRadius: radius.md },
  pressed: { opacity: 0.6 },
  tick: {
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
    borderWidth: 2,
    borderColor: alpha.lineButton,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  tickDone: { borderColor: color.gold, backgroundColor: color.gold },
  tickMark: { fontFamily: font.bodyBold, fontSize: 16, lineHeight: 20, color: color.white },
  stepLabel: { flex: 1, fontSize: 15, color: color.ink },
  stepDone: { color: color.faint, fontFamily: font.body },
  chevron: { fontSize: 22, color: color.faint },
});
