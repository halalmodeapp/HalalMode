import { Linking, Platform, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { StretchScrollView } from '@/components/ui/StretchScrollView';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NotificationKindSwitches } from '@/components/you/NotificationKindSwitches';
import { useI18n } from '@/i18n';
import { RTL_LAYOUT } from '@/lib/rtl';
import { space } from '@/theme/tokens';

export default function NotificationSettingsScreen() {
  const { t, isRTL } = useI18n();
  return (
    <Screen style={isRTL ? RTL_LAYOUT : undefined}>
      <ScreenHeader action="back" />
      <StretchScrollView contentContainerStyle={styles.content}>
        <Text variant="displaySmall">{t('notifKinds.title')}</Text>
        <Card><NotificationKindSwitches /></Card>
        {Platform.OS !== 'web' ? (
          <Button label={t('settings.systemNotificationSettings')} variant="quiet" onPress={() => void Linking.openSettings()} />
        ) : null}
      </StretchScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', maxWidth: 720, width: '100%', gap: space.md, padding: space.xl },
});
