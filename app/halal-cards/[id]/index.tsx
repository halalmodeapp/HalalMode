import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchConnection } from '@/api/connections';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { PremiumGate } from '@/components/halalCards/PremiumGate';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { canStartSession } from '@/halalCards/access';
import { ADVENTURES, LAB_LESSONS, QUIZZES } from '@/halalCards/content';
import { useCardsContent } from '@/halalCards/localized';
import { hasCardsTranslation } from '@/halalCards/translations';
import { HUB_HERO, SECTION_TINTS, SECTION_TITLE_CARDS } from '@/halalCards/content/images';
import { ILLUSTRATIONS } from '@/halalCards/illustrations';
import { useCardsCopy } from '@/halalCards/copy';
import { useCardsAccess, useCardsSummary, useGuide } from '@/halalCards/hooks';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import { inTrack } from '@/halalCards/present';
import { CUE_PRIORITY, sessionCue, type SessionCue } from '@/halalCards/status';
import { type Activity, type ActivityKind, type CardsSummary, type ImageSlot } from '@/halalCards/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { useSession } from '@/state/session';
import { rcClaudePaths } from '@/components/relationshipChallengeClaude/paths';
import { rcCopy } from '@/halalCards/relationshipChallengeClaude/strings';
import { alpha, color, font, layout, radius, shadow, space } from '@/theme/tokens';

/**
 * Each section's title card: its own tinted illustration once drawn, until
 * then a picture from inside it under the section's colour wash.
 */
function sectionCard(kind: ActivityKind): { image: ImageSlot; tint?: string } {
  const card = SECTION_TITLE_CARDS[kind];
  return ILLUSTRATIONS[card.id] ? { image: card } : { image: SECTION_IMAGE[kind], tint: SECTION_TINTS[kind] };
}

/** A picture from inside each section, for its title card until one is drawn. */
const SECTION_IMAGE: Record<ActivityKind, ImageSlot> = {
  lab: LAB_LESSONS[1]!.cover,
  quiz: QUIZZES[0]!.cover,
  adventure: ADVENTURES[0]!.cover,
};

const SECTION_TITLE = { lab: 'lab', quiz: 'quizzes', adventure: 'adventures' } as const;
const SECTION_GATE = { lab: 'labGate', quiz: 'quizzesGate', adventure: 'adventuresGate' } as const;

export default function HalalCardsHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const copy = useCardsCopy();
  const { language } = useI18n();
  const { tier } = useSession();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const access = useCardsAccess(id);
  const sessions = useCardsSummary(id, { poll: 20_000 });
  const guide = useGuide(id);
  const { findActivity } = useCardsContent();

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
  const rows = (sessions.data ?? [])
    .map((session) => ({ session, activity: findActivity(session.activityId), cue: sessionCue(session) }))
    .filter((item): item is { session: CardsSummary; activity: Activity; cue: SessionCue } => !!item.activity);
  const live = rows
    .filter((item) => item.cue !== 'ended' && item.cue !== 'finished')
    .sort((a, b) => CUE_PRIORITY[a.cue] - CUE_PRIORITY[b.cue]);
  const played = rows.filter((item) => item.cue === 'finished').slice(0, 6);
  const agreed = guide.query.data?.filter((entry) => entry.agreed) ?? [];
  const pending = guide.query.data?.filter((entry) => !entry.agreed).length ?? 0;
  const enter = (index: number) => (reducedMotion ? undefined : FadeInDown.delay(60 * index).springify().damping(18));
  const counts: Record<ActivityKind, string> = {
    lab: copy('lessons', { count: LAB_LESSONS.length }),
    quiz: copy('decks', { count: QUIZZES.filter((quiz) => inTrack(quiz, access.data?.track ?? 'getting_to_know')).length }),
    adventure: copy('stories', { count: ADVENTURES.length }),
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* The title fills the top of the screen — a header, not a card. */}
        <View style={styles.hero}>
          <Illustration image={HUB_HERO} aspectRatio={4 / 5} rounded={false} style={styles.heroImage}>
            <View style={styles.heroText}>
              <OverlayText kind="eyebrow">{copy('brandWith', { name })}</OverlayText>
              <OverlayText kind="titleLarge">{copy('brand')}</OverlayText>
              <OverlayText kind="body">{copy('hubIntro')}</OverlayText>
            </View>
          </Illustration>
          <View style={[styles.heroHeader, { top: insets.top }]}>
            <ScreenHeader tone="dark" onAction={() => backOr(cardsPaths.chat(id))} />
          </View>
        </View>

        <View style={styles.column}>
          {language !== 'en' && !hasCardsTranslation(language) ? <Text variant="caption" center>{copy('englishNote')}</Text> : null}

          {canStart ? (
            <Text variant="caption" center>
              {access.data?.unlocked
                ? access.data.unlockedByMe
                  ? copy('unlockedByYou')
                  : copy('unlockedForYou')
                : copy('canUnlock', { name })}
            </Text>
          ) : (
            <PremiumGate
              partnerName={name}
              connectionId={id}
              onTrySolo={() => router.push(cardsPaths.solo(id, LAB_LESSONS[0]!.id) as never)}
            />
          )}

          {live.length ? (
            <Section title={copy('inProgress')}>
              {live.map((item) => (
                <SessionRow key={item.session.id} {...item} name={name} connectionId={id} />
              ))}
            </Section>
          ) : null}

          <Animated.View entering={enter(1)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy('journal')}
              onPress={() => router.push(cardsPaths.journal(id) as never)}
              style={({ pressed }) => [styles.journal, pressed && styles.pressed]}
            >
              <View style={styles.journalSpine} />
              <View style={styles.journalBody}>
                <View style={styles.journalHead}>
                  <Text style={styles.journalMark}>❦</Text>
                  <Text style={styles.journalTitle}>{copy('journal')}</Text>
                </View>
                <Text variant="bodySmall">{copy('journalBlurb')}</Text>
                {/* Ruled lines with the latest agreements written on them. */}
                <View style={styles.lines}>
                  {[0, 1].map((line) => (
                    <View key={line} style={styles.line}>
                      <Text style={styles.lineText} numberOfLines={1}>
                        {agreed[agreed.length - 1 - line]?.text ?? (line === 0 && !agreed.length ? copy('journalNew') : ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text variant="caption">
                  {copy('journalCount', { count: agreed.length })}
                  {pending ? ` · ${copy('journalPending', { count: pending })}` : ''}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          {(['lab', 'quiz', 'adventure'] as const).map((kind, index) => (
            <Animated.View key={kind} entering={enter(index + 2)} style={styles.gateBlock}>
              <View style={styles.gateHeading}>
                <Text style={[styles.gateNumber, { color: SECTION_TINTS[kind] }]}>{index + 1}</Text>
                <Text style={styles.gateTitle}>{copy(SECTION_TITLE[kind])}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(cardsPaths.section(id, kind) as never)}
                style={({ pressed }) => [styles.gate, pressed && styles.pressed]}
              >
                <Illustration {...sectionCard(kind)} aspectRatio={16 / 9} rounded={false} thumb>
                  <OverlayText kind="eyebrow">{counts[kind]}</OverlayText>
                </Illustration>
                <View style={styles.gateBody}>
                  <Text variant="body">{copy(SECTION_GATE[kind])}</Text>
                  <Text style={styles.gateCta}>{`${copy('explore')} ›`}</Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}

          {/* Relationship Challenge Claude (comparison build): one additive entry, see docs/relationship-challenge/claude/HANDOFF.md. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(rcClaudePaths.lobby(id) as never)}
            style={({ pressed }) => [styles.sessionRow, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text variant="micro">{rcCopy(language, 'brandTrack')}</Text>
              <Text style={styles.cardTitle}>{rcCopy(language, 'lobby.title')}</Text>
              <Text variant="caption">{rcCopy(language, 'lobby.intro')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          {played.length ? (
            <Section title={copy('played')}>
              {played.map((item) => (
                <SessionRow key={item.session.id} {...item} name={name} connectionId={id} />
              ))}
            </Section>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="displaySmall">{title}</Text>
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
  session: CardsSummary;
  activity: Activity;
  cue: SessionCue;
  name: string;
  connectionId: string;
}) {
  const copy = useCardsCopy();
  const line = {
    invited_you: copy('invitedYou', { name }),
    your_turn: copy('yourTurn'),
    in_play: copy('inPlay'),
    their_turn: copy('theirTurn', { name }),
    awaiting_accept: copy('waitingAccept', { name }),
    finished: copy('viewResults'),
    ended: '',
  }[cue];
  const urgent = cue === 'invited_you' || cue === 'your_turn';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(cardsPaths.play(connectionId, session.id) as never)}
      style={({ pressed }) => [styles.sessionRow, urgent && styles.sessionUrgent, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        <Illustration image={activity.cover} aspectRatio={1} thumb />
      </View>
      <View style={styles.flex}>
        <Text variant="micro">{copy(`kind.${activity.kind}`)}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{activity.title}</Text>
        <Text variant="caption" style={urgent ? styles.urgentText : undefined}>{line}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  scroll: { paddingBottom: 60 },
  hero: { width: '100%', maxWidth: layout.maxContentWidth + 120, alignSelf: 'center' },
  heroImage: { maxHeight: 620 },
  heroText: { paddingHorizontal: space.sm, paddingBottom: space.lg, gap: 6 },
  heroHeader: { position: 'absolute', left: 0, right: 0 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: space.xl,
    gap: space.xxl,
  },
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  section: { gap: space.md },
  journal: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    backgroundColor: '#FBF6EA',
    borderWidth: 1,
    borderColor: 'rgba(197,160,84,0.4)',
    overflow: 'hidden',
    ...shadow.card,
    shadowOpacity: 0.08,
  },
  journalSpine: { width: 14, backgroundColor: color.ink, borderRightWidth: 3, borderRightColor: color.goldGlow },
  journalBody: { flex: 1, padding: space.lg, gap: space.sm },
  journalHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  journalMark: { fontSize: 18, color: color.gold },
  journalTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  lines: { marginVertical: space.xs },
  line: { borderBottomWidth: 1, borderBottomColor: 'rgba(138,106,52,0.22)', paddingVertical: 6 },
  lineText: { fontFamily: font.displayItalic, fontSize: 14, color: color.inkSoft },
  gateBlock: { gap: space.md },
  gateHeading: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  gateNumber: { fontFamily: font.display, fontSize: 44, lineHeight: 48, color: color.goldGlow },
  gateTitle: { flex: 1, fontFamily: font.display, fontSize: 28, lineHeight: 33, color: color.ink, letterSpacing: -0.3 },
  gate: {
    borderRadius: radius.panel,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: alpha.line,
    overflow: 'hidden',
    ...shadow.card,
    shadowOpacity: 0.08,
  },
  gateBody: { padding: space.lg, gap: space.sm },
  gateCta: { fontFamily: font.bodySemi, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color.gold },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.surface,
  },
  sessionUrgent: { borderColor: color.goldGlow, backgroundColor: '#FBF6EA' },
  thumb: { width: 52 },
  urgentText: { color: color.gold },
  chevron: { fontSize: 22, color: color.faint },
  cardTitle: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: color.ink },
});
