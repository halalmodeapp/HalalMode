import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { fetchConnection } from '@/api/connections';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { PremiumGate } from '@/components/halalCards/PremiumGate';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { canStartSession } from '@/halalCards/access';
import { ADVENTURE_CONCEPTS, ADVENTURES, findActivity, LAB_LESSONS, QUIZZES } from '@/halalCards/content';
import { GUIDE_HERO, HUB_HERO } from '@/halalCards/content/images';
import { useCardsCopy } from '@/halalCards/copy';
import { useCardsAccess, useCardsSessions, useGuide } from '@/halalCards/hooks';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import { CUE_PRIORITY, sessionCue, type SessionCue } from '@/halalCards/status';
import type { Activity, CardsSession } from '@/halalCards/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { useSession } from '@/state/session';
import { alpha, color, font, layout, radius, shadow, space } from '@/theme/tokens';

export default function HalalCardsHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const copy = useCardsCopy();
  const { tier } = useSession();
  const reducedMotion = useReducedMotion();

  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const access = useCardsAccess(id);
  const sessions = useCardsSessions(id, { poll: 8000 });
  const guide = useGuide(id);

  if (connection.isPending) {
    return (
      <Screen>
        <LoadingState label={copy('loading')} />
      </Screen>
    );
  }
  if (connection.isError || !connection.data) {
    return (
      <Screen>
        <ErrorState title={copy('errorTitle')} message={copy('errorBody')} onRetry={() => void connection.refetch()} />
      </Screen>
    );
  }

  const name = connection.data.profile.firstName;
  const canStart = canStartSession({ myTier: tier, access: access.data });
  const live = (sessions.data ?? [])
    .map((session) => ({ session, activity: findActivity(session.activityId) }))
    .map((item) => ({ ...item, cue: sessionCue(item.session, item.activity) }))
    .filter((item) => item.activity && item.cue !== 'ended' && item.cue !== 'finished')
    .sort((left, right) => CUE_PRIORITY[left.cue] - CUE_PRIORITY[right.cue]);
  const agreed = guide.query.data?.filter((entry) => entry.agreed).length ?? 0;
  const pending = guide.query.data?.filter((entry) => !entry.agreed).length ?? 0;
  const enter = (index: number) => (reducedMotion ? undefined : FadeInDown.delay(60 * index).springify().damping(18));

  return (
    <Screen>
      <ScreenHeader onAction={() => backOr(cardsPaths.chat(id))} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <Animated.View entering={enter(0)}>
            <Illustration image={HUB_HERO} aspectRatio={4 / 5} style={styles.heroImage}>
              <OverlayText kind="eyebrow">{copy('brandWith', { name })}</OverlayText>
              <OverlayText kind="titleLarge">{copy('brand')}</OverlayText>
              <OverlayText kind="body">{copy('hubIntro')}</OverlayText>
            </Illustration>
          </Animated.View>

          {canStart ? (
            <Text variant="caption" center>
              {access.data?.unlockedByMe || (tier === 'premium' && !access.data?.unlocked)
                ? copy('unlockedByYou')
                : copy('unlockedForYou')}
            </Text>
          ) : (
            <PremiumGate partnerName={name} />
          )}

          {live.length ? (
            <Section title={copy('inProgress')}>
              {live.map(({ session, activity, cue }) => (
                <SessionRow key={session.id} session={session} activity={activity as Activity} cue={cue} name={name} connectionId={id} />
              ))}
            </Section>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(cardsPaths.guide(id) as never)}
            style={({ pressed }) => [styles.guideCard, pressed && styles.pressed]}
          >
            <Illustration image={GUIDE_HERO} aspectRatio={16 / 10} rounded={false}>
              <OverlayText kind="eyebrow">
                {copy('guideCount', { count: agreed })}
                {pending ? ` · ${copy('guidePending', { count: pending })}` : ''}
              </OverlayText>
              <OverlayText kind="title">{copy('guide')}</OverlayText>
              <OverlayText kind="body">{copy('guideBlurb')}</OverlayText>
            </Illustration>
          </Pressable>

          <Section title={copy('lab')} blurb={copy('labBlurb')}>
            {LAB_LESSONS.map((lesson, index) => (
              <Animated.View key={lesson.id} entering={enter(index + 1)}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(cardsPaths.activity(id, lesson.id) as never)}
                  style={({ pressed }) => [styles.imageCard, pressed && styles.pressed]}
                >
                  <Illustration image={lesson.cover} aspectRatio={16 / 10}>
                    <OverlayText kind="eyebrow">{`${lesson.ruleLabel} · ${copy('minutes', { count: lesson.minutes })}`}</OverlayText>
                    <OverlayText kind="title">{lesson.title}</OverlayText>
                    <OverlayText kind="body" numberOfLines={2}>{lesson.tagline}</OverlayText>
                  </Illustration>
                </Pressable>
              </Animated.View>
            ))}
          </Section>

          <Section title={copy('quizzes')} blurb={copy('quizzesBlurb')}>
            <View style={styles.grid}>
              {QUIZZES.map((quiz) => (
                <Pressable
                  key={quiz.id}
                  accessibilityRole="button"
                  onPress={() => router.push(cardsPaths.activity(id, quiz.id) as never)}
                  style={({ pressed }) => [styles.quizTile, pressed && styles.pressed]}
                >
                  <Illustration image={quiz.cover} aspectRatio={4 / 5}>
                    <OverlayText kind="eyebrow" numberOfLines={1}>{copy(`format.${quiz.format}`)}</OverlayText>
                    <OverlayText kind="title" numberOfLines={3}>{quiz.title}</OverlayText>
                  </Illustration>
                </Pressable>
              ))}
            </View>
          </Section>

          <Section title={copy('adventures')} blurb={copy('adventuresBlurb')}>
            {ADVENTURES.map((adventure) => (
              <Pressable
                key={adventure.id}
                accessibilityRole="button"
                onPress={() => router.push(cardsPaths.activity(id, adventure.id) as never)}
                style={({ pressed }) => [styles.imageCard, pressed && styles.pressed]}
              >
                <Illustration image={adventure.cover} aspectRatio={4 / 5}>
                  <OverlayText kind="eyebrow">{adventure.themes.slice(0, 3).join(' · ')}</OverlayText>
                  <OverlayText kind="titleLarge">{adventure.title}</OverlayText>
                  <OverlayText kind="body">{adventure.tagline}</OverlayText>
                </Illustration>
              </Pressable>
            ))}
          </Section>

          <Section title={copy('comingSoon')} blurb={copy('conceptsBlurb')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.concepts}>
              {ADVENTURE_CONCEPTS.map((concept) => (
                <View key={concept.id} style={styles.conceptTile}>
                  <Illustration image={concept.cover} aspectRatio={4 / 5}>
                    <OverlayText kind="eyebrow">{copy('comingSoon')}</OverlayText>
                    <OverlayText kind="title" numberOfLines={2}>{concept.title}</OverlayText>
                  </Illustration>
                  <Text variant="caption" numberOfLines={3}>{concept.logline}</Text>
                </View>
              ))}
            </ScrollView>
          </Section>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, blurb, children }: { title: string; blurb?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="displaySmall">{title}</Text>
        {blurb ? <Text variant="bodySmall">{blurb}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function SessionRow({
  session,
  activity,
  cue,
  name,
  connectionId,
}: {
  session: CardsSession;
  activity: Activity;
  cue: SessionCue;
  name: string;
  connectionId: string;
}) {
  const copy = useCardsCopy();
  const { isRTL } = useI18n();
  const line =
    cue === 'invited_you'
      ? copy('invitedYou', { name })
      : cue === 'your_turn'
        ? copy('yourTurn')
        : cue === 'their_turn'
          ? copy('theirTurn', { name })
          : copy('waitingAccept', { name });
  const urgent = cue === 'invited_you' || cue === 'your_turn';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(cardsPaths.play(connectionId, session.id) as never)}
      style={({ pressed }) => [styles.sessionRow, isRTL && styles.rowReverse, urgent && styles.sessionUrgent, pressed && styles.pressed]}
    >
      <View style={[styles.dot, urgent && styles.dotUrgent]} />
      <View style={styles.flex}>
        <Text variant="micro">{copy(`kind.${activity.kind}`)}</Text>
        <Text style={styles.cardTitle}>{activity.title}</Text>
        <Text variant="caption" style={urgent ? styles.urgentText : undefined}>{line}</Text>
      </View>
      <Text style={styles.chevron}>{isRTL ? '‹' : '›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 60 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    gap: space.xxl,
  },
  flex: { flex: 1, gap: 3 },
  rowReverse: { flexDirection: 'row-reverse' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  heroImage: { borderRadius: radius.hero },
  section: { gap: space.md },
  sectionHead: { gap: 2 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.surface,
  },
  sessionUrgent: { borderColor: color.goldGlow, backgroundColor: '#FBF6EA' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: alpha.lineStrong },
  dotUrgent: { backgroundColor: color.goldGlow },
  urgentText: { color: color.gold },
  chevron: { fontSize: 22, color: color.faint },
  guideCard: { borderRadius: radius.panel, overflow: 'hidden', ...shadow.card, shadowOpacity: 0.1 },
  imageCard: { borderRadius: radius.lg, ...shadow.card, shadowOpacity: 0.1 },
  cardTitle: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: color.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  quizTile: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.lg, ...shadow.card, shadowOpacity: 0.08 },
  concepts: { gap: space.md, paddingRight: space.gutter },
  conceptTile: { width: 168, gap: 6 },
});
