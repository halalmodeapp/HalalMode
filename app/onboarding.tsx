import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { StretchScrollView } from '@/components/ui/StretchScrollView';
import * as Location from 'expo-location';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useI18n, type Translate } from '@/i18n';
import { requireSupabase } from '@/lib/supabase';
import { claimReferralCode } from '@/api/referrals';
import { forgetReferralCode, normalizeReferralCode, pendingReferralCode } from '@/lib/referralCode';
import { fetchMyLegalConsentStatus, recordSensitiveConsent } from '@/api/legalConsent';
import { documentFromStatus } from '@/lib/legalConsent';
import { queryKeys } from '@/lib/queryClient';
import { SelfieCapture } from '@/components/verification/SelfieCapture';
import { submitSelfie } from '@/api/selfie';
import { setMyMaritalStatus } from '@/api/profile';
import { PermissionExplainer } from '@/components/ui/PermissionExplainer';
import { browserDeviceCoordinates, nativeDevicePlace } from '@/lib/deviceLocation';
import { placeFromBrowserCoordinates } from '@/lib/browserPlace';
import { namesFromIdentity } from '@/lib/identityNames';
import { clearOnboardingDraft, clearLegacyOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft } from '@/lib/onboardingDraftStorage';
import { useAuth } from '@/state/auth';
import { ageForBirthDateParts, formatBirthDate } from '@/lib/birthDate';
import { color } from '@/theme/tokens';
import { testIds } from '@/lib/testIds';
import { styles } from '@/components/onboarding/styles';
import { EMPTY_DRAFT, LAST_STEP, SELFIE_STEP, type DraftField, type OnboardingDraft, type ValidationErrors } from '@/components/onboarding/types';
import { validateStep } from '@/components/onboarding/validation';
import { InlineError, StepHeading } from '@/components/onboarding/fields';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { IdentityStep } from '@/components/onboarding/IdentityStep';
import { BasicDetailsStep } from '@/components/onboarding/BasicDetailsStep';
import { LocationStep } from '@/components/onboarding/LocationStep';
import { ReviewStep } from '@/components/onboarding/ReviewStep';

export default function OnboardingScreen() {
  const { t, isRTL } = useI18n();
  const { user, refreshProfileStatus } = useAuth();
  const queryClient = useQueryClient();
  const draftMemberId = user?.id ?? 'current';
  const profileSavedForMember = useRef<string | null>(null);
  // Through a ref, not an effect dependency: the user object changes on every
  // token refresh, and re-running the restore then would wipe a draft in
  // progress.
  const identity = useRef(user?.user_metadata);
  identity.current = user?.user_metadata;
  const [step, setStep] = useState(0);
  // Where the selfie taken in this sitting was uploaded; sent for checking once the profile exists.
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [restoring, setRestoring] = useState(true);
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationExplainer, setLocationExplainer] = useState(false);
  // Location was refused; offer the way back to it.
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [ageConfirmationOpen, setAgeConfirmationOpen] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [sensitiveAccepted, setSensitiveAccepted] = useState(false);
  // Who invited them: filled in from the link they arrived by, or typed in.
  const [referralCode, setReferralCode] = useState('');
  const referralError = referralCode.trim() && !normalizeReferralCode(referralCode)
    ? t('onboarding.referralInvalid')
    : undefined;
  useEffect(() => {
    let active = true;
    void pendingReferralCode().then((code) => {
      if (active && code) setReferralCode((current) => current || code);
    });
    return () => {
      active = false;
    };
  }, []);
  const legalStatusQuery = useQuery({
    queryKey: queryKeys.legalConsent,
    queryFn: fetchMyLegalConsentStatus,
  });

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadOnboardingDraft(draftMemberId),
      // The v2 draft contained PII in plaintext. Remove it even if the member
      // never reaches the completion step in this app version.
      clearLegacyOnboardingDraft(draftMemberId),
    ])
      .then(([stored]) => {
        if (!active) return;
        if (!stored) {
          // Somebody who signed in with Google or Apple has already told us
          // their name once. Asking again, into two empty boxes, is the first
          // thing a new member would reasonably complain about. It is only a
          // starting point, both fields stay editable.
          setDraft((current) => ({ ...current, ...namesFromIdentity(identity.current) }));
          return;
        }
        if (stored.draft) setDraft({ ...EMPTY_DRAFT, ...stored.draft });
        if (
          typeof stored.step === 'number' &&
          stored.step >= 0 &&
          stored.step <= LAST_STEP
        ) {
          setStep(stored.step);
        }
        setSaved(true);
      })
      .catch(() => {
        // A damaged local draft should not block account setup.
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [draftMemberId]);

  useEffect(() => {
    if (restoring || completed) return;
    setSaved(false);
    const timer = setTimeout(() => {
      void saveOnboardingDraft(draftMemberId, step, draft)
        .then(() => setSaved(true))
        .catch(() => setSaved(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [completed, draft, draftMemberId, restoring, step]);

  const birthDate = useMemo(() => formatBirthDate(draft), [draft]);
  const derivedAge = useMemo(() => ageForBirthDateParts(draft), [draft]);

  const patch = <K extends DraftField>(field: K, value: OnboardingDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, birthDate: undefined }));
    setSubmitError(null);
  };

  /**
   * Location is asked for by its own button, not by Continue.
   *
   * Continue used to fire the system prompt with nothing but a caption as the
   * reason, and if the answer was no, or, on the web, where the browser cannot
   * name a place at all, there was no way past this step. Now the reason
   * comes first. Location is required (2026-10-03): a typed or picked city
   * would let anyone claim to live anywhere, and appearing elsewhere is the
   * Premium travel mode instead. A member who said no is shown how to turn it
   * back on.
   */
  const locateMe = async () => {
    setLocating(true);
    setErrors({});
    try {
      // Safari on iPhone does not always expose navigator.permissions, so
      // expo-location's web permission wrapper can fail before it reaches the
      // browser prompt. Call the browser API directly while this is still the
      // user's tap, then use the nearest listed city because web has no native
      // reverse geocoder.
      if (Platform.OS === 'web') {
        const coordinates = await browserDeviceCoordinates();
        const resolved = await placeFromBrowserCoordinates(coordinates);
        if (!resolved) {
          setErrors({ city: t('onboarding.locationFailed') });
          return;
        }
        setLocationBlocked(false);
        setDraft((current) => ({ ...current, ...resolved }));
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationBlocked(true);
        setErrors({ city: t('onboarding.locationDenied') });
        return;
      }
      setLocationBlocked(false);
      const resolved = await nativeDevicePlace(
        () => Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        coordinates => Location.reverseGeocodeAsync(coordinates),
      );
      if (!resolved) {
        setErrors({ city: t('onboarding.locationFailed') });
        return;
      }
      setDraft((current) => ({ ...current, ...resolved }));
    } catch (error) {
      const denied = typeof error === 'object'
        && error !== null
        && 'code' in error
        && (error as { code?: unknown }).code === 1;
      if (Platform.OS === 'web' && denied) {
        setLocationBlocked(true);
        setErrors({ city: t('onboarding.locationDeniedWeb') });
      } else {
        setErrors({ city: t('onboarding.locationFailed') });
      }
    } finally {
      setLocating(false);
    }
  };

  // The reason is shown only while the system has not been asked yet. Once
  // permission is granted it has been accepted, and repeating it is a lecture.
  const askForLocation = async () => {
    // On Safari, make the browser request on the original tap. An extra
    // in-page confirmation can lose transient user activation and leave the
    // browser permission prompt unopened. The step copy already explains why
    // location is needed; denied permission is handled below with a retry path.
    if (Platform.OS === 'web') {
      void locateMe();
      return;
    }
    const existing = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (existing?.granted) {
      void locateMe();
      return;
    }
    setLocationExplainer(true);
  };

  const goNext = async () => {
    if (step === 0 && referralError) return;
    if (step === 3 && (draft.latitude === undefined || draft.longitude === undefined)) {
      setErrors({ city: t('onboarding.locationRequired') });
      return;
    }
    // A browser camera can be a file picker, so only the apps insist on the
    // selfie; the web sign-up is asked to add it later in the app.
    if (step === SELFIE_STEP && !selfiePath && Platform.OS !== 'web') {
      setErrors({ city: t('onboarding.selfieRequired') });
      return;
    }
    const nextErrors = validateStep(step, draft, t);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (step === 2 && derivedAge !== null) {
      setAgeConfirmationOpen(true);
      return;
    }
    setStep((current) => Math.min(LAST_STEP, current + 1));
  };

  const goBack = () => {
    setErrors({});
    setSubmitError(null);
    setStep((current) => Math.max(0, current - 1));
  };

  const complete = async () => {
    const terms = documentFromStatus(legalStatusQuery.data, 'terms');
    const privacy = documentFromStatus(legalStatusQuery.data, 'privacy');
    const allErrors = [1, 2, 3].reduce<ValidationErrors>(
      (current, currentStep) => ({
        ...current,
        ...validateStep(currentStep, draft, t),
      }),
      {}
    );
    if (!legalAccepted || !sensitiveAccepted) allErrors.legal = t('onboarding.error.legal');
    if (!terms || !privacy) allErrors.legal = t('onboarding.legalUnavailable');
    if (Object.keys(allErrors).length > 0 || !birthDate || !draft.gender || !legalAccepted || !sensitiveAccepted || !terms || !privacy) {
      setErrors(allErrors);
      setSubmitError(t('onboarding.submitCheck'));
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      if (profileSavedForMember.current !== draftMemberId) {
        const { error } = await requireSupabase().rpc('complete_onboarding', {
          p_name: draft.fullName.trim(),
          p_first_name: draft.firstName.trim(),
          p_birth_date: birthDate,
          p_gender: draft.gender,
          p_city: draft.city.trim(),
          p_country: draft.country.trim(),
          p_latitude: draft.latitude,
          p_longitude: draft.longitude,
          p_terms_version: terms.version,
          p_privacy_version: privacy.version,
        });
        if (error) {
          // A timed-out response can follow a committed RPC. Confirm that
          // before retrying it, because complete_onboarding rejects duplicates.
          const { data: savedProfile, error: lookupError } = await requireSupabase()
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', draftMemberId)
            .maybeSingle();
          if (lookupError || savedProfile?.onboarding_complete !== true) throw error;
        }
        profileSavedForMember.current = draftMemberId;
      }
      // The marital status is saved once the profile exists; a retry saves it again.
      if (draft.maritalStatus) await setMyMaritalStatus(draft.maritalStatus);
      await recordSensitiveConsent();
      // Send the selfie to be checked. A failure never holds up sign-up: the
      // You tab asks for the selfie again while none is on file.
      if (selfiePath) await submitSelfie(selfiePath).catch(() => undefined);
      // Credit whoever invited them. It never holds up sign-up.
      const invitedBy = normalizeReferralCode(referralCode);
      if (invitedBy) await claimReferralCode(invitedBy).catch(() => undefined);
      await forgetReferralCode();
      await clearOnboardingDraft(draftMemberId);
      // Everything fetched before this moment was fetched about somebody who did
      // not exist yet, and is cached for five minutes. Two of those answers did
      // real damage: consent ("not agreed") sent every new member to agree a
      // second time, and the round ("consent required") had the Daily screen
      // bouncing them back to the consent screen in a loop. Throw them all away
      // so the app asks again about the member who now does exist.
      queryClient.removeQueries();
      setCompleted(true);
      await refreshProfileStatus();
    } catch {
      setSubmitError(
        t('onboarding.submitGeneric')
      );
    } finally {
      setSaving(false);
    }
  };

  if (restoring) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={color.ink} />
          <Text variant="bodySmall">{t('onboarding.restoring')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, isRTL && styles.rtl]}
      >
        <View style={styles.progressHeader}>
          <View style={[styles.progressTop, isRTL && styles.rowReverse]}>
            <Text variant="microAccent">
              {t('onboarding.step', {
                current: step + 1,
                total: LAST_STEP + 1,
                name: t(
                  [
                    'onboarding.step.welcome',
                    'onboarding.step.name',
                    'onboarding.step.details',
                    'onboarding.step.location',
                    'onboarding.step.selfie',
                    'onboarding.step.review',
                  ][step] as Parameters<Translate>[0]
                ),
              })}
            </Text>
            <Text variant="caption" accessibilityLiveRegion="polite">
              {saved ? t('onboarding.saved') : t('common.saving')}
            </Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: LAST_STEP + 1, now: step + 1 }}
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${((step + 1) / (LAST_STEP + 1)) * 100}%` },
              ]}
            />
          </View>
        </View>

        <StretchScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 ? (
            <WelcomeStep referralCode={referralCode} onReferralCodeChange={setReferralCode} referralError={referralError} />
          ) : null}
          {step === 1 ? (
            <IdentityStep draft={draft} errors={errors} patch={patch} />
          ) : null}
          {step === 2 ? (
            <BasicDetailsStep draft={draft} errors={errors} patch={patch} />
          ) : null}
          {step === 3 ? (
            <LocationStep
              draft={draft}
              errors={errors}
              locating={locating}
              onUseLocation={() => void askForLocation()}
              blocked={locationBlocked}
            />
          ) : null}
          {step === SELFIE_STEP ? (
            <View>
              <StepHeading title={t('onboarding.selfieTitle')} body={t('onboarding.selfieBody')} />
              <SelfieCapture
                taken={selfiePath !== null}
                onUploaded={(path) => {
                  setSelfiePath(path);
                  setErrors({});
                }}
              />
              {errors.city ? <InlineError message={errors.city} /> : null}
            </View>
          ) : null}
          {step === LAST_STEP ? (
            <ReviewStep
              draft={draft}
              birthDate={birthDate}
              legalAccepted={legalAccepted}
              onLegalAcceptedChange={setLegalAccepted}
              sensitiveAccepted={sensitiveAccepted}
              onSensitiveAcceptedChange={setSensitiveAccepted}
              legalError={errors.legal}
              legalStatus={legalStatusQuery.data}
              legalStatusError={legalStatusQuery.isError}
              onRetryLegal={() => void legalStatusQuery.refetch()}
            />
          ) : null}

          <PermissionExplainer
            visible={locationExplainer}
            eyebrow={t('permission.location.eyebrow')}
            title={t('permission.location.title')}
            body={t('permission.location.body')}
            points={[
              t('permission.location.p1'),
              t('permission.location.p2'),
              t('permission.location.p3'),
            ]}
            reassurance={t('permission.location.reassurance')}
            continueLabel={t('permission.continue')}
            cancelLabel={t('permission.notNow')}
            onContinue={() => {
              setLocationExplainer(false);
              // iOS will not present a second system alert while the custom
              // permission modal is still mounted. The web request must stay
              // synchronous with the tap so Safari preserves user activation.
              if (Platform.OS === 'web') {
                void locateMe();
              } else {
                setTimeout(() => void locateMe(), 120);
              }
            }}
            onCancel={() => setLocationExplainer(false)}
          />

          {submitError ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={styles.submitError}
            >
              <Text style={styles.submitErrorTitle}>{t('onboarding.submitTitle')}</Text>
              <Text variant="bodySmall">{submitError}</Text>
            </View>
          ) : null}
        </StretchScrollView>

        <View style={[styles.footer, isRTL && styles.rowReverse]}>
          {step > 0 ? (
            <Button label={t('common.back')} variant="secondary" onPress={goBack} style={styles.back} />
          ) : null}
          <Button
            label={
              step === LAST_STEP
                ? submitError
                  ? t('common.tryAgain')
                  : t('onboarding.finish')
                : step === 0
                  ? t('onboarding.start')
                  : t('common.continue')
            }
            loading={saving}
            onPress={step === LAST_STEP ? () => void complete() : goNext}
            style={styles.next}
          />
        </View>
        <ConfirmDialog
          testID={testIds.onboarding.ageConfirm}
          visible={ageConfirmationOpen}
          title={t('onboarding.ageConfirmTitle', { age: derivedAge ?? '' })}
          body={t('onboarding.ageConfirmBody')}
          confirmLabel={t('onboarding.ageConfirmAccept')}
          cancelLabel={t('onboarding.ageConfirmChange')}
          onConfirm={() => {
            setAgeConfirmationOpen(false);
            setStep(3);
          }}
          onCancel={() => setAgeConfirmationOpen(false)}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
