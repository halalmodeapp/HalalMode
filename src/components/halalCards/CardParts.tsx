import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FlipInEasyX, ZoomIn } from 'react-native-reanimated';

import { LoadingDots } from '@/components/ui/LoadingDots';
import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { alpha, color, font, radius, shadow, space } from '@/theme/tokens';
import { onDark, SurfaceToneProvider } from '@/theme/tone';

type CardTone = 'light' | 'dark' | 'gold';

/**
 * The card everything in Halal Cards is drawn on. Each new card deals itself
 * in from below; change `dealKey` to deal a fresh one.
 */
export function PlayCard({
  children,
  tone = 'light',
  style,
  dealKey,
}: {
  children: ReactNode;
  tone?: CardTone;
  style?: ViewStyle;
  dealKey?: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      key={dealKey}
      entering={reducedMotion ? undefined : FadeInDown.springify().damping(18).stiffness(170)}
      style={[styles.card, tone === 'dark' && styles.cardDark, tone === 'gold' && styles.cardGold, style]}
    >
      <SurfaceToneProvider tone={tone === 'dark' ? 'dark' : 'light'}>{children}</SurfaceToneProvider>
    </Animated.View>
  );
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function ChoiceOption({
  label,
  index,
  selected,
  disabled,
  dimmed,
  onPress,
  testID,
}: {
  label: string;
  index: number;
  selected?: boolean;
  disabled?: boolean;
  /** Shown but not yours to pick — the other player is deciding. */
  dimmed?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { isRTL } = useI18n();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, disabled: !!disabled || !!dimmed }}
      disabled={disabled || dimmed}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.choice,
        isRTL && styles.rowReverse,
        selected && styles.choiceSelected,
        dimmed && styles.choiceDimmed,
        pressed && !selected && styles.choicePressed,
      ]}
    >
      <View style={[styles.letter, selected && styles.letterSelected]}>
        <Text style={[styles.letterText, selected && styles.letterTextSelected]}>{LETTERS[index] ?? '•'}</Text>
      </View>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function LessonChip({ tag, text, delay = 0 }: { tag?: string; text: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? undefined : ZoomIn.delay(delay).springify().damping(16)}
      style={styles.lesson}
      accessibilityRole="text"
    >
      {tag ? <Text style={styles.lessonTag}>✦ {tag}</Text> : null}
      <Text style={styles.lessonText}>{text}</Text>
    </Animated.View>
  );
}

export function Waiting({ label }: { label: string }) {
  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.waiting} accessibilityLiveRegion="polite">
      <LoadingDots />
      <Text variant="bodySmall" center>{label}</Text>
    </Animated.View>
  );
}

/** One side of a reveal: who, what they chose, and anything underneath. */
export function RevealTile({
  who,
  answer,
  detail,
  badge,
  index = 0,
}: {
  who: string;
  answer: string;
  detail?: string;
  badge?: string;
  index?: number;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FlipInEasyX.delay(120 + index * 220).duration(520)}
      style={styles.tile}
    >
      <View style={styles.tileHead}>
        <Text variant="micro">{who}</Text>
        {badge ? <Text style={styles.tileBadge}>{badge}</Text> : null}
      </View>
      <Text style={styles.tileAnswer}>{answer}</Text>
      {detail ? <Text variant="bodySmall">{detail}</Text> : null}
    </Animated.View>
  );
}

/** A short list of points with gold marks — for insights and summaries. */
export function Points({ items }: { items: string[] }) {
  const { isRTL } = useI18n();
  return (
    <View style={styles.points}>
      {items.map((item) => (
        <View key={item} style={[styles.point, isRTL && styles.rowReverse]}>
          <Text style={styles.pointMark}>✦</Text>
          <Text style={styles.pointText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** A small rounded label: "Turning point", "Same page", a mood. */
export function Pill({ label, tone = 'quiet' }: { label: string; tone?: 'quiet' | 'gold' | 'ink' }) {
  return (
    <View style={[styles.pill, tone === 'gold' && styles.pillGold, tone === 'ink' && styles.pillInk]}>
      <Text style={[styles.pillText, tone === 'gold' && styles.pillTextGold, tone === 'ink' && styles.pillTextInk]}>{label}</Text>
    </View>
  );
}

export function ProgressLine({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={[styles.progressFill, { width: `${Math.max(4, Math.min(100, value * 100))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: 'row-reverse' },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.panel,
    padding: space.xl,
    gap: space.md,
    borderWidth: 1,
    borderColor: alpha.lineFaint,
    ...shadow.card,
  },
  cardDark: { backgroundColor: color.ink, borderColor: color.ink },
  cardGold: { backgroundColor: '#FBF6EA', borderColor: 'rgba(197,160,84,0.45)' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 13,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.surface,
  },
  choicePressed: { backgroundColor: color.sandLight },
  choiceSelected: { borderColor: color.ink, backgroundColor: color.ink },
  choiceDimmed: { opacity: 0.55 },
  letter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterSelected: { borderColor: color.goldOnDark, backgroundColor: color.goldOnDark },
  letterText: { fontFamily: font.bodySemi, fontSize: 11, color: color.muted },
  letterTextSelected: { color: color.ink },
  choiceText: { flex: 1, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.inkSoft },
  choiceTextSelected: { color: color.white },
  lesson: {
    borderLeftWidth: 3,
    borderLeftColor: color.goldGlow,
    backgroundColor: '#FBF6EA',
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    gap: 4,
  },
  lessonTag: { fontFamily: font.bodyBold, fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', color: color.gold },
  lessonText: { fontFamily: font.display, fontSize: 15, lineHeight: 22, color: color.ink },
  waiting: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  tile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: color.sandLight,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: alpha.lineFaint,
  },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  tileBadge: { fontFamily: font.bodySemi, fontSize: 10.5, color: color.gold },
  tileAnswer: { fontFamily: font.display, fontSize: 16, lineHeight: 22, color: color.ink },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.sand,
  },
  pillGold: { backgroundColor: 'rgba(197,160,84,0.18)' },
  pillInk: { backgroundColor: color.ink },
  pillText: { fontFamily: font.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: color.muted },
  pillTextGold: { color: color.gold },
  pillTextInk: { color: onDark.ink },
  points: { gap: space.sm },
  point: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  pointMark: { color: color.goldGlow, fontSize: 11, lineHeight: 22 },
  pointText: { flex: 1, fontFamily: font.display, fontSize: 15, lineHeight: 22, color: color.ink },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: alpha.line, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: color.goldGlow },
});
