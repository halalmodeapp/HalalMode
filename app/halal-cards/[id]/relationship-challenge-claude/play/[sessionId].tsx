import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fetchConnection } from '@/api/connections';
import { PlayCard, Waiting } from '@/components/halalCards/CardParts';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ChallengePlay } from '@/components/relationshipChallengeClaude/ChallengePlay';
import { rcClaudePaths } from '@/components/relationshipChallengeClaude/paths';
import { useRcClaudeSession } from '@/components/relationshipChallengeClaude/useRcClaudeSession';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { backOr, cardsPaths } from '@/halalCards/navigation';
import { rcContentMatches } from '@/halalCards/relationshipChallengeClaude/engine';
import { rcCopy, rcText, type RcCopyKey } from '@/halalCards/relationshipChallengeClaude/strings';
import { useI18n } from '@/i18n';
import { showNotice } from '@/lib/notice';
import { queryKeys } from '@/lib/queryClient';
import { font, layout, color, space } from '@/theme/tokens';

export default function RcClaudePlayScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { language } = useI18n();
  const t = (key: RcCopyKey, params?: Record<string, string | number>) => rcCopy(language, key, params);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const connection = useQuery({ queryKey: queryKeys.connection(id), queryFn: () => fetchConnection(id) });
  const game = useRcClaudeSession(id, sessionId);
  const { session, scenario, state } = game;

  if (game.query.isPending || connection.isPending) {
    return (
      <Screen>
        <LoadingState label={t('brand')} />
      </Screen>
    );
  }
  if (!session || !scenario || !connection.data) {
    return (
      <Screen>
        <ScreenHeader onAction={() => backOr(rcClaudePaths.lobby(id))} />
        <ErrorState
          title={t('ended.title')}
          message={t('reconnecting')}
          onRetry={() => {
            void game.query.refetch();
            void connection.refetch();
          }}
        />
      </Screen>
    );
  }

  const name = connection.data.profile.firstName;
  const failed = () => showNotice(t('brand'), t('reconnecting'));
  const exit = () => router.replace(cardsPaths.hub(id) as never);
  const playable = session.status === 'active' || session.status === 'completed';
  const stale = playable && !rcContentMatches(scenario, session.state, session.contentVersion);

  return (
    <Screen>
      <ScreenHeader
        onAction={() => backOr(rcClaudePaths.lobby(id))}
        trailing={
          session.status === 'active' ? (
            <Pressable accessibilityRole="button" onPress={() => setLeaveAsk(true)} hitSlop={10} style={styles.leaveHit}>
              <Text style={styles.leave}>{t('leave')}</Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text variant="micro" center>{`${t('kind')} · ${rcText(language, scenario.titleKey)}`}</Text>
          {session.status === 'invited' ? (
            <PlayCard dealKey="invite">
              <Text variant="display">{rcText(language, scenario.titleKey)}</Text>
              <Text variant="bodySmall">{t('framing.body')}</Text>
              {session.mySeat === 'host' ? (
                <>
                  <Waiting label={t('lobby.waiting', { name })} />
                  <Button label={t('cancelInvite')} variant="quiet" onPress={() => game.cancel.mutate(undefined, { onError: failed })} />
                </>
              ) : (
                <>
                  <Text variant="microAccent">{t('lobby.invited', { name })}</Text>
                  <Button label={t('accept')} loading={game.respond.isPending} onPress={() => game.respond.mutate(true, { onError: failed })} />
                  <Button label={t('decline')} variant="secondary" onPress={() => game.respond.mutate(false, { onError: failed })} />
                </>
              )}
            </PlayCard>
          ) : session.status === 'declined' || session.status === 'cancelled' || session.status === 'expired' ? (
            <PlayCard dealKey="ended">
              <Text variant="display">{t('ended.title')}</Text>
              <Text variant="body">{t('ended.body')}</Text>
              <Button label={t('back')} onPress={exit} />
            </PlayCard>
          ) : stale || !state ? (
            <PlayCard dealKey="stale">
              <Text variant="display">{t('stale.title')}</Text>
              <Text variant="body">{t('stale.body')}</Text>
              <Button label={t('back')} onPress={() => router.replace(rcClaudePaths.lobby(id) as never)} />
            </PlayCard>
          ) : (
            <ChallengePlay
              model={{
                scenario,
                state,
                mySeat: session.mySeat,
                partnerName: name,
                dispatch: game.dispatch,
                pending: game.pending,
                reconnecting: game.reconnecting,
                onExit: exit,
              }}
            />
          )}
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={leaveAsk}
        title={t('leaveTitle')}
        body={t('leaveBody')}
        confirmLabel={t('leaveConfirm')}
        cancelLabel={t('keepPlaying')}
        onConfirm={() => {
          setLeaveAsk(false);
          game.cancel.mutate(undefined, { onError: failed });
        }}
        onCancel={() => setLeaveAsk(false)}
      />
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
  leaveHit: { minHeight: 44, justifyContent: 'center' },
  leave: { fontFamily: font.body, fontSize: 12, color: color.faint, padding: space.xs },
});
