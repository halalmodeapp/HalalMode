import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { fetchConnection } from '@/api/connections';
import { respondCardsInvite, startCardsSession } from '@/api/halalCards';
import { PlayCard } from '@/components/halalCards/CardParts';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { RoomStage } from '@/components/relationshipChallengeClaude/RoomStage';
import { rcClaudePaths } from '@/components/relationshipChallengeClaude/paths';
import { asActivityState } from '@/components/relationshipChallengeClaude/useRcClaudeSession';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { canStartSession } from '@/halalCards/access';
import { useCardsAccess, useCardsSummary } from '@/halalCards/hooks';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import { deriveRc, startRc } from '@/halalCards/relationshipChallengeClaude/engine';
import { RC_CLAUDE_SCENARIOS } from '@/halalCards/relationshipChallengeClaude/scenarios';
import { rcCopy, rcText, type RcCopyKey } from '@/halalCards/relationshipChallengeClaude/strings';
import type { RcScenario } from '@/halalCards/relationshipChallengeClaude/types';
import type { CardsSummary } from '@/halalCards/types';
import { useI18n } from '@/i18n';
import { showNotice } from '@/lib/notice';
import { queryKeys } from '@/lib/queryClient';
import { useSession } from '@/state/session';
import { alpha, color, layout, radius, space } from '@/theme/tokens';

/**
 * Relationship Challenge Claude's entry: the hypothetical framing, then the
 * two scenarios with whatever is open for each. Invitations, accepting and
 * declining go through the ordinary Halal Cards session calls.
 */
export default function RcClaudeLobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useI18n();
  const t = (key: RcCopyKey, params?: Record<string, string | number>) => rcCopy(language, key, params);
  const { tier } = useSession();
  const queryClient = useQueryClient();
  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const access = useCardsAccess(id);
  const sessions = useCardsSummary(id, { poll: 15_000 });
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(windowWidth, layout.maxContentWidth) - space.gutter * 2 - 2;

  // Halal Mode introduces men and women to each other, so the member's own
  // gender is the other one; it decides which character they play.
  const myGender = connection.data?.profile.gender === 'female' ? 'male' : 'female';

  const failed = () => showNotice(t('brand'), t('lobby.alreadyOpen'));
  const start = useMutation({
    mutationFn: (scenario: RcScenario) =>
      startCardsSession(id, scenario.activityId, asActivityState(startRc(scenario, myGender)), scenario.version),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cardsSessions(id) });
      router.push(rcClaudePaths.play(id, session.id) as never);
    },
    onError: failed,
  });
  const respond = useMutation({
    mutationFn: (input: { sessionId: string; accept: boolean }) => respondCardsInvite(input.sessionId, input.accept, null),
    onSuccess: (session, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cardsSessions(id) });
      if (input.accept) router.push(rcClaudePaths.play(id, session.id) as never);
    },
  });

  if (connection.isPending) {
    return (
      <Screen>
        <LoadingState label={t('brand')} />
      </Screen>
    );
  }
  if (!connection.data) {
    return (
      <Screen>
        <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
        <ErrorState title={t('ended.title')} message={t('stale.body')} onRetry={() => void connection.refetch()} />
      </Screen>
    );
  }

  const name = connection.data.profile.firstName;
  const canStart = canStartSession({ myTier: tier, access: access.data });
  const openFor = (scenario: RcScenario): CardsSummary | undefined =>
    sessions.data?.find(
      (session) => session.activityId === scenario.activityId && (session.status === 'invited' || session.status === 'active')
    );

  return (
    <Screen>
      <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <View style={styles.intro}>
            <Text variant="microAccent">{t('brandTrack')}</Text>
            <Text variant="display">{t('lobby.title')}</Text>
            <Text variant="body">{t('lobby.intro')}</Text>
          </View>

          <PlayCard dealKey="framing">
            <Text variant="label">{t('framing.title')}</Text>
            <Text variant="bodySmall">{t('framing.body')}</Text>
            {(['framing.points.1', 'framing.points.2', 'framing.points.3'] as const).map((key) => (
              <View key={key} style={styles.point}>
                <View style={styles.bullet} />
                <Text variant="bodySmall" style={styles.flex}>{t(key)}</Text>
              </View>
            ))}
            <Text variant="caption">{t('framing.chaperone')}</Text>
          </PlayCard>

          {RC_CLAUDE_SCENARIOS.map((scenario) => {
            const open = openFor(scenario);
            return (
              <View key={scenario.scenarioId} style={styles.scenario}>
                <View style={[styles.scenarioArt, { height: cardWidth * 0.62 }]}>
                  <View style={{ marginTop: -cardWidth * 0.12 }}>
                    <RoomStage
                      scenario={scenario}
                      state={startRc(scenario, myGender)}
                      view={deriveRc(scenario, startRc(scenario, myGender))}
                      mySeat="host"
                      partnerName={name}
                      youLabel=""
                      width={cardWidth}
                      reducedMotion
                      spotLabel={() => ''}
                      onHotspot={() => undefined}
                      decorative
                    />
                  </View>
                </View>
                <View style={styles.scenarioBody}>
                  <Text variant="micro">
                    {`${t(scenario.timeOfDay === 'morning' ? 'lobby.morning' : 'lobby.night')} · ${t('lobby.minutes', { count: scenario.minutes })}`}
                  </Text>
                  <Text variant="displaySmall">{rcText(language, scenario.titleKey)}</Text>
                  <Text variant="bodySmall">{rcText(language, scenario.taglineKey)}</Text>
                  {open ? (
                    open.status === 'invited' && open.mySeat === 'guest' ? (
                      <>
                        <Text variant="microAccent">{t('lobby.invited', { name })}</Text>
                        <Button
                          label={t('accept')}
                          loading={respond.isPending}
                          onPress={() => respond.mutate({ sessionId: open.id, accept: true })}
                        />
                        <Button label={t('decline')} variant="quiet" onPress={() => respond.mutate({ sessionId: open.id, accept: false })} />
                      </>
                    ) : (
                      <>
                        {open.status === 'invited' ? <Text variant="caption">{t('lobby.waiting', { name })}</Text> : null}
                        <Button label={t('lobby.open')} onPress={() => router.push(rcClaudePaths.play(id, open.id) as never)} />
                      </>
                    )
                  ) : canStart ? (
                    <Button label={t('lobby.invite', { name })} loading={start.isPending} onPress={() => start.mutate(scenario)} />
                  ) : (
                    <Text variant="caption">{t('lobby.locked')}</Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(rcClaudePaths.preview(id, scenario.scenarioId) as never)}
                    style={styles.previewLink}
                  >
                    <Text style={styles.previewText}>{`${t('lobby.preview')} ›`}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
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
    gap: space.xl,
  },
  flex: { flex: 1 },
  intro: { gap: space.sm },
  point: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.halalPink, marginTop: 8 },
  scenario: {
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  scenarioArt: { width: '100%', overflow: 'hidden', backgroundColor: color.sand },
  scenarioBody: { padding: space.lg, gap: space.sm },
  previewLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'center' },
  previewText: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color.gold },
});
