import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { startCardsSession } from '@/api/halalCards';
import { fetchConnection } from '@/api/connections';
import { Pill } from '@/components/halalCards/CardParts';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { PremiumGate } from '@/components/halalCards/PremiumGate';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { canStartSession } from '@/halalCards/access';
import { findActivity } from '@/halalCards/content';
import { useCardsCopy } from '@/halalCards/copy';
import { startAdventure } from '@/halalCards/engine/adventure';
import { initialState } from '@/halalCards/engine/session';
import { useCardsAccess, useCardsSummary } from '@/halalCards/hooks';
import { firstTrack, inTrack } from '@/halalCards/present';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import type { Activity } from '@/halalCards/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { queryKeys } from '@/lib/queryClient';
import { showNotice } from '@/lib/notice';
import { useSession } from '@/state/session';
import { layout, radius, space } from '@/theme/tokens';

export default function ActivityDetail() {
  const { id, activityId } = useLocalSearchParams<{ id: string; activityId: string }>();
  const copy = useCardsCopy();
  const { tier } = useSession();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const activity = findActivity(activityId);

  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const access = useCardsAccess(id);
  const sessions = useCardsSummary(id);

  // Halal Mode introduces men and women to each other, so the member's own
  // gender is the other one; it decides which character they play.
  const myGender = connection.data?.profile.gender === 'female' ? 'male' : 'female';

  const start = useMutation({
    mutationFn: () => {
      if (!activity) throw new Error('Unknown activity.');
      return startCardsSession(id, activity.id, initialState(activity, myGender), activity.version ?? 1);
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cardsSessions(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cardsAccess(id) });
      router.replace(cardsPaths.play(id, session.id) as never);
    },
    onError: () => showNotice(copy('brand'), copy('actionError')),
  });

  if (!activity) {
    return (
      <Screen>
        <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
        <ErrorState title={copy('errorTitle')} message={copy('errorBody')} />
      </Screen>
    );
  }
  if (connection.isPending) {
    return (
      <Screen>
        <LoadingState label={copy('loading')} />
      </Screen>
    );
  }
  if (!connection.data) {
    return (
      <Screen>
        <ErrorState title={copy('errorTitle')} message={copy('errorBody')} onRetry={() => void connection.refetch()} />
      </Screen>
    );
  }

  const name = connection.data.profile.firstName;
  const open = sessions.data?.find(
    (session) => session.activityId === activity.id && (session.status === 'active' || session.status === 'invited')
  );
  const played = sessions.data?.some((session) => session.activityId === activity.id && session.status === 'completed');
  const canStart = canStartSession({ myTier: tier, access: access.data });
  const track = access.data?.track ?? 'getting_to_know';
  const laterNote = inTrack(activity, track) ? null : copy('laterTrack', { track: copy(`track.${firstTrack(activity)}`).toLowerCase() });
  // A free member previews this activity alone if it allows it, or else the
  // first workshop, so there is always something to try.
  const soloTarget = activity.soloPreview ? activity.id : 'lab-rule-zero';

  return (
    <Screen>
      <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} trailingLabel={copy(`kind.${activity.kind}`)} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.springify().damping(18)} style={styles.column}>
          <Illustration image={activity.cover} aspectRatio={4 / 5} style={styles.cover}>
            <OverlayText kind="eyebrow">{eyebrow(activity, copy)}</OverlayText>
            <OverlayText kind="titleLarge">{activity.title}</OverlayText>
            <OverlayText kind="body">{activity.tagline}</OverlayText>
          </Illustration>
          <View style={styles.pills}>
            <Pill label={copy('minutes', { count: activity.minutes })} />
            {activity.kind === 'adventure' ? activity.themes.map((theme) => <Pill key={theme} label={theme} />) : null}
          </View>
          <Text variant="body">{activity.description}</Text>

          {activity.kind === 'adventure' ? (
            <>
              <View style={styles.framing}>
                <Text variant="bodySmall">{copy('framing.adventure')}</Text>
              </View>
              <Roles activity={activity} myGender={myGender} partnerName={name} />
            </>
          ) : null}
          {laterNote ? <Pill label={laterNote} tone="gold" /> : null}

          <View style={styles.how}>
            <Text variant="micro">{copy('howItWorks')}</Text>
            <Text variant="bodySmall">
              {activity.kind === 'adventure'
                ? copy('how.adventure', { a: activity.roles.A.name, b: activity.roles.B.name })
                : copy(activity.kind === 'lab' ? 'how.lab' : 'how.quiz')}
            </Text>
          </View>

          {open ? (
            <Button label={copy('resume')} onPress={() => router.push(cardsPaths.play(id, open.id) as never)} />
          ) : canStart ? (
            <Button
              label={played ? copy('replay') : copy('invite', { name })}
              loading={start.isPending}
              onPress={() => start.mutate()}
            />
          ) : (
            <>
              <Text variant="caption" center>{copy('premiumPreview')}</Text>
              <PremiumGate partnerName={name} connectionId={id} onTrySolo={soloTarget ? () => router.push(cardsPaths.solo(id, soloTarget) as never) : undefined} />
            </>
          )}
          {played && !open && canStart ? <Text variant="caption" center>{copy('replayHint')}</Text> : null}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function eyebrow(activity: Activity, copy: ReturnType<typeof useCardsCopy>): string {
  if (activity.kind === 'lab') return `${copy('lab')} · ${activity.ruleLabel}`;
  if (activity.kind === 'quiz') return `${copy('kind.quiz')} · ${copy(`format.${activity.format}`)}`;
  return copy('kind.adventure');
}

function Roles({
  activity,
  myGender,
  partnerName,
}: {
  activity: Extract<Activity, { kind: 'adventure' }>;
  myGender: 'male' | 'female';
  partnerName: string;
}) {
  const copy = useCardsCopy();
  const roles = startAdventure(activity, myGender).roles;
  const mine = roles.A === 'host' ? activity.roles.A : activity.roles.B;
  const theirs = roles.A === 'host' ? activity.roles.B : activity.roles.A;
  return (
    <View style={styles.roles}>
      <View style={styles.role}>
        <Text variant="microAccent">{copy('youPlay', { name: mine.name })}</Text>
        <Text variant="bodySmall">{mine.sketch}</Text>
      </View>
      <View style={styles.role}>
        <Text variant="micro">{copy('theyPlay', { name: partnerName, role: theirs.name })}</Text>
        <Text variant="bodySmall">{theirs.sketch}</Text>
      </View>
    </View>
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
  cover: { borderRadius: radius.hero },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  how: { gap: space.xs, paddingVertical: space.sm },
  framing: { padding: space.md, borderRadius: radius.md, backgroundColor: 'rgba(138,106,52,0.08)' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  role: { flex: 1, minWidth: 150, gap: 4 },
});
