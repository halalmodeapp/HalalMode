import { View } from 'react-native';
import { useI18n } from '@/i18n';
import { styles } from './styles';
import type { StepProps } from './types';
import { StepHeading, Field } from './fields';

export function IdentityStep({
  draft,
  errors,
  patch,
}: StepProps) {
  const { t } = useI18n();
  return (
    <View>
      <StepHeading
        title={t('onboarding.nameTitle')}
        body={t('onboarding.nameBody')}
      />
      <View style={styles.form}>
        <Field
          label={t('onboarding.firstName')}
          value={draft.firstName}
          onChangeText={(value) => patch('firstName', value)}
          autoCapitalize="words"
          autoComplete="nickname"
          error={errors.firstName}
        />
        <Field
          label={t('onboarding.fullName')}
          value={draft.fullName}
          onChangeText={(value) => patch('fullName', value)}
          autoCapitalize="words"
          autoComplete="name"
          error={errors.fullName}
        />
      </View>
    </View>
  );
}
