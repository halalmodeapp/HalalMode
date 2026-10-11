import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fetchConnection } from '@/api/connections';
import { PlayCard, ProgressLine, Waiting } from '@/components/halalCards/CardParts';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { AdventurePlay } from '@/components/halalCards/play/AdventurePlay';
import { LabPlay } from '@/components/halalCards/play/LabPlay';
import { QuizPlay } from '@/components/halalCards/play/QuizPlay';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { progressOf } from '@/halalCards/engine/session';
import { useCardsSession } from '@/halalCards/hooks';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import type { ActivityState } from '@/halalCards/types';
import { queryKeys } from '@/lib/queryClient';
import { showNotice } from '@/lib/notice';
import { color, font, layout, space } from '@/theme/tokens';

export default function PlayScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const copy = useCardsCopy();
  const [leaveAsk, setLeaveAsk] = useState(false);
  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const { query, session, activity, turn, answer, advance, respond, cancel } = useCardsSession(id, sessionId);

  if (query.isPending || connection.isPending) {
    return (
      <Screen>
        <LoadingState label={copy('loading')} />
      </Screen>
    );
  }
  if (query.isError || !session || !activity || !connection.data) {
    return (
      <Screen>
        <ScreenHeader onAction={() => backOr(cardsPaths.hub(id))} />
        <ErrorState
          title={copy('errorTitle')}
          message={copy('errorBody')}
          onRetry={() => {
            void query.refetch();
            void connection.refetch();
          }}
        />
      </Screen>
    );
  }

  const name = connection.data.profile.firstName;
  const busy = answer.isPending || advance.isPending;
  const failed = () => showNotice(copy('brand'), copy('actionError'));
  const onAnswer = (key: string, value: unknown) => answer.mutate({ key, answer: value }, { onError: failed });
  const onAdvance = (state: ActivityState) => advance.mutate({ state, version: session.version });
  const playable = session.status === 'active' || session.status === 'completed';

  return (
    <Screen>
      <ScreenHeader
        onAction={() => backOr(cardsPaths.hub(id))}
        trailing={
          session.status === 'active' ? (
            <Pressable accessibilityRole="button" onPress={() => setLeaveAsk(true)} hitSlop={10}>
              <Text style={styles.leave}>{copy('leave')}</Text>
            </Pressable>
          ) : undefined
        }
      />
      <View style={styles.top}>
        <Text variant="micro" center>{`${copy(`kind.${activity.kind}`)} · ${activity.title}`}</Text>
        {playable ? <ProgressLine value={progressOf(activity, session.state)} /> : null}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {session.status === 'invited' ? (
            <PlayCard dealKey="invite">
              <Illustration image={activity.cover} aspectRatio={4 / 5}>
                <OverlayText kind="eyebrow">{copy(`kind.${activity.kind}`)}</OverlayText>
                <OverlayText kind="titleLarge">{activity.title}</OverlayText>
                <OverlayText kind="body">{activity.tagline}</OverlayText>
              </Illustration>
              {session.mySeat === 'host' ? (
                <>
                  <Text variant="microAccent">{copy('inviteSent')}</Text>
                  <Text variant="bodySmall">{copy('inviteSentBody', { name })}</Text>
                  <Waiting label={copy('waitingAccept', { name })} />
                  <Button label={copy('cancelInvite')} variant="quiet" onPress={() => cancel.mutate(undefined, { onError: failed })} />
                </>
              ) : (
                <>
                  <Text variant="microAccent">{copy('invitedYou', { name })}</Text>
                  <Text variant="bodySmall">{activity.description}</Text>
                  <Button label={copy('accept')} loading={respond.isPending} onPress={() => respond.mutate(true, { onError: failed })} />
                  <Button label={copy('decline')} variant="secondary" onPress={() => respond.mutate(false, { onError: failed })} />
                </>
              )}
            </PlayCard>
          ) : session.status === 'declined' || session.status === 'cancelled' ? (
            <PlayCard dealKey="ended">
              <Text variant="display">{session.status === 'declined' ? copy('declinedTitle') : copy('cancelledTitle')}</Text>
              <Text variant="body">
                {session.status === 'declined' && session.mySeat === 'host' ? copy('declinedBody', { name }) : copy('cancelledBody')}
              </Text>
              <Button label={copy('brand')} onPress={() => router.replace(cardsPaths.hub(id) as never)} />
            </PlayCard>
          ) : activity.kind === 'lab' ? (
            <LabPlay {...{ session, activity, turn, partnerName: name, connectionId: id, onAnswer, onAdvance, busy }} />
          ) : activity.kind === 'quiz' ? (
            <QuizPlay {...{ session, activity, turn, partnerName: name, connectionId: id, onAnswer, onAdvance, busy }} />
          ) : (
            <AdventurePlay {...{ session, activity, turn, partnerName: name, connectionId: id, onAnswer, onAdvance, busy }} />
          )}
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={leaveAsk}
        title={copy('leaveTitle')}
        body={copy('leaveBody')}
        confirmLabel={copy('leaveConfirm')}
        cancelLabel={copy('keepPlaying')}
        onConfirm={() => {
          setLeaveAsk(false);
          cancel.mutate(undefined, { onError: failed });
        }}
        onCancel={() => setLeaveAsk(false)}
      />
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
  scroll: { paddingBottom: 60 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    gap: space.lg,
  },
  leave: { fontFamily: font.body, fontSize: 12, color: color.faint },
});
