import type { CardsSummary } from './types.ts';

/** What a session needs from this member right now, for lists and the chat. */
export type SessionCue =
  | 'invited_you'
  | 'your_turn'
  /** A card is open to read; either of you can carry on. */
  | 'in_play'
  | 'their_turn'
  | 'awaiting_accept'
  | 'finished'
  | 'ended';

export function sessionCue(session: Pick<CardsSummary, 'status' | 'mySeat' | 'awaiting'>): SessionCue {
  if (session.status === 'invited') return session.mySeat === 'guest' ? 'invited_you' : 'awaiting_accept';
  if (session.status === 'completed') return 'finished';
  if (session.status !== 'active') return 'ended';
  if (session.awaiting === 'both' || session.awaiting === session.mySeat) return 'your_turn';
  if (session.awaiting) return 'their_turn';
  return 'in_play';
}

/** The order sessions are worth showing in: what is waiting on you first. */
export const CUE_PRIORITY: Record<SessionCue, number> = {
  invited_you: 0,
  your_turn: 1,
  in_play: 2,
  their_turn: 3,
  awaiting_accept: 4,
  finished: 5,
  ended: 6,
};
