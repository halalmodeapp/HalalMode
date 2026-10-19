import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { fetchConnection } from '@/api/connections';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ChallengePlay } from '@/components/relationshipChallengeClaude/ChallengePlay';
import { rcClaudePaths } from '@/components/relationshipChallengeClaude/paths';
import { useRcClaudeLocal } from '@/components/relationshipChallengeClaude/useRcClaudeSession';
import { ErrorState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { backOr } from '@/halalCards/navigation';
import { findRcScenario } from '@/halalCards/relationshipChallengeClaude/scenarios';
import { rcCopy, type RcCopyKey } from '@/halalCards/relationshipChallengeClaude/strings';
import type { RcScenario } from '@/halalCards/relationshipChallengeClaude/types';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { layout, space } from '@/theme/tokens';

/**
 * The local preview: one phone, both seats, the same engine and screen as a
 * real session. Nothing is written to the server or shown to anyone else.
 */
export default function RcClaudePreviewScreen() {
  const { id, scenario: scenarioId } = useLocalSearchParams<{ id: string; scenario: string }>();
  const { language } = useI18n();
  const t = (key: RcCopyKey) => rcCopy(language, key);
  const scenario = findRcScenario(scenarioId);

  if (!scenario) {
    return (
      <Screen>
        <ScreenHeader onAction={() => backOr(rcClaudePaths.lobby(id))} />
        <ErrorState title={t('stale.title')} message={t('stale.body')} />
      </Screen>
    );
  }
  return <Preview connectionId={id} scenario={scenario} />;
}

function Preview({ connectionId, scenario }: { connectionId: string; scenario: RcScenario }) {
  const { language } = useI18n();
  const t = (key: RcCopyKey) => rcCopy(language, key);
  const connection = useQuery({ queryKey: queryKeys.connection(connectionId), queryFn: () => fetchConnection(connectionId) });
  const local = useRcClaudeLocal(scenario);
  const partnerName = connection.data?.profile.firstName ?? t(local.seat === 'host' ? 'preview.guest' : 'preview.host');

  return (
    <Screen>
      <ScreenHeader onAction={() => backOr(rcClaudePaths.lobby(connectionId))} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <View style={styles.intro}>
            <Text variant="microAccent" center>{t('preview.title')}</Text>
            <Text variant="caption" center>{t('preview.body')}</Text>
          </View>
          <ChallengePlay
            model={{
              scenario,
              state: local.state,
              mySeat: local.seat,
              partnerName,
              dispatch: local.dispatch,
              pending: false,
              reconnecting: false,
              onExit: () => router.replace(rcClaudePaths.lobby(connectionId) as never),
              preview: { onSeat: local.setSeat, onReset: local.reset },
            }}
          />
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
  intro: { gap: space.xs },
});
