import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { fetchConnection, fetchConnectionSummary, openConnection } from '@/api/connections';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { SafetyControl } from '@/components/safety/SafetyControl';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { queryKeys } from '@/lib/queryClient';
import { trackProductEvent } from '@/lib/analytics';
import { testIds } from '@/lib/testIds';
import { sanitizeCompatibilityBreakdown } from '@/lib/compatibilityBreakdown';
import { questionText, QUESTION_LIBRARY } from '@/data/questions';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import { alpha, color, radius, space } from '@/theme/tokens';
import type { CompatibilityBreakdownItem, CompatibilityTopic, QuestionAnswer } from '@/types';
import { RTL_LAYOUT } from '@/lib/rtl';

export default function RecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isRTL, t, language } = useI18n();
  const queryClient = useQueryClient();

  const connectionQuery = useQuery({
    queryKey: queryKeys.connection(id),
    queryFn: () => fetchConnection(id),
  });
  const connection = connectionQuery.data;

  const recap = connection?.recap ?? [];
  const connectionId = connection?.id;
  const compatibilityBreakdown = sanitizeCompatibilityBreakdown(connection?.compatibilityBreakdown);
  const alignedCount = recap.filter((item) => item.verdict === 'aligned').length;
  useEffect(() => {
    if (!connectionId) return;
    trackProductEvent('compatibility_recap_viewed', {
      aligned_count: alignedCount,
      topic_count: compatibilityBreakdown.length,
    });
  }, [connectionId, alignedCount, compatibilityBreakdown.length]);
  const summaryQuery = useQuery({
    queryKey: ['connection-summary', id, language],
    queryFn: () => fetchConnectionSummary(id, language),
    enabled: !!connectionId,
    staleTime: Infinity,
  });

  const openMutation = useMutation({
    mutationFn: () => openConnection(id),
    onSuccess: async () => {
      trackProductEvent('connection_opened');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.connection(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
      ]);
      router.replace(`/connection/${id}/chat`);
    },
  });
  if (connectionQuery.isPending) return <Screen><LoadingState label={t('common.loading')} /></Screen>;
  if (connectionQuery.isError || !connection) return (
    <Screen><ScreenHeader /><ErrorState title={t('connections.errorTitle')} message={t('connections.errorBody')} onRetry={() => void connectionQuery.refetch()} /></Screen>
  );

  return (
    <Screen style={isRTL ? styles.rtl : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          action="back"
          trailing={(
            <SafetyControl
              scope={{ kind: 'connection', id }}
              memberName={connection.profile.firstName}
            />
          )}
        />
        <View style={styles.header}>
          <Text variant="micro">{t('recap.step')}</Text>
          <Text variant="display" style={styles.title}>
            {t('recap.title')}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            {t('recap.body')}
          </Text>
        </View>

        <Card style={styles.summary}>
          {/* Named for what wrote it: the Halal Mode Bot when its summary is in,
              the app's own comparison otherwise. */}
          <Text variant="micro">{summaryQuery.data ? `✦ ${t('recap.botSummaryTitle')}` : t('recap.summaryTitle')}</Text>
          <Text style={styles.summaryText}>
            {summaryQuery.isPending
              ? t('recap.summaryWriting')
              : summaryQuery.data ?? builtInSummary(compatibilityBreakdown, t)}
          </Text>
        </Card>


        {connection.questions.some((item) => item.theirAnswer) ? (
          <View style={styles.answersSection}>
            <Text variant="label" style={styles.compatibilityTitle}>{t('recap.answersTitle')}</Text>
            {connection.questions.map((item) => (
              <AnswerPair key={item.questionId} item={item} theirName={connection.profile.firstName} />
            ))}
          </View>
        ) : null}

        {compatibilityBreakdown.length > 0 ? (
          <View testID={testIds.recap.compatibility} style={styles.compatibilitySection}>
            <Text variant="label" style={styles.compatibilityTitle}>{t('recap.compatibilityTitle')}</Text>
            <Text variant="bodySmall" style={styles.compatibilityBody}>{t('recap.compatibilityBody')}</Text>
            <View style={styles.compatibilityList}>
              {compatibilityBreakdown.map((item) => (
                <CompatibilityCard key={item.topic} item={item} />
              ))}
            </View>
          </View>
        ) : null}

        <Card tone="dark" style={styles.startHere}>
          <Text style={styles.startHereLabel}>{t('recap.start')}</Text>
          <Text style={styles.startHereQuote}>
            {t('recap.prompt')}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            testID={testIds.recap.open}
            label={t('recap.open')}
            loading={openMutation.isPending}
            onPress={() => openMutation.mutate()}
          />
          <Button
            label={t('recap.close')}
            variant="quiet"
            onPress={() => router.replace('/(tabs)/connections')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const topicKey: Record<CompatibilityTopic, TranslationKey> = {
  values: 'recap.compatibilityValues',
  marriage_timing: 'recap.compatibilityMarriageTiming',
  location_and_relocation: 'recap.compatibilityLocation',
  family_plans: 'recap.compatibilityFamilyPlans',
  conversation: 'recap.compatibilityConversation',
};

function CompatibilityCard({ item }: { item: CompatibilityBreakdownItem }) {
  const { t } = useI18n();
  const aligned = item.verdict === 'aligned';
  const title = t(topicKey[item.topic]);
  const status = aligned ? t('recap.compatibilityAligned') : t('recap.compatibilityDiscuss');
  const body = aligned ? t('recap.compatibilityAlignedBody') : t('recap.compatibilityDiscussBody');

  return (
    <View
      testID={`compatibility-topic-${item.topic}`}
      accessibilityLabel={`${title}. ${status}. ${body}`}
      style={styles.compatibilityCard}
    >
      <View style={styles.compatibilityCardHeader}>
        <Text variant="label" style={styles.compatibilityCardTitle}>{title}</Text>
        <View style={[styles.tag, aligned ? styles.tagAligned : styles.tagDiscuss]}>
          <Text style={[styles.tagLabel, aligned ? styles.tagLabelAligned : styles.tagLabelDiscuss]}>{status}</Text>
        </View>
      </View>
      <Text variant="bodySmall">{body}</Text>
    </View>
  );
}

/**
 * Used when no written summary is available: a sentence or two from the
 * profile comparison (practice, timing, location, family plans).
 */
function builtInSummary(items: CompatibilityBreakdownItem[], t: ReturnType<typeof useI18n>['t']): string {
  const name = (item: CompatibilityBreakdownItem) => t(topicKey[item.topic]).toLowerCase();
  // "a, b and c", not "a and b and c".
  const join = (list: CompatibilityBreakdownItem[]) => {
    const names = list.map(name);
    return names.length < 2
      ? names.join('')
      : `${names.slice(0, -1).join(', ')}${t('recap.and')}${names[names.length - 1]}`;
  };
  const aligned = items.filter((item) => item.verdict === 'aligned');
  const discuss = items.filter((item) => item.verdict !== 'aligned');
  if (!discuss.length) return t('recap.summaryAllAligned');
  const parts = [];
  if (aligned.length) parts.push(t('recap.summaryAligned', { topics: join(aligned) }));
  const first = join(discuss);
  parts.push(t('recap.summaryDiscuss', { topics: first.charAt(0).toUpperCase() + first.slice(1) }));
  return parts.join(' ');
}

/** One question, with both answers beneath it. */
function AnswerPair({ item, theirName }: { item: QuestionAnswer; theirName: string }) {
  const { t, language } = useI18n();
  const question = QUESTION_LIBRARY.find((entry) => entry.id === item.questionId);
  return (
    <View style={styles.pair}>
      <Text variant="label" style={styles.pairQuestion}>
        {question ? questionText(question, language) : item.questionId}
      </Text>
      <Text variant="micro" style={styles.pairWho}>{t('recap.you')}</Text>
      <Text variant="bodySmall">{item.myAnswer}</Text>
      <Text variant="micro" style={styles.pairWho}>{theirName}</Text>
      <Text variant="bodySmall">{item.theirAnswer ?? ''}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: space.gutterWide, paddingTop: 8 },
  title: { marginTop: 8 },
  subtitle: { marginTop: 10 },

  summary: { marginHorizontal: space.gutterWide, marginTop: 18, gap: 10 },
  summaryText: { fontFamily: 'Beiruti_400Regular', fontSize: 15, lineHeight: 23, color: color.ink },
  answersSection: { paddingHorizontal: space.gutterWide, marginTop: 28, gap: 10 },
  pair: {
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.xl,
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 6,
  },
  pairQuestion: { fontSize: 13.5, lineHeight: 19, marginBottom: 4 },
  pairWho: { marginTop: 6 },

  list: { paddingHorizontal: space.gutterWide, marginTop: 18, gap: 9 },
  card: {
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.xl,
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 9,
    alignItems: 'flex-start',
  },
  cardHeading: { fontSize: 12.5 },
  tag: {
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagAligned: { backgroundColor: 'rgba(47,93,74,0.09)' },
  tagDiscuss: { backgroundColor: 'rgba(138,106,52,0.1)' },
  tagLabel: {
    fontFamily: 'Beiruti_700Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  tagLabelAligned: { color: color.green },
  tagLabelDiscuss: { color: color.gold },

  compatibilitySection: { paddingHorizontal: space.gutterWide, marginTop: 28 },
  compatibilityTitle: { fontSize: 13, color: color.ink },
  compatibilityBody: { marginTop: 8, color: color.muted },
  compatibilityList: { marginTop: 14, gap: 9 },
  compatibilityCard: {
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  compatibilityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compatibilityCardTitle: { flex: 1, fontSize: 13 },

  startHere: {
    marginHorizontal: space.gutterWide,
    marginTop: 18,
    borderRadius: radius.panel,
  },
  startHereLabel: {
    fontFamily: 'Beiruti_600SemiBold',
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: '#B79A62',
  },
  startHereQuote: {
    marginTop: 9,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 17,
    lineHeight: 25,
    color: color.white,
  },

  actions: {
    paddingHorizontal: space.gutterWide,
    marginTop: 22,
    gap: 10,
  },
});
