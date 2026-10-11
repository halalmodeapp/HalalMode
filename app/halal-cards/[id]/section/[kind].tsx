import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ADVENTURE_CONCEPTS, ADVENTURES, LAB_LESSONS, QUIZZES } from '@/halalCards/content';
import { useCardsCopy } from '@/halalCards/copy';
import { useCardsAccess, useConceptVotes } from '@/halalCards/hooks';
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
  const votes = useConceptVotes();
  const track = access.data?.track ?? 'getting_to_know';
  const activities: Activity[] = kind === 'lab' ? LAB_LESSONS : kind === 'quiz' ? QUIZZES : ADVENTURES;
  // Engaged and married content waits, unseen, until a couple unlocks that
  // stage together — a later feature. Only what suits them now is listed.
  const ordered = activities.filter((activity) => inTrack(activity, track));
  const enter = (index: number) => (reducedMotion ? undefined : FadeInDown.delay(50 * index).springify().damping(18));
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
                      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
                    >
                      <Illustration image={activity.cover} aspectRatio={4 / 5} thumb>
                        {quiz && showFormatEyebrow(quiz, label) ? <OverlayText kind="eyebrow" numberOfLines={1}>{label}</OverlayText> : null}
                        <OverlayText kind="title" numberOfLines={3}>{activity.title}</OverlayText>
                        <OverlayText kind="body">{copy('minutes', { count: activity.minutes })}</OverlayText>
                      </Illustration>
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
                  style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
                >
                  <Illustration image={activity.cover} aspectRatio={kind === 'adventure' ? 4 / 5 : 16 / 10} thumb>
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
                </Pressable>
              </Animated.View>
            ))
          )}

          {kind === 'adventure' ? (
            <View style={styles.soon}>
              <Text variant="displaySmall">{copy('comingSoon')}</Text>
              <Text variant="bodySmall">{copy('conceptsBlurb')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.concepts}>
                {ADVENTURE_CONCEPTS.map((concept) => {
                  const voted = votes.query.data?.includes(concept.id) ?? false;
                  return (
                    <Pressable
                      key={concept.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: voted }}
                      onPress={() => votes.toggle.mutate(concept.id)}
                      style={({ pressed }) => [styles.concept, pressed && styles.pressed]}
                    >
                      <Illustration image={concept.cover} aspectRatio={4 / 5} thumb>
                        <OverlayText kind="eyebrow">{copy('comingSoon')}</OverlayText>
                        <OverlayText kind="title" numberOfLines={2}>{concept.title}</OverlayText>
                      </Illustration>
                      <Text variant="caption" numberOfLines={3}>{concept.logline}</Text>
                      <View style={[styles.vote, voted && styles.voteOn]}>
                        <Text style={[styles.voteText, voted && styles.voteTextOn]}>{voted ? copy('notifyOn') : copy('notifyMe')}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
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
  tile: { borderRadius: radius.lg, ...shadow.card, shadowOpacity: 0.1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  quizTile: { flexBasis: '47%', flexGrow: 1 },
  soon: { gap: space.sm, marginTop: space.lg },
  concepts: { gap: space.md, paddingRight: space.gutter },
  concept: { width: 172, gap: 6 },
  vote: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: alpha.lineButton,
  },
  voteOn: { backgroundColor: color.goldGlow, borderColor: color.goldGlow },
  voteText: { fontFamily: font.bodySemi, fontSize: 11, color: color.inkSoft },
  voteTextOn: { color: '#3A2C10' },
});
