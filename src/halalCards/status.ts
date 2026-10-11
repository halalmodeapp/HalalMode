import { currentTurn } from './engine/session.ts';
import type { Activity, CardsSession } from './types.ts';

/** What a session needs from this member right now, for lists and the chat. */
export type SessionCue = 'invited_you' | 'awaiting_accept' | 'your_turn' | 'their_turn' | 'finished' | 'ended';

export function sessionCue(session: CardsSession, activity: Activity | undefined): SessionCue {
  if (session.status === 'invited') return session.mySeat === 'guest' ? 'invited_you' : 'awaiting_accept';
  if (session.status === 'completed') return 'finished';
  if (session.status !== 'active' || !activity) return 'ended';
  const turn = currentTurn(activity, session);
  return turn.kind === 'waiting' || turn.kind === 'watch' ? 'their_turn' : turn.kind === 'finished' ? 'finished' : 'your_turn';
}

/** The order sessions are worth showing in: what is waiting on you first. */
export const CUE_PRIORITY: Record<SessionCue, number> = {
  invited_you: 0,
  your_turn: 1,
  their_turn: 2,
  awaiting_accept: 3,
  finished: 4,
  ended: 5,
};
