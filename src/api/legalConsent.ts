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

export async function acceptCurrentLegalDocuments(status: LegalConsentStatus): Promise<LegalConsentStatus> {
  if (USE_MOCKS) return mockStatus;
  const terms = status.currentDocuments.find(document => document.type === 'terms');
  const privacy = status.currentDocuments.find(document => document.type === 'privacy');
  if (!terms || !privacy) throw new Error('Current legal documents are unavailable.');
  const { data, error } = await requireSupabase().rpc('accept_legal_documents', {
    p_terms_version: terms.version,
    p_privacy_version: privacy.version,
    p_sensitive_consent: true,
  });
  if (error) throw error;
  return normalizeLegalConsentStatus(data);
}
