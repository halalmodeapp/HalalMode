export type Gender = 'male' | 'female';

export type MaritalStatus = 'never_married' | 'divorced' | 'widowed' | 'married';

export interface OnboardingDraft {
  fullName: string;
  firstName: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export type DraftField = keyof OnboardingDraft;

export type ValidationErrors = Partial<Record<DraftField | 'birthDate' | 'legal', string>>;

export const LAST_STEP = 5;

export const SELFIE_STEP = 4;

export const EMPTY_DRAFT: OnboardingDraft = {
  fullName: '',
  firstName: '',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  gender: null,
  maritalStatus: null,
  city: '',
  country: '',
};

export interface StepProps {
  draft: OnboardingDraft;
  errors: ValidationErrors;
  patch: <K extends DraftField>(field: K, value: OnboardingDraft[K]) => void;
}
