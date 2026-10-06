import { LEGAL_DOCUMENT_FALLBACKS } from '@/lib/legalDocuments';
import {
  normalizeLegalConsentStatus,
  type LegalConsentStatus,
} from '@/lib/legalConsent';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

const mockStatus: LegalConsentStatus = {
  required: false,
  currentDocuments: [
    LEGAL_DOCUMENT_FALLBACKS.terms,
    LEGAL_DOCUMENT_FALLBACKS.privacy,
  ],
};

export async function fetchMyLegalConsentStatus(): Promise<LegalConsentStatus> {
  if (USE_MOCKS) return mockStatus;
  const { data, error } = await requireSupabase().rpc('get_my_legal_consent_status');
  if (error) throw error;
  return normalizeLegalConsentStatus(data);
}

/**
 * Explicit consent to use religious beliefs and ethnicity (special-category
 * data, UK/EU GDPR Article 9). Given separately from accepting the terms, and
 * required before introductions (migration 0180).
 */
export async function recordSensitiveConsent(): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('record_sensitive_consent');
  if (error) throw error;
}

export async function acceptCurrentLegalDocuments(): Promise<LegalConsentStatus> {
  if (USE_MOCKS) return mockStatus;
  await recordSensitiveConsent();
  const { data, error } = await requireSupabase().rpc('accept_current_legal_documents');
  if (error) throw error;
  return normalizeLegalConsentStatus(data);
}
