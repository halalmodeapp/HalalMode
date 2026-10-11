import { halalCardsMock as mock } from '@/api/halalCardsMock';
import type {
  ActivityState,
  Awaiting,
  CardsAccess,
  CardsSession,
  CardsSummary,
  CardsTrack,
  GuideEntry,
} from '@/halalCards/types';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

import { StaleSessionError } from '@/halalCards/errors';

export { StaleSessionError };

function isStale(error: { code?: string } | null): boolean {
  return error?.code === '40001';
}

const TRACKS: CardsTrack[] = ['getting_to_know', 'engaged', 'married'];

export async function fetchCardsAccess(connectionId: string): Promise<CardsAccess> {
  if (USE_MOCKS) return mock.access(connectionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_access', { p_connection_id: connectionId });
  if (error) throw error;
  const payload = data as { unlocked?: unknown; unlockedByMe?: unknown; track?: unknown } | null;
  return {
    unlocked: payload?.unlocked === true,
    unlockedByMe: payload?.unlockedByMe === true,
    track: TRACKS.includes(payload?.track as CardsTrack) ? (payload?.track as CardsTrack) : 'getting_to_know',
  };
}

export async function setCardsTrack(connectionId: string, track: CardsTrack): Promise<void> {
  if (USE_MOCKS) return mock.setTrack(connectionId, track);
  const { error } = await requireSupabase().rpc('set_halal_cards_track', { p_connection_id: connectionId, p_track: track });
  if (error) throw error;
}

/** The light list — no state, no answers — for the hub and the chat. */
export async function fetchCardsSummary(connectionId: string): Promise<CardsSummary[]> {
  if (USE_MOCKS) return mock.summary(connectionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_summary', { p_connection_id: connectionId });
  if (error) throw error;
  return (data ?? []) as CardsSummary[];
}

/** Things waiting on this member, by connection id. */
export async function fetchCardsAttention(): Promise<Record<string, number>> {
  if (USE_MOCKS) return mock.attention();
  const { data, error } = await requireSupabase().rpc('get_halal_cards_attention');
  if (error) throw error;
  return (data ?? {}) as Record<string, number>;
}

export async function fetchCardsSession(sessionId: string): Promise<CardsSession> {
  if (USE_MOCKS) return mock.get(sessionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_session', { p_session_id: sessionId });
  if (error) throw error;
  return data as CardsSession;
}

/** Creates the session as an invitation; it begins when the match accepts. */
export async function startCardsSession(
  connectionId: string,
  activityId: string,
  state: ActivityState,
  contentVersion: number
): Promise<CardsSession> {
  if (USE_MOCKS) return mock.start(connectionId, activityId, state, contentVersion);
  const { data, error } = await requireSupabase().rpc('start_halal_cards_session', {
    p_connection_id: connectionId,
    p_activity_id: activityId,
    p_state: state,
    p_content_version: contentVersion,
  });
  if (error) throw error;
  return data as CardsSession;
}

export async function respondCardsInvite(sessionId: string, accept: boolean, awaiting: Awaiting | null): Promise<CardsSession> {
  if (USE_MOCKS) return mock.respond(sessionId, accept, awaiting);
  const { data, error } = await requireSupabase().rpc('respond_halal_cards_invite', {
    p_session_id: sessionId,
    p_accept: accept,
    p_awaiting: awaiting,
  });
  if (error) throw error;
  return data as CardsSession;
}

export async function cancelCardsSession(sessionId: string): Promise<CardsSession> {
  if (USE_MOCKS) return mock.cancel(sessionId);
  const { data, error } = await requireSupabase().rpc('cancel_halal_cards_session', { p_session_id: sessionId });
  if (error) throw error;
  return data as CardsSession;
}

/** A sealed answer. Written once; the server never lets it change. */
export async function submitCardsAnswer(
  sessionId: string,
  key: string,
  answer: unknown,
  awaiting: Awaiting | null
): Promise<CardsSession> {
  if (USE_MOCKS) return mock.answer(sessionId, key, answer, awaiting);
  const { data, error } = await requireSupabase().rpc('submit_halal_cards_answer', {
    p_session_id: sessionId,
    p_key: key,
    p_answer: answer,
    p_awaiting: awaiting,
  });
  if (error) throw error;
  return data as CardsSession;
}

export async function advanceCardsSession(
  sessionId: string,
  expectedVersion: number,
  state: ActivityState,
  completed: boolean,
  awaiting: Awaiting | null
): Promise<CardsSession> {
  if (USE_MOCKS) return mock.advance(sessionId, expectedVersion, state, completed, awaiting);
  const { data, error } = await requireSupabase().rpc('advance_halal_cards_session', {
    p_session_id: sessionId,
    p_expected_version: expectedVersion,
    p_state: state,
    p_completed: completed,
    p_awaiting: awaiting,
  });
  if (isStale(error)) throw new StaleSessionError();
  if (error) throw error;
  return data as CardsSession;
}

export async function fetchGuide(connectionId: string): Promise<GuideEntry[]> {
  if (USE_MOCKS) return mock.guide(connectionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_guide', { p_connection_id: connectionId });
  if (error) throw error;
  return (data ?? []) as GuideEntry[];
}

export async function proposeGuideEntry(connectionId: string, text: string, source: string | null): Promise<void> {
  if (USE_MOCKS) return mock.propose(connectionId, text, source);
  const { error } = await requireSupabase().rpc('propose_halal_cards_guide_entry', {
    p_connection_id: connectionId,
    p_body: text,
    p_source: source ?? '',
  });
  if (error) throw error;
}

export async function agreeGuideEntry(entryId: string): Promise<void> {
  if (USE_MOCKS) return mock.agree(entryId);
  const { error } = await requireSupabase().rpc('agree_halal_cards_guide_entry', { p_entry_id: entryId });
  if (error) throw error;
}

export async function removeGuideEntry(entryId: string): Promise<void> {
  if (USE_MOCKS) return mock.remove(entryId);
  const { error } = await requireSupabase().rpc('remove_halal_cards_guide_entry', { p_entry_id: entryId });
  if (error) throw error;
}

export async function restoreGuideEntry(entryId: string): Promise<void> {
  if (USE_MOCKS) return mock.restore(entryId);
  const { error } = await requireSupabase().rpc('restore_halal_cards_guide_entry', { p_entry_id: entryId });
  if (error) throw error;
}
