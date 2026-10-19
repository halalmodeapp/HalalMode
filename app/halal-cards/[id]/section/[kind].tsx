import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCardsContent } from '@/halalCards/localized';
import { useCardsCopy } from '@/halalCards/copy';
import { useCardsAccess, useCardsSummary } from '@/halalCards/hooks';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import { inTrack, showFormatEyebrow } from '@/halalCards/present';
import type { Activity, ActivityKind } from '@/halalCards/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { alpha, color, font, layout, radius, shadow, space } from '@/theme/tokens';

const TITLE = { lab: 'lab', quiz: 'quizzes', adventure: 'adventures' } as const;
const GATE = { lab: 'labGate', quiz: 'quizzesGate', adventure: 'adventuresGate' } as const;

/** One section of Halal Cards: what it is, then every activity in it. */
export default function SectionScreen() {
  const { id, kind: rawKind } = useLocalSearchParams<{ id: string; kind: string }>();
  const kind: ActivityKind = rawKind === 'quiz' || rawKind === 'adventure' ? rawKind : 'lab';
  const copy = useCardsCopy();
  const reducedMotion = useReducedMotion();
  const access = useCardsAccess(id);
  const track = access.data?.track ?? 'getting_to_know';
  // Played to the end at least once: shown faded, with a tick, so a couple
  // can see at a glance what they have finished.
  const summary = useCardsSummary(id);
  const completed = new Set((summary.data ?? []).filter((item) => item.status === 'completed').map((item) => item.activityId));
  const { LAB_LESSONS, QUIZZES, ADVENTURES } = useCardsContent();
  const activities: Activity[] = kind === 'lab' ? LAB_LESSONS : kind === 'quiz' ? QUIZZES : ADVENTURES;
  // Engaged and married content waits, unseen, until a couple unlocks that
  // stage together, a later feature. Only what suits them now is listed.
  const ordered = activities.filter((activity) => inTrack(activity, track));
  const enter = (index: number) => (
    reducedMotion
      ? undefined
      : FadeInDown
        .delay(120 * index)
        .duration(900)
        .easing(Easing.out(Easing.cubic))
  );
  const open = (activity: Activity) => router.push(cardsPaths.activity(id, activity.id) as never);


  return (
    <Screen>
      <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} trailingLabel={copy('brand')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <View style={styles.head}>
            <Text variant="display">{copy(TITLE[kind])}</Text>
            <Text variant="body">{copy(GATE[kind])}</Text>
          </View>

          {kind === 'quiz' ? (
            <View style={styles.grid}>
              {ordered.map((activity, index) => {
                const quiz = activity.kind === 'quiz' ? activity : null;
                const label = quiz ? copy(`format.${quiz.format}`) : '';
                return (
                  <Animated.View key={activity.id} entering={enter(index)} style={styles.quizTile}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => open(activity)}
                      accessibilityLabel={completed.has(activity.id) ? `${activity.title}, ${copy('completed')}` : activity.title}
                      style={({ pressed }) => [styles.tile, completed.has(activity.id) && styles.tileDone, pressed && styles.pressed]}
                    >
                      <Illustration image={activity.cover} aspectRatio={4 / 5} thumb>
                        {quiz && showFormatEyebrow(quiz, label) ? <OverlayText kind="eyebrow" numberOfLines={1}>{label}</OverlayText> : null}
                        <OverlayText kind="title" numberOfLines={3}>{activity.title}</OverlayText>
                        <OverlayText kind="body">{copy('minutes', { count: activity.minutes })}</OverlayText>
                      </Illustration>
                      {completed.has(activity.id) ? <DoneMark label={copy('completed')} /> : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            ordered.map((activity, index) => (
              <Animated.View key={activity.id} entering={enter(index)}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => open(activity)}
                  accessibilityLabel={completed.has(activity.id) ? `${activity.title}, ${copy('completed')}` : activity.title}
                  style={({ pressed }) => [styles.tile, completed.has(activity.id) && styles.tileDone, pressed && styles.pressed]}
                >
                  <Illustration image={activity.cover} aspectRatio={kind === 'adventure' ? 4 / 5 : 16 / 10} thumb cropZoom={kind === 'adventure' ? 1 : 1.2}>
                    <OverlayText kind="eyebrow">
                      {activity.kind === 'lab'
                        ? `${activity.ruleLabel} · ${copy('minutes', { count: activity.minutes })}`
                        : activity.kind === 'adventure'
                          ? activity.themes.slice(0, 3).join(' · ')
                          : ''}
                    </OverlayText>
                    <OverlayText kind={kind === 'adventure' ? 'titleLarge' : 'title'}>{activity.title}</OverlayText>
                    <OverlayText kind="body">{activity.tagline}</OverlayText>
                  </Illustration>
                  {completed.has(activity.id) ? <DoneMark label={copy('completed')} /> : null}
                </Pressable>
              </Animated.View>
            ))
          )}

        </View>
      </ScrollView>
    </Screen>
  );
}

/** A darker veil and a tick in the corner for something finished. */
function DoneMark({ label }: { label: string }) {
  return (
    <>
      <View style={[StyleSheet.absoluteFill, styles.doneShade]} />
      <View style={styles.doneBadge}>
        <Text style={styles.doneTick}>✓</Text>
        <Text style={styles.doneText}>{label}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 60 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    gap: space.lg,
  },
  head: { gap: space.sm, marginBottom: space.sm },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  tile: { borderRadius: radius.lg, overflow: 'hidden', ...shadow.card, shadowOpacity: 0.1 },
  tileDone: { opacity: 0.82 },
  doneShade: { backgroundColor: 'rgba(10,10,10,0.38)', borderRadius: radius.lg, pointerEvents: 'none' },
  doneBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.goldGlow,
    borderWidth: 1,
    borderColor: alpha.onDarkLine,
  },
  doneTick: { fontFamily: font.bodyBold, fontSize: 12, color: '#3A2C10' },
  doneText: { fontFamily: font.bodySemi, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', color: '#3A2C10' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  quizTile: { flexBasis: '47%', flexGrow: 1 },
});
