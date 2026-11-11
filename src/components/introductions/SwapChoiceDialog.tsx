import { useState } from 'react';

import { PickOneDialog } from '@/components/introductions/PickOneDialog';
import { useI18n } from '@/i18n';
import { useRound } from '@/state/round';

export interface SwapChoiceDialogProps {
  /** Someone the member tried to choose while already at their limit; null hides the dialog. */
  pendingId: string | null;
  /** Called once the dialog closes, with whether the swap was made. */
  onClose: (switched: boolean) => void;
}

/**
 * Asks who to swap out when the member is at their limit, so a choice is never
 * dropped silently. Used wherever someone can be chosen.
 */
export function SwapChoiceDialog({ pendingId, onClose }: SwapChoiceDialogProps) {
  const { t } = useI18n();
  const { live, selected, keepLimit, switchSelection } = useRound();
  // The pick belongs to one pending person; a new one starts from the oldest choice.
  const [pick, setPick] = useState<{ pendingId: string | null; swapOutId: string }>();
  const swapOutId = pick?.pendingId === pendingId ? pick.swapOutId : selected[0] ?? null;

  const chosen = selected
    .map((id) => live.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item);
  const pendingName = live.find((item) => item.id === pendingId)?.profile.firstName ?? '';

  return (
    <PickOneDialog
      visible={pendingId !== null}
      introductions={chosen}
      selectedId={swapOutId}
      onSelect={(id) => setPick({ pendingId, swapOutId: id })}
      title={t('daily.limitTitle', { limit: keepLimit })}
      body={t('daily.limitBody', { name: pendingName })}
      confirmLabel={t('daily.switchSelection')}
      cancelLabel={t('common.cancel')}
      onConfirm={() => {
        const switched = !!pendingId && !!swapOutId;
        if (switched) switchSelection(swapOutId, pendingId);
        onClose(switched);
      }}
      onCancel={() => onClose(false)}
    />
  );
}
