import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { fetchMyBlockedMembers, unblockMyMember } from '@/api/safety';
import { Button } from '@/components/ui/Button';
import { ActionIcon } from '@/components/ui/ActionIcon';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showNotice } from '@/lib/notice';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { color, font, layout, radius, space } from '@/theme/tokens';
import { testIds } from '@/lib/testIds';
import { RTL_LAYOUT } from '@/lib/rtl';

export function BlockedMembersSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, isRTL } = useI18n();
  const queryClient = useQueryClient();
  const blockedQuery = useQuery({
    queryKey: ['blocked-members'],
    queryFn: fetchMyBlockedMembers,
    enabled: visible,
  });
  const unblock = useMutation({
    mutationFn: unblockMyMember,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['blocked-members'] }),
    onError: () => showNotice(t('settings.blockedErrorTitle'), t('settings.blockedErrorBody')),
  });

  // Our own dialog: Alert with buttons never shows in a browser, so on the web
  // nobody could ever be unblocked.
  const [pending, setPending] = useState<{ id: string; firstName: string } | null>(null);
  const confirmUnblock = (id: string, firstName: string) => setPending({ id, firstName });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.sheet, isRTL && styles.rtl]}
          accessibilityViewIsModal
          testID={testIds.settings.blocked}
        >
          <View style={[styles.header, isRTL && styles.rowReverse]}>
            <View style={styles.headerText}>
              <Text testID={testIds.settings.blockedTitle} variant="displaySmall">{t('settings.blocked')}</Text>
              <Text variant="caption">{t('settings.blockedSheetBody')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.dismiss')} onPress={onClose} style={styles.close}>
              <ActionIcon name="close" size={18} color={color.ink} />
            </Pressable>
          </View>

          {blockedQuery.isPending ? (
            <ActivityIndicator
              accessibilityLabel={t('common.loading')}
              color={color.ink}
              style={styles.loading}
            />
          ) : null}
          {blockedQuery.isError ? (
            <View style={styles.empty} accessibilityRole="alert">
              <Text variant="bodySmall">{t('settings.blockedLoadError')}</Text>
              <Button label={t('common.tryAgain')} variant="secondary" onPress={() => void blockedQuery.refetch()} />
            </View>
          ) : null}
          {!blockedQuery.isPending && !blockedQuery.isError && blockedQuery.data?.length === 0 ? (
            <View style={styles.empty}><Text variant="bodySmall">{t('settings.blockedEmpty')}</Text></View>
          ) : null}
          {blockedQuery.data?.length ? (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {blockedQuery.data.map((member) => (
                <Card
                  key={member.id}
                  tone="filled"
                  style={{ ...styles.member, ...(isRTL ? styles.rowReverse : {}) }}
                >
                  <View style={styles.memberText}>
                    <Text variant="label">{member.firstName}</Text>
                    <Text variant="caption">{[member.city, member.country].filter(Boolean).join(', ')}</Text>
                  </View>
                  <Button
                    label={t('settings.unblockAction')}
                    variant="secondary"
                    block={false}
                    loading={unblock.isPending && unblock.variables === member.id}
                    onPress={() => confirmUnblock(member.id, member.firstName)}
                  />
                </Card>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
      <ConfirmDialog
        visible={pending !== null}
        title={t('settings.unblockTitle')}
        body={t('settings.unblockBody', { name: pending?.firstName ?? '' })}
        confirmLabel={t('settings.unblockAction')}
        cancelLabel={t('settings.notNow')}
        onConfirm={() => {
          if (pending) unblock.mutate(pending.id);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 10, 10, 0.38)' },
  sheet: {
    // A Modal renders outside the navigator, so it does not inherit the app's
    // width. Without this it fills the whole monitor.
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center', maxHeight: '78%', backgroundColor: color.surface, borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, padding: space.xl, gap: 16 },
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' },
  headerText: { flex: 1, gap: 4 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loading: { paddingVertical: 30 },
  empty: { paddingVertical: 28, gap: 14, alignItems: 'center' },
  list: { gap: 10, paddingBottom: 16 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  memberText: { flex: 1, gap: 3 },
});
