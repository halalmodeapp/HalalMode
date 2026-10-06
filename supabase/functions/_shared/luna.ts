/**
 * Which AI model the service uses: OpenAI's cheapest tier, "Luna".
 *
 * Each call site asks for the newest "-luna" model OpenAI lists (GPT-7 Luna
 * the day it appears), and falls back to FALLBACK_MODEL if that one fails.
 * Set the AI_MODEL secret to pin a model by hand. OpenAI does not publish
 * prices through its API, so "newest Luna" stands in for "cheapest": true of
 * every Luna release so far.
 */
import OpenAI from 'npm:openai';

export const FALLBACK_MODEL = 'gpt-6-luna';

let cached: { id: string; at: number } | null = null;

export async function newestLuna(openai: OpenAI): Promise<string> {
  const pinned = Deno.env.get('AI_MODEL') ?? Deno.env.get('MODERATION_MODEL');
  if (pinned) return pinned;
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
