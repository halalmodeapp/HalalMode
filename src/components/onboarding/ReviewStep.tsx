import { Linking, Pressable, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import { documentFromStatus, type LegalConsentStatus } from '@/lib/legalConsent';
import { testIds } from '@/lib/testIds';
import { styles } from './styles';
import type { OnboardingDraft } from './types';
import { StepHeading, InlineError, ReviewRow } from './fields';
import { readableDate } from './validation';

export function ReviewStep({
  draft,
  birthDate,
  legalAccepted,
  onLegalAcceptedChange,
  sensitiveAccepted,
  onSensitiveAcceptedChange,
  legalError,
  legalStatus,
  legalStatusError,
  onRetryLegal,
}: {
  draft: OnboardingDraft;
  birthDate: string | null;
  legalAccepted: boolean;
  onLegalAcceptedChange: (value: boolean) => void;
  sensitiveAccepted: boolean;
  onSensitiveAcceptedChange: (value: boolean) => void;
  legalError?: string;
  legalStatus?: LegalConsentStatus;
  legalStatusError: boolean;
  onRetryLegal: () => void;
}) {
  const { t, localeTag, isRTL } = useI18n();
  const terms = documentFromStatus(legalStatus, 'terms');
  const privacy = documentFromStatus(legalStatus, 'privacy');
  const legalDocumentsReady = !!terms && !!privacy;
  return (
    <View>
      <StepHeading
        title={t('onboarding.reviewTitle')}
        body={t('onboarding.reviewBody')}
      />
      <View style={styles.reviewCard}>
        <ReviewRow label={t('onboarding.profileName')} value={draft.firstName.trim()} />
        <ReviewRow label={t('onboarding.fullNameShort')} value={draft.fullName.trim()} note={t('onboarding.private')} />
        <ReviewRow label={t('onboarding.birthDate')} value={birthDate ? readableDate(birthDate, localeTag) : t('onboarding.notEntered')} note={t('onboarding.private')} />
        <ReviewRow label={t('onboarding.gender')} value={draft.gender === 'female' ? t('onboarding.woman') : t('onboarding.man')} />
        <ReviewRow
          label={t('onboarding.location')}
          value={`${draft.city.trim()}${isRTL ? '،' : ','} ${draft.country.trim()}`}
        />
      </View>
      <Text variant="caption" style={styles.reviewNote}>
        {t('onboarding.reviewNote')}
      </Text>
      <Pressable
        testID={testIds.onboarding.legalConsent}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: legalAccepted, disabled: !legalDocumentsReady }}
        accessibilityLabel={t('onboarding.legalConsent')}
        disabled={!legalDocumentsReady}
        onPress={() => onLegalAcceptedChange(!legalAccepted)}
        style={[styles.legalConsent, isRTL && styles.rowReverse, legalAccepted && styles.legalConsentSelected]}
      >
        <View style={[styles.legalCheck, legalAccepted && styles.legalCheckSelected]}>
          {legalAccepted ? <Text style={styles.legalCheckMark}>✓</Text> : null}
        </View>
        <Text variant="caption" style={styles.legalConsentText}>{t('onboarding.legalConsent')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: sensitiveAccepted, disabled: !legalDocumentsReady }}
        accessibilityLabel={t('legal.sensitiveConsent')}
        disabled={!legalDocumentsReady}
        onPress={() => onSensitiveAcceptedChange(!sensitiveAccepted)}
        style={[styles.legalConsent, isRTL && styles.rowReverse, sensitiveAccepted && styles.legalConsentSelected]}
      >
        <View style={[styles.legalCheck, sensitiveAccepted && styles.legalCheckSelected]}>
          {sensitiveAccepted ? <Text style={styles.legalCheckMark}>✓</Text> : null}
        </View>
        <Text variant="caption" style={styles.legalConsentText}>{t('legal.sensitiveConsent')}</Text>
      </Pressable>
      <View style={[styles.legalLinks, isRTL && styles.rowReverse]}>
        <Pressable disabled={!terms} accessibilityRole="link" accessibilityLabel={t('onboarding.termsLink')} onPress={() => terms && void Linking.openURL(terms.url)}>
          <Text style={styles.legalLink}>{t('onboarding.termsLink')}</Text>
        </Pressable>
        <Text variant="caption">{t('onboarding.legalAnd')}</Text>
        <Pressable disabled={!privacy} accessibilityRole="link" accessibilityLabel={t('onboarding.privacyLink')} onPress={() => privacy && void Linking.openURL(privacy.url)}>
          <Text style={styles.legalLink}>{t('onboarding.privacyLink')}</Text>
        </Pressable>
      </View>
      {legalError ? <InlineError message={legalError} /> : null}
      {!legalDocumentsReady ? (
        <View style={styles.legalLoadError}>
          <InlineError message={legalStatusError ? t('onboarding.legalUnavailable') : t('onboarding.legalLoading')} />
          {legalStatusError ? <Button label={t('common.tryAgain')} variant="quiet" onPress={onRetryLegal} /> : null}
        </View>
      ) : null}
    </View>
  );
}
