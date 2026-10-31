import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { fetchConnections } from '@/api/connections';
import { fetchMyProfile } from '@/api/profile';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { StretchScrollView } from '@/components/ui/StretchScrollView';
import { Text } from '@/components/ui/Text';
import { SettingsTab } from '@/components/you/SettingsTab';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { RTL_LAYOUT } from '@/lib/rtl';
import { useRound } from '@/state/round';
import { space } from '@/theme/tokens';

/**
 * Settings, opened from the gear in the top right of the main screens. It used
 * to be a third tab under You; the gear now turns into place as it opens.
 */
export default function SettingsScreen() {
  const { t, isRTL } = useI18n();
  const { live } = useRound();
  const profileQuery = useQuery({ queryKey: queryKeys.profile('me'), queryFn: fetchMyProfile });
  const connectionsQuery = useQuery({ queryKey: queryKeys.connections, queryFn: fetchConnections });

  const profile = profileQuery.data;
  return (
    <Screen style={isRTL ? styles.rtl : undefined}>
      <ScreenHeader action="back" />
      <View style={[styles.title, isRTL && styles.rowReverse]}>
        <View style={styles.titleText}>
          <Text variant="displaySmall">{t('you.tab.settings')}</Text>
          <Text variant="caption">{t('you.subtitle.settings')}</Text>
        </View>
      </View>

      {profileQuery.isPending ? <LoadingState label={t('you.loading')} /> : null}
      {profileQuery.isError ? (
        <ErrorState title={t('you.errorTitle')} message={t('you.errorBody')} onRetry={() => void profileQuery.refetch()} />
      ) : null}
      {profile ? (
        <StretchScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(260)}>
            <SettingsTab
              liveCount={live.length}
              openConnections={(connectionsQuery.data ?? []).length}
              profilePaused={profile.isPaused ?? false}
              gender={profile.gender}
            />
          </Animated.View>
        </StretchScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.xl, paddingTop: 6, paddingBottom: 4, width: '100%', maxWidth: 720, alignSelf: 'center' },
  titleText: { flex: 1, gap: 2 },
  content: { paddingHorizontal: space.xl, paddingTop: 16, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
