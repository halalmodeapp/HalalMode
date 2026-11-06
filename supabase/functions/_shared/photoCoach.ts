/**
 * What Halal Bot asks about a member's own photo, and how it reads the answer.
 *
 * Pure, so it can be tested without Deno or a model. The advice goes only to the member who owns the
 * photo, and it is about the photograph. It never rates the person.
 */

export interface PhotoAdvice {
  /** How much this photo would gain from being redone. */
  verdict: 'great' | 'good' | 'could_be_better' | 'replace';
  /** One warm, honest sentence. */
  summary: string;
  /** Concrete things to do, most useful first. At most three. */
  tips: string[];
}

export const PHOTO_ADVICE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['great', 'good', 'could_be_better', 'replace'] },
    summary: { type: 'string' },
    tips: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'summary', 'tips'],
  additionalProperties: false,
} as const;

export function photoAdviceInstructions(language: string): string {
  return `You are Halal Bot, the friendly photo coach in a Muslim marriage app. A member has asked you how to make this profile photo of theirs more attractive, so they get more matches. Be gentle and honest, like a kind friend with a good eye. Do not flatter a bad photo, because they asked in order to improve.

Look first for glaring problems: too dark, blurry, far away, face hidden or cut off, sunglasses, heavy filters, a group where it is unclear who they are, a messy bathroom or bedroom, a mirror selfie, a car selfie, a stern or blank expression, an old low-quality image.

Then say what would most improve it: daylight facing a window or outdoors, a clean simple background, a real warm smile, head and shoulders clearly visible, looking at the camera, tidy grooming and clothes that fit, standing tall, a friend taking the picture.

Rules:
- Talk only about the photograph and how they present in it, things they can change next time they take a picture.
- Never comment on their body, weight, face shape, skin, age, ethnicity or attractiveness, and never give a rating or a score.
- Respect religious dress completely. Never suggest removing or changing a hijab, niqab, beard or modest clothing. A niqab or a photo without a visible face is a choice, not a problem to fix.
- Never suggest anything immodest.
- If the photo is genuinely good, say so and give no tips, or one small one.
- verdict: "great" needs nothing, "good" has a small improvement, "could_be_better" is worth retaking, "replace" has a glaring problem.
- summary: one warm sentence. tips: up to three short, concrete instructions, most useful first.
- Write in ${language}.`;
}

/** The model's answer, or null if it is not usable, in which case the member is not charged. */
export function parsePhotoAdvice(value: string): PhotoAdvice | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { verdict, summary, tips } = parsed as Record<string, unknown>;
  if (verdict !== 'great' && verdict !== 'good' && verdict !== 'could_be_better' && verdict !== 'replace') return null;
  if (typeof summary !== 'string' || !summary.trim() || !Array.isArray(tips)) return null;
  return {
    verdict,
    summary: summary.trim().slice(0, 300),
    tips: tips
      .filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0)
      .slice(0, 3)
      .map((tip) => tip.trim().slice(0, 200)),
  };
}
