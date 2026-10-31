import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { fetchMyMaritalSettings, setMyMaritalPreferences, setMyMaritalStatus, type MaritalSettings } from '@/api/profile';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { ACCEPTED_KEYS, acceptableStatuses, declarableStatuses, MARITAL_STATUS_KEYS } from '@/data/marital';
import { useI18n } from '@/i18n';
import { showNotice } from '@/lib/notice';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/state/toast';
import type { Gender, MaritalStatus } from '@/types';

/**
 * Marital status belongs with the profile choices, and who they would accept
 * with the preferences; both used to sit in Settings. They save as soon as they
 * are tapped.
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

/** "Marital status", as one more profile choice among the others: what the member is, shown to everyone they are introduced to. */
export function MaritalStatusField({ gender, choiceStyle, chipsStyle }: { gender: Gender; choiceStyle?: StyleProp<ViewStyle>; chipsStyle?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { query, status } = useMaritalSettings();
  if (!query.data) return null;
  return (
    <View style={choiceStyle} testID="profile-marital-status">
      <Text variant="micro">{t('marital.statusTitle')}</Text>
      <View style={chipsStyle}>
        {declarableStatuses(gender).map((option) => (
          <Chip
            key={option}
            label={t(MARITAL_STATUS_KEYS[option])}
            selected={query.data?.status === option}
            onPress={() => {
              if (!status.isPending && query.data?.status !== option) status.mutate(option);
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** "Who would you accept": one more of the preferences, the statuses a match may have (at least one stays on). */
export function MaritalPreferencesField({ gender, sectionStyle, chipsStyle }: { gender: Gender; sectionStyle?: StyleProp<ViewStyle>; chipsStyle?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { query, accepted } = useMaritalSettings();
  if (!query.data) return null;
  const toggle = (option: MaritalStatus) => {
    const current = query.data?.accepted ?? [];
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    // At least one choice stays on, or nobody could be introduced.
    if (next.length > 0 && !accepted.isPending) accepted.mutate(next);
  };
  return (
    <View style={sectionStyle} testID="preferences-marital">
      <Text variant="micro">{t('marital.prefTitle')}</Text>
      <Text variant="caption">{t('marital.prefQuestion')}</Text>
      <View style={chipsStyle}>
        {acceptableStatuses(gender).map((option) => (
          <Chip
            key={option}
            label={t(ACCEPTED_KEYS[option])}
            selected={query.data?.accepted.includes(option) ?? false}
            showMark
            onPress={() => toggle(option)}
          />
        ))}
      </View>
      <Text variant="caption">{t('marital.prefNote')}</Text>
    </View>
  );
}
