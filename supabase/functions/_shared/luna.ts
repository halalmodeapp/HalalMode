/**
 * Which AI model the service uses: OpenAI's cheapest tier, "Luna".
 *
 * The model is pinned to FALLBACK_MODEL, so moderation and summaries behave
 * the same until someone changes them on purpose: a new model changes how
 * photos are judged, and that should be checked with scripts/luna-photo-eval.ts
 * before it goes live. Set the AI_MODEL secret to pin a different model, or
 * AI_MODEL_AUTO=true to follow the newest "-luna" OpenAI lists (it still falls
 * back to FALLBACK_MODEL if that one fails).
 */
import OpenAI from 'npm:openai';

export const FALLBACK_MODEL = 'gpt-6-luna';

let cached: { id: string; at: number } | null = null;

export async function newestLuna(openai: OpenAI): Promise<string> {
  const pinned = Deno.env.get('AI_MODEL') ?? Deno.env.get('MODERATION_MODEL');
  if (pinned) return pinned;
  if (Deno.env.get('AI_MODEL_AUTO') !== 'true') return FALLBACK_MODEL;
  // One lookup an hour per running function is plenty.
  if (cached && Date.now() - cached.at < 3_600_000) return cached.id;
  let best = { id: FALLBACK_MODEL, version: 6 };
  try {
    for await (const model of openai.models.list()) {
      const match = /^gpt-(\d+(?:\.\d+)?)-luna$/.exec(model.id);
      if (match && Number(match[1]) > best.version) best = { id: model.id, version: Number(match[1]) };
    }
  } catch {
    // The list is a nicety; the fallback always works.
  }
  cached = { id: best.id, at: Date.now() };
  return best.id;
}

/** Runs a call on the newest Luna, and on the fallback model if that fails. */
export async function withLuna<T>(openai: OpenAI, call: (model: string) => Promise<T>): Promise<{ result: T; model: string }> {
  const model = await newestLuna(openai);
  try {
    return { result: await call(model), model };
  } catch (error) {
    if (model === FALLBACK_MODEL) throw error;
    return { result: await call(FALLBACK_MODEL), model: FALLBACK_MODEL };
  }
}
