import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useI18n } from '@/i18n';
import { answerUnsaved, useUnsavedQuestion } from '@/state/unsavedChanges';

/** "You haven't saved your changes. Would you like to save?" Yes or no. */
export function UnsavedChangesDialog({ onDiscard }: { onDiscard: () => void }) {
  const { t } = useI18n();
  const asking = useUnsavedQuestion();
  return (
    <ConfirmDialog
      visible={asking}
      title={t('unsaved.title')}
      body={t('unsaved.body')}
      confirmLabel={t('unsaved.yes')}
      cancelLabel={t('unsaved.no')}
      onConfirm={() => void answerUnsaved(true, onDiscard)}
      onCancel={() => void answerUnsaved(false, onDiscard)}
    />
  );
}
