import type { Activity } from './types.ts';

/**
 * Translating Halal Cards content.
 *
 * Every member-facing string in an activity has a stable key built from its
 * place in the activity — `adv-fajr-alarm.scenes.alarm.decision.choices.wake.label`.
 * Array items with an `id` are keyed by that id, everything else by position,
 * so adding a choice or a scene never renumbers the rest.
 *
 * The same walk produces the English source file for translators
 * (scripts/halal-cards-strings.mjs) and applies a translation at runtime, so
 * the two can never disagree about a key.
 */

/** Object fields whose string value is shown to members. */
const TEXT_FIELDS = new Set([
  'title',
  'tagline',
  'description',
  'text',
  'prompt',
  'guessPrompt',
  'label',
  'consequence',
  'body',
  'beat',
  'tag',
  'whatHappened',
  'couldHaveChanged',
  'takeaway',
  'name',
  'explanation',
  'sketch',
  'ruleLabel',
  'talk',
]);

/** Fields holding arrays of plain strings shown to members. */
const TEXT_LISTS = new Set(['options', 'points', 'followUps', 'themes', 'readings']);

/** Fields that are never shown or are identifiers. */
const SKIP = new Set(['id', 'kind', 'mode', 'actor', 'rule', 'format', 'topic', 'tracks', 'mood', 'tone', 'gender', 'start', 'next', 'when', 'effects', 'combos', 'diverge', 'version', 'soloPreview', 'minutes', 'initial', 'concerning', 'turningPoint', 'type']);

type Visit = (key: string, value: string) => string;

function isImageSlot(value: unknown): value is { prompt: string; alt: string } {
  return typeof value === 'object' && value !== null && 'role' in value && 'prompt' in value && 'alt' in value;
}

function walk(value: unknown, path: string, visit: Visit): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const id = typeof item === 'object' && item !== null && 'id' in item ? String((item as { id: unknown }).id) : String(index);
      return walk(item, `${path}.${id}`, visit);
    });
  }
  if (typeof value !== 'object' || value === null) return value;

  // An illustration slot: only its screen-reader description is member-facing;
  // the generation prompt stays English for the image model.
  if (isImageSlot(value)) return { ...value, alt: visit(`${path}.alt`, value.alt) };

  const out: Record<string, unknown> = {};
  for (const [field, child] of Object.entries(value)) {
    const key = `${path}.${field}`;
    if (SKIP.has(field)) out[field] = child;
    else if (typeof child === 'string') out[field] = TEXT_FIELDS.has(field) ? visit(key, child) : child;
    else if (TEXT_LISTS.has(field) && Array.isArray(child)) {
      out[field] = child.map((item, index) => (typeof item === 'string' ? visit(`${key}.${index}`, item) : item));
    } else out[field] = walk(child, key, visit);
  }
  return out;
}

/** Every translatable string in an activity, keyed. */
export function activityStrings(activity: Activity): Record<string, string> {
  const strings: Record<string, string> = {};
  walk(activity, activity.id, (key, value) => {
    strings[key] = value;
    return value;
  });
  return strings;
}

/** The activity with any translated strings swapped in; missing keys stay English. */
export function translateActivity<A extends Activity>(activity: A, translations: Record<string, string>): A {
  return walk(activity, activity.id, (key, value) => translations[key] ?? value) as A;
}

/** `{{name}}`-style placeholders a string uses, for checking translations keep them. */
export function placeholdersOf(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] as string).sort();
}

/** A translation file: interface copy plus content strings, both keyed. */
export interface CardsTranslation {
  copy: Record<string, string>;
  content: Record<string, string>;
}
