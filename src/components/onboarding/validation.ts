import { type Translate } from '@/i18n';
import { isDeclarable } from '@/data/marital';
import { birthDateValidationIssue } from '@/lib/birthDate';
import type { OnboardingDraft, ValidationErrors } from './types';

export function validateStep(step: number, draft: OnboardingDraft, t: Translate): ValidationErrors {
  if (step === 1) {
    const errors: ValidationErrors = {};
    if (draft.firstName.trim().length < 2) {
      errors.firstName = t('onboarding.error.firstName');
    }
    if (draft.fullName.trim().length < 2) {
      errors.fullName = t('onboarding.error.fullName');
    }
    return errors;
  }

  if (step === 2) {
    const errors: ValidationErrors = {};
    const dateError = validateBirthDate(draft, t);
    if (dateError) errors.birthDate = dateError;
    if (!draft.gender) errors.gender = t('onboarding.error.gender');
    else if (!isDeclarable(draft.gender, draft.maritalStatus)) errors.maritalStatus = t('onboarding.maritalRequired');
    return errors;
  }

  if (step === 3) {
    const errors: ValidationErrors = {};
    if (draft.city.trim().length < 2) errors.city = t('onboarding.error.city');
    if (draft.country.trim().length < 2) errors.country = t('onboarding.error.country');
    return errors;
  }

  return {};
}

function validateBirthDate(draft: OnboardingDraft, t: Translate): string | null {
  const issue = birthDateValidationIssue(draft);
  if (issue === 'incomplete') return t('onboarding.error.birthIncomplete');
  if (issue === 'invalid') return t('onboarding.error.birthInvalid');
  if (issue === 'too_young') return t('onboarding.error.tooYoung');
  if (issue === 'too_old') return t('onboarding.error.birthYear');
  return null;
}

export function readableDate(value: string, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
