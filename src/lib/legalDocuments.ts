import { LEGAL_VERSION, PRIVACY, TERMS } from '../data/legalDocuments';

/**
 * Mock/offline display metadata, derived from the documents themselves
 * (src/data/legalDocuments.ts) so it can never name an old version or a
 * stale address. Live version authority is the server registry, which
 * tests/legalDocuments.test.ts holds to the same source.
 */
export const LEGAL_DOCUMENT_FALLBACKS = {
  terms: {
    type: 'terms' as const,
    version: LEGAL_VERSION,
    title: TERMS.title,
    effectiveDate: TERMS.updated,
    url: TERMS.url,
  },
  privacy: {
    type: 'privacy' as const,
    version: LEGAL_VERSION,
    title: PRIVACY.title,
    effectiveDate: PRIVACY.updated,
    url: PRIVACY.url,
  },
};
