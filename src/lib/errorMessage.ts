import type { Translate } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';

/**
 * Turns a server refusal into words the member can act on.
 *
 * The server says why it refused ("This set is not open yet", "Your height
 * must be between 140 and 210 cm"), but every screen used to show the same
 * "check your connection" — which is how a missing height looked like a
 * network fault for weeks. Known reasons map to a translated sentence; anything
 * else falls back to the screen's own message.
 */
const KNOWN: [RegExp, TranslationKey][] = [
  [/set is not open yet/i, 'errors.setNotOpen'],
  [/answer the questions you owe/i, 'daily.owedBody'],
  [/too many reports/i, 'errors.tooManyReports'],
  [/cannot include contact details/i, 'answers.noContact'],
  [/your height must be between/i, 'errors.ownHeight'],
  [/your weight must be between/i, 'errors.ownWeight'],
  [/age range must be between/i, 'errors.ageRange'],
];

export function errorMessage(error: unknown, t: Translate, fallback: TranslationKey): string {
  const text = String((error as { message?: unknown } | null)?.message ?? '');
  const known = KNOWN.find(([pattern]) => pattern.test(text));
  return t(known ? known[1] : fallback);
}
