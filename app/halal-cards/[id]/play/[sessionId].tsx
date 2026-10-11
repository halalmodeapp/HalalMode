import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fetchConnection } from '@/api/connections';
import { StaleSessionError } from '@/api/halalCards';
import { PlayCard, ProgressLine, Waiting } from '@/components/halalCards/CardParts';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { PlayBody } from '@/components/halalCards/play/PlayBody';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { contentMatches, progressOf } from '@/halalCards/engine/session';
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
  const onAdvance = (state: ActivityState) =>
    advance.mutate(
      { state, version: session.version },
      { onError: (error) => (error instanceof StaleSessionError ? undefined : failed()) }
    );
  const playable = session.status === 'active' || session.status === 'completed';
  const stale = playable && !contentMatches(activity, session);
  const replay = () => router.replace(cardsPaths.activity(id, activity.id) as never);

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
        {playable && !stale ? <ProgressLine value={progressOf(activity, session.state)} /> : null}
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
                  {activity.kind === 'adventure' ? <Text variant="caption">{copy('framing.adventure')}</Text> : null}
                  <Button label={copy('accept')} loading={respond.isPending} onPress={() => respond.mutate(true, { onError: failed })} />
                  <Button label={copy('decline')} variant="secondary" onPress={() => respond.mutate(false, { onError: failed })} />
                </>
              )}
            </PlayCard>
          ) : session.status === 'declined' || session.status === 'cancelled' || session.status === 'expired' ? (
            <PlayCard dealKey="ended">
              <Text variant="display">
                {session.status === 'declined' ? copy('declinedTitle') : session.status === 'expired' ? copy('expiredTitle') : copy('cancelledTitle')}
              </Text>
              <Text variant="body">
                {session.status === 'declined' && session.mySeat === 'host'
                  ? copy('declinedBody', { name })
                  : session.status === 'expired'
                    ? copy('expiredBody')
                    : copy('cancelledBody')}
              </Text>
              <Button label={copy('replay')} onPress={replay} />
              <Button label={copy('backToChat')} variant="secondary" onPress={() => router.replace(cardsPaths.chat(id) as never)} />
            </PlayCard>
          ) : stale ? (
            <PlayCard dealKey="stale">
              <Text variant="display">{copy('staleTitle')}</Text>
              <Text variant="body">{copy('staleBody')}</Text>
              <Button
                label={copy('restart')}
                onPress={() =>
                  session.status === 'active' ? cancel.mutate(undefined, { onSuccess: replay, onError: failed }) : replay()
                }
              />
            </PlayCard>
          ) : (
            <PlayBody
              session={session}
              activity={activity}
              turn={turn}
              partnerName={name}
              connectionId={id}
              onAnswer={onAnswer}
              onAdvance={onAdvance}
              busy={busy}
              onReplay={replay}
            />
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
  leave: { fontFamily: font.body, fontSize: 12, color: color.faint, padding: space.xs },
});
