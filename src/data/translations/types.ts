/**
 * One language's wording for the app's fixed lists. English and Arabic live
 * beside each entry in the list files themselves; every other language lives
 * in a file of its own here, keyed by the entry's stored id.
 *
 * Anything missing falls back to English, so a list never shows a blank.
 */
export interface ListTranslations {
  occupations: Record<string, string>;
  occupationGroups: Record<string, string>;
  education: Record<string, string>;
  educationGroups: Record<string, string>;
  /** City names, where the language writes them differently from English. */
  cities?: Record<string, string>;
  /** The conversation questions, by id (q1 to q12). */
  questions: Record<string, string>;
  /** The twenty suggested first lines, in the same order as English. */
  openers: string[];
}
