import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDisplayNameAvailableAt, updateMyProfile } from '@/api/profile';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { queryKeys } from '@/lib/queryClient';
import { color, radius, space } from '@/theme/tokens';
import { guardNavigation } from '@/state/unsavedChanges';

export function ProfileName({ name, memberId }: { name: string; memberId: string }) {
  const { t, localeTag, isRTL } = useI18n();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(name);
  const key = ['display-name-available', memberId];
  const availability = useQuery({ queryKey: key, queryFn: fetchDisplayNameAvailableAt, enabled: open });
  const save = useMutation({
    mutationFn: () => updateMyProfile({ name: draft.trim(), firstName: draft.trim() }),
    onSuccess: () => {
      setOpen(false);
      void client.invalidateQueries({ queryKey: queryKeys.profile('me') });
      void client.invalidateQueries({ queryKey: queryKeys.profileReadiness });
      void client.invalidateQueries({ queryKey: key });
    },
    onError: () => { void availability.refetch(); },
  });
  const editableAt = availability.data ? new Date(availability.data) : null;
  const coolingDown = editableAt && editableAt.getTime() > Date.now();
  const close = () => { if (!save.isPending) setOpen(false); };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('profile.editDisplayName')}
        style={[styles.name, isRTL && styles.reverse]}
        onPress={() => guardNavigation(() => {
          setDraft(name);
          save.reset();
          setOpen(true);
        })}
      >
        <Text variant="displaySmall">{name}</Text>
        <Text variant="caption" style={styles.edit} accessibilityElementsHidden importantForAccessibility="no">✎</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <View style={styles.scrim}>
          <View style={styles.card} accessibilityViewIsModal>
            <Text variant="displaySmall">{t('profile.editDisplayName')}</Text>
            {availability.isPending ? <Text variant="caption">{t('you.loading')}</Text> : null}
            {availability.isError ? (
              <Button label={t('common.tryAgain')} onPress={() => void availability.refetch()} />
            ) : null}
            {coolingDown ? (
              <Text variant="bodySmall">{t('profile.nameAvailableAt', { date: editableAt.toLocaleDateString(localeTag) })}</Text>
            ) : availability.isSuccess ? (
              <>
                <Field label={t('profile.displayName')} value={draft} onChangeText={setDraft} editable={!save.isPending} maxLength={60} />
                {save.isError ? <Text accessibilityRole="alert" variant="caption">{t('profile.nameSaveError')}</Text> : null}
                <Button label={t('profile.save')} loading={save.isPending}
                  disabled={draft.trim().length < 2 || draft.trim() === name}
                  onPress={() => save.mutate()} />
              </>
            ) : null}
            <Button variant="quiet" label={t('common.cancel')} onPress={close} disabled={save.isPending} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  name: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44 },
  reverse: { flexDirection: 'row-reverse' },
  edit: { color: color.inkSoft },
  scrim: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl, backgroundColor: 'rgba(10,10,10,0.45)' },
  card: { width: '100%', maxWidth: 380, backgroundColor: color.surface, borderRadius: radius.xl, padding: space.xl, gap: space.md },
});
