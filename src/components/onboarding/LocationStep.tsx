import { Linking, Platform, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { styles } from './styles';
import type { StepProps } from './types';
import { StepHeading, InlineError } from './fields';

export function LocationStep({
  draft,
  errors,
  locating,
  onUseLocation,
  blocked,
}: Pick<StepProps, 'draft' | 'errors'> & {
  locating: boolean;
  onUseLocation: () => void;
  blocked: boolean;
}) {
  const { t } = useI18n();
  const chosen = Boolean(draft.city && draft.country);
  return (
    <View>
      <StepHeading
        title={t('onboarding.locationTitle')}
        body={t('onboarding.locationBody')}
      />
      <View style={styles.form}>
        <View style={styles.locationPanel}>
          <Text variant="label">
            {chosen
              ? `${draft.city}, ${draft.country}`
              : locating
                ? t('onboarding.locationFinding')
                : t('onboarding.locationPermissionBody')}
          </Text>
          {errors.city ? <InlineError message={errors.city} /> : null}
        </View>
        <Button
          label={chosen ? t('onboarding.useLocationAgain') : t('onboarding.useLocation')}
          loading={locating}
          onPress={onUseLocation}
        />
        {blocked && Platform.OS !== 'web' ? (
          <Button
            label={t('common.openSettings')}
            variant="secondary"
            onPress={() => void Linking.openSettings().catch(() => undefined)}
          />
        ) : null}
      </View>
    </View>
  );
}
