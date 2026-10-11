import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { fetchConnection } from '@/api/connections';
import { Pill, ProgressLine } from '@/components/halalCards/CardParts';
import { PlayBody } from '@/components/halalCards/play/PlayBody';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { findActivity } from '@/halalCards/content';
import { useCardsCopy } from '@/halalCards/copy';
import { currentTurn, progressOf } from '@/halalCards/engine/session';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import { soloAdvance, soloAnswer, soloStart, soloView, type SoloRun } from '@/halalCards/solo';
import { queryKeys } from '@/lib/queryClient';
import { layout, space } from '@/theme/tokens';

/**
 * A free member's preview of a Lab workshop or an Adventure, played alone.
 * Nothing leaves the phone: no session, no answers, no messages.
 */
export default function SoloScreen() {
  const { id, activityId } = useLocalSearchParams<{ id: string; activityId: string }>();
  const copy = useCardsCopy();
  const found = findActivity(activityId);
  const activity = found && found.soloPreview ? found : undefined;
  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const [run, setRun] = useState<SoloRun | null>(() => (activity ? soloStart(activity) : null));
  const session = useMemo(() => (activity && run ? soloView(activity, run) : null), [activity, run]);

  if (!activity || !run || !session) {
    return (
      <Screen>
        <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
        <ErrorState title={copy('errorTitle')} message={copy('errorBody')} />
      </Screen>
    );
  }

  const turn = session.status === 'active' ? currentTurn(activity, session) : undefined;

  return (
    <Screen>
      <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
      <View style={styles.top}>
        <Text variant="micro" center>{`${copy(`kind.${activity.kind}`)} · ${activity.title}`}</Text>
        <ProgressLine value={progressOf(activity, run.state)} />
        <View style={styles.badge}>
          <Pill label={copy('soloBadge')} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <PlayBody
            key={run.version === 1 ? 'fresh' : 'run'}
            session={session}
            activity={activity}
            turn={turn}
            partnerName={connection.data?.profile.firstName ?? ''}
            connectionId={id}
            onAnswer={(key, answer) => setRun((current) => (current ? soloAnswer(activity, current, key, answer) : current))}
            onAdvance={(state) => setRun((current) => (current ? soloAdvance(current, state) : current))}
            busy={false}
            solo
            onReplay={() => setRun(soloStart(activity))}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    gap: space.sm,
    paddingBottom: space.md,
  },
  badge: { alignItems: 'center' },
  scroll: { paddingBottom: 60 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    gap: space.lg,
  },
});
