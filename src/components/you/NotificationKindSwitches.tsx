import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Switch, View } from 'react-native';

import {
  fetchMutedNotificationKinds,
  setNotificationKind,
  SWITCHABLE_NOTIFICATIONS,
  type SwitchableNotification,
} from '@/api/notifications';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { color } from '@/theme/tokens';

const KEY = ['notification-muted-kinds'] as const;

/** One switch for each reminder, shown once notifications are on. */
export function NotificationKindSwitches() {
  const { t, isRTL } = useI18n();
  const client = useQueryClient();
  const muted = useQuery({ queryKey: KEY, queryFn: fetchMutedNotificationKinds });
  const toggle = useMutation({
    mutationFn: ({ kind, enabled }: { kind: SwitchableNotification; enabled: boolean }) =>
      setNotificationKind(kind, enabled),
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <View style={styles.wrap}>
      <Text variant="micro">{t('notifKinds.title')}</Text>
      {SWITCHABLE_NOTIFICATIONS.map((kind) => (
        <View key={kind} style={[styles.row, isRTL && styles.rowRTL]}>
          <Text variant="bodySmall" style={styles.label}>{t(`notifKinds.${kind}`)}</Text>
          <Switch
            accessibilityLabel={t(`notifKinds.${kind}`)}
            value={!(muted.data ?? []).includes(kind)}
            disabled={muted.isPending || toggle.isPending}
            onValueChange={(enabled) => toggle.mutate({ kind, enabled })}
            trackColor={{ false: color.sandDeep, true: color.ink }}
            thumbColor={color.white}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingTop: 6, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowRTL: { flexDirection: 'row-reverse' },
  label: { flex: 1 },
});
