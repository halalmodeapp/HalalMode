import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { fetchConnections } from '@/api/connections';
import { fetchMyPreferences, fetchMyProfile, fetchMyProfileReadiness } from '@/api/profile';
import { ReadyMoment } from '@/components/readiness/ReadyMoment';
import { BrandHeader } from '@/components/navigation/BrandHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { PrivateTab } from '@/components/you/PrivateTab';
import { ProfileTab } from '@/components/you/ProfileTab';
import { SettingsTab } from '@/components/you/SettingsTab';
import { useI18n } from '@/i18n';
import { trackProductEvent } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryClient';
import { useRound } from '@/state/round';
import { color, radius, space } from '@/theme/tokens';
import { RTL_LAYOUT } from '@/lib/rtl';

type Tab = 'profile' | 'private' | 'settings';

export default function YouScreen() {
  const { t, isRTL } = useI18n();
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>('profile');
  const { live } = useRound();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile('me'),
    queryFn: fetchMyProfile,
  });

  const preferencesQuery = useQuery({
    queryKey: queryKeys.preferences,
    queryFn: fetchMyPreferences,
  });

  const connectionsQuery = useQuery({
    queryKey: queryKeys.connections,
    queryFn: fetchConnections,
  });

  // The moment everything is complete — the last save of the profile or of the
  // preferences — is worth marking, and it is where introductions begin.
  // Only a change seen here counts, so a member who was already complete is
  // never shown it again on opening the screen.
  const router = useRouter();
  const queryClient = useQueryClient();
  const readinessQuery = useQuery({
    queryKey: queryKeys.profileReadiness,
    queryFn: fetchMyProfileReadiness,
    // Always ask again on opening: a Preferences save elsewhere may have
    // completed the checklist since this was last fetched.
    refetchOnMount: 'always',
  });
  const wasReady = useRef<boolean | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const ready = readinessQuery.data?.ready;
  useEffect(() => {
    if (ready === undefined) return;
    if (wasReady.current === false && ready) {
      setCelebrating(true);
      trackProductEvent('profile_completed');
    }
    wasReady.current = ready;
  }, [ready]);
  const startIntroductions = () => {
    setCelebrating(false);
    void queryClient.invalidateQueries({ queryKey: queryKeys.round });
    router.navigate('/(tabs)/daily');
  };

  useEffect(() => {
    if (requestedTab === 'profile' || requestedTab === 'private' || requestedTab === 'settings') {
      setTab(requestedTab);
    }
  }, [requestedTab]);

  if (profileQuery.isPending || preferencesQuery.isPending) {
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <LoadingState label={t('you.loading')} />
      </Screen>
    );
  }

  if (profileQuery.isError || preferencesQuery.isError || !profileQuery.data || !preferencesQuery.data) {
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <ErrorState
          title={t('you.errorTitle')}
          message={t('you.errorBody')}
          onRetry={() => {
            void profileQuery.refetch();
            void preferencesQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const profile = profileQuery.data;
  const preferences = preferencesQuery.data;
  const connections = connectionsQuery.data ?? [];

  return (
    <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
      <BrandHeader />

      <View style={styles.tabsRow}>
        <Segmented
          value={tab}
          onChange={setTab}
          testIDPrefix="you-tab"
          options={[
            { value: 'profile', label: t('you.tab.profile') },
            { value: 'private', label: t('you.tab.matching') },
            { value: 'settings', label: t('you.tab.settings') },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.identity, isRTL && styles.rowReverse]}>
          {/* The main photo, as members see it first. */}
          {profile.photos[0] ? (
            <Image source={profile.photos[0]} style={styles.mark} contentFit="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={styles.mark} />
          )}
          <View style={styles.identityText}>
            <Text variant="displaySmall" style={styles.name}>
              {profile.name}
            </Text>
            <Text variant="caption">
              {t(
                tab === 'profile'
                  ? 'you.subtitle.profile'
                  : tab === 'private'
                    ? 'you.subtitle.matching'
                    : 'you.subtitle.settings'
              )}
            </Text>
          </View>
        </View>

        {tab === 'profile' ? <ProfileTab profile={profile} preferences={preferences} onOpenPreferences={() => setTab('private')} /> : null}
        {tab === 'private' ? <PrivateTab preferences={preferences} /> : null}
        {tab === 'settings' ? (
          <SettingsTab
            liveCount={live.length}
            openConnections={connections.length}
            profilePaused={profile.isPaused ?? false}
          />
        ) : null}
      </ScrollView>
      <ReadyMoment
        visible={celebrating}
        name={profile.firstName || profile.name}
        onStart={startIntroductions}
        onLater={() => setCelebrating(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  // One column, a readable width, centred: on a wide screen the forms sit in
  // the middle with white space either side rather than splitting into panes.
  tabsRow: { paddingHorizontal: space.xl, paddingTop: 4, width: '100%', maxWidth: 720, alignSelf: 'center' },
  content: { paddingHorizontal: space.xl, paddingTop: 20, width: '100%', maxWidth: 720, alignSelf: 'center' },

  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
  },
  identityText: { flex: 1, gap: 5 },
  name: { fontSize: 22 },
});
