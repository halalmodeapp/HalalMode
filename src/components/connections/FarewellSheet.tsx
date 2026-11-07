import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { closeConnectionWithFarewell } from '@/api/connections';
import { KindChoiceSheet } from '@/components/ui/KindChoiceSheet';
import { useI18n } from '@/i18n';
import { FAREWELL_LABELS, FAREWELL_MAX, FAREWELL_REASONS, farewellWords } from '@/lib/farewell';
import { showNotice } from '@/lib/notice';
import { clearPrivateMediaCache } from '@/lib/privateMediaCache';
import { queryKeys } from '@/lib/queryClient';

/** Every voluntary close goes through here, from the chat or the recap, so nobody leaves without a farewell. */
export function useFarewellClose(connectionId: string) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reason, message }: { reason: string; message: string }) =>
      closeConnectionWithFarewell(connectionId, reason, message),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.messages(connectionId) });
      queryClient.removeQueries({ queryKey: queryKeys.connection(connectionId) });
      queryClient.removeQueries({ queryKey: ['private-media'] });
      await clearPrivateMediaCache();
      void queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      router.replace('/(tabs)/connections');
    },
    onError: () => showNotice(t('chat.closeErrorTitle'), t('chat.closeErrorBody')),
  });
}

export function FarewellSheet({
  visible,
  name,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  name: string;
  onConfirm: (reason: string, message: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <KindChoiceSheet
      visible={visible}
      title={t('chat.closeTitle')}
      body={t('farewell.body', { name })}
      options={FAREWELL_REASONS.map((value) => ({ value, label: t(FAREWELL_LABELS[value]) }))}
      writeOption="other"
      placeholder={t('farewell.placeholder')}
      maxLength={FAREWELL_MAX}
      preview={(reason, note) => (reason === 'other' && !note ? null : farewellWords(reason, note, t))}
      confirmLabel={t('chat.closeConfirm')}
      cancelLabel={t('chat.keep')}
      choiceRequired
      onConfirm={(reason, note) => onConfirm(reason ?? 'fit', note)}
      onCancel={onCancel}
    />
  );
}
