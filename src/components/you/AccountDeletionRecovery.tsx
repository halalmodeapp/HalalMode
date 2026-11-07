import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { cancelMyAccountDeletion } from '@/api/account';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { useAuth } from '@/state/auth';
import { space } from '@/theme/tokens';

export function AccountDeletionRecovery({ recoverable, onKept }: { recoverable: boolean; onKept: () => Promise<unknown> }) {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const queries = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const act = async (keep: boolean) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      if (keep) {
        await cancelMyAccountDeletion();
        await queries.invalidateQueries();
        await onKept();
      } else await signOut();
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return <Screen>
    <ScrollView contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text variant="displaySmall">{t('account.recoveryTitle')}</Text>
      <Text>{t(recoverable ? 'settings.deleteConfirmBody' : 'account.recoveryEnded')}</Text>
      {failed ? <Text>{t('profile.connectionError')}</Text> : null}
      {recoverable ? <Button label={t('account.keep')} disabled={busy} onPress={() => void act(true)} /> : null}
      <Button label={t('account.continueLeaving')} variant="secondary" disabled={busy} onPress={() => void act(false)} />
    </ScrollView>
  </Screen>;
}
