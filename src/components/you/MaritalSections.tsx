import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { fetchMyMaritalSettings, setMyMaritalPreferences, setMyMaritalStatus, type MaritalSettings } from '@/api/profile';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ACCEPTED_KEYS, acceptableStatuses, declarableStatuses, MARITAL_STATUS_KEYS } from '@/data/marital';
import { useI18n } from '@/i18n';
import { showNotice } from '@/lib/notice';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/state/toast';
import type { Gender, MaritalStatus } from '@/types';
import { styles } from './settingsTabStyles';

/**
 * Marital status belongs on the profile, and who they would accept belongs in
 * the preferences; both used to sit in Settings. They save as soon as they are
 * tapped, like every other choice of this kind.
 */
function useMaritalSettings() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: queryKeys.maritalSettings, queryFn: fetchMyMaritalSettings });
  const onError = () => showNotice(t('settings.activityErrorTitle'), t('settings.activityErrorBody'));
  const status = useMutation({
    mutationFn: setMyMaritalStatus,
    onSuccess: (_, next) => {
      queryClient.setQueryData<MaritalSettings>(queryKeys.maritalSettings, (current) => (current ? { ...current, status: next } : current));
      void queryClient.invalidateQueries({ queryKey: queryKeys.poolSize });
      toast.show(`✓ ${t('filters.saved')}`);
    },
    onError,
  });
  const accepted = useMutation({
    mutationFn: setMyMaritalPreferences,
    onSuccess: (_, next) => {
      queryClient.setQueryData<MaritalSettings>(queryKeys.maritalSettings, (current) => (current ? { ...current, accepted: next } : current));
      void queryClient.invalidateQueries({ queryKey: queryKeys.poolSize });
      toast.show(`✓ ${t('filters.saved')}`);
    },
    onError,
  });
  return { query, status, accepted };
}

/** "Marital status": what the member is, shown to everyone they are introduced to. */
export function MaritalStatusCard({ gender }: { gender: Gender }) {
  const { t } = useI18n();
  const { query, status } = useMaritalSettings();
  if (!query.data) return null;
  return (
    <Card>
      <Text variant="micro">{t('marital.statusTitle')}</Text>
      <Text variant="caption" style={styles.fajrMethodIntro}>{t('marital.statusBody')}</Text>
      <View>
        {declarableStatuses(gender).map((option) => (
          <MaritalOption
            key={option}
            title={t(MARITAL_STATUS_KEYS[option])}
            selected={query.data?.status === option}
            kind="radio"
            disabled={status.isPending}
            testID={`profile.marital.status.${option}`}
            onPress={() => status.mutate(option)}
          />
        ))}
      </View>
    </Card>
  );
}

/** "Who would you accept": the statuses a match may have, at least one always on. */
export function MaritalPreferencesCard({ gender }: { gender: Gender }) {
  const { t } = useI18n();
  const { query, accepted } = useMaritalSettings();
  if (!query.data) return null;
  const toggle = (option: MaritalStatus) => {
    const current = query.data?.accepted ?? [];
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    // At least one choice stays on, or nobody could be introduced.
    if (next.length > 0) accepted.mutate(next);
  };
  return (
    <Card>
      <Text variant="micro">{t('marital.prefTitle')}</Text>
      <Text variant="caption" style={styles.fajrMethodIntro}>{t('marital.prefQuestion')}</Text>
      <View>
        {acceptableStatuses(gender).map((option) => (
          <MaritalOption
            key={option}
            title={t(ACCEPTED_KEYS[option])}
            selected={query.data?.accepted.includes(option) ?? false}
            kind="checkbox"
            disabled={accepted.isPending}
            testID={`preferences.marital.accepts.${option}`}
            onPress={() => toggle(option)}
          />
        ))}
      </View>
      <Text variant="caption" style={styles.fajrMethodIntro}>{t('marital.prefNote')}</Text>
    </Card>
  );
}

function MaritalOption({
  title,
  selected,
  kind,
  disabled,
  testID,
  onPress,
}: {
  title: string;
  selected: boolean;
  kind: 'radio' | 'checkbox';
  disabled: boolean;
  testID: string;
  onPress: () => void;
}) {
  const { isRTL } = useI18n();
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityLabel={title}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.fajrMethodOption,
        isRTL && styles.rowReverse,
        selected && styles.fajrMethodOptionSelected,
        pressed && !disabled && styles.openRowPressed,
      ]}
    >
      <View style={styles.fajrMethodCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <View style={[kind === 'radio' ? styles.fajrRadio : styles.maritalBox, selected && styles.fajrRadioSelected, selected && kind === 'checkbox' && styles.maritalBoxOn]}>
        {selected ? (kind === 'radio' ? <View style={styles.fajrRadioDot} /> : <Text style={styles.maritalTick}>✓</Text>) : null}
      </View>
    </Pressable>
  );
}
