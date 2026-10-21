import { PRIVACY, TERMS } from '../data/legalDocuments';

/**
 * Public pages shared by native screens and the Expo web build. halalmo.de
 * links the same pages from site/site-footer.js; keep the two lists alike.
 */
export const HOW_IT_WORKS_URL = 'https://halalmo.de/how-it-works';
export const REFER_URL = 'https://halalmo.de/refer';
// From the documents themselves, the one source for their address.
export const PRIVACY_URL = PRIVACY.url;
export const TERMS_URL = TERMS.url;
export const CONTACT_EMAIL = 'hello@halalmo.de';

export function howItWorksUrl(language: string): string {
  return `${HOW_IT_WORKS_URL}?lang=${encodeURIComponent(language)}`;
}

export function referUrl(language: string): string {
  return `${REFER_URL}?lang=${encodeURIComponent(language)}`;
}
