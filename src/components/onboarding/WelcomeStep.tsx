import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { styles } from './styles';
import { Field, InfoRow } from './fields';

export function WelcomeStep({
  referralCode,
  onReferralCodeChange,
  referralError,
}: {
  referralCode: string;
  onReferralCodeChange: (value: string) => void;
  referralError?: string;
}) {
  const { t } = useI18n();
  return (
    <View>
      <Text variant="display" style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
      <Text variant="body" style={styles.copy}>{t('onboarding.welcomeBody')}</Text>
      <View style={styles.infoCard}>
        <InfoRow
          title={t('onboarding.peopleSeeTitle')}
          body={t('onboarding.peopleSeeBody')}
        />
        <InfoRow
          title={t('onboarding.privateTitle')}
          body={t('onboarding.privateBody')}
        />
        <InfoRow
          title={t('onboarding.savedTitle')}
          body={t('onboarding.savedBody')}
        />
      </View>
      <View style={styles.form}>
        <Field
          label={t('onboarding.referralLabel')}
          placeholder={t('onboarding.referralPlaceholder')}
          value={referralCode}
          onChangeText={(value) => onReferralCodeChange(value.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          error={referralError}
        />
      </View>
    </View>
  );
}
