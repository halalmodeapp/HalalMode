import type { CardsSession, Seat } from '../types.ts';

export const SEATS: readonly Seat[] = ['host', 'guest'];

export function otherSeat(seat: Seat): Seat {
  return seat === 'host' ? 'guest' : 'host';
}

/**
 * Turns this phone's view of a sealed answer ("mine", "theirs") back into
 * seats, which is what the engine reasons in. The other seat is present only
 * when the server has unsealed it.
 */
export function answersBySeat<T>(
  session: Pick<CardsSession, 'answers' | 'mySeat'>,
  key: string
): Partial<Record<Seat, T>> {
  const sealed = session.answers[key];
  if (!sealed) return {};
  const result: Partial<Record<Seat, T>> = {};
  if (sealed.mine !== undefined) result[session.mySeat] = sealed.mine as T;
  if (sealed.theirs !== undefined) result[otherSeat(session.mySeat)] = sealed.theirs as T;
  return result;
}

export function bothAnswered<T>(answers: Partial<Record<Seat, T>>): answers is Record<Seat, T> {
  return answers.host !== undefined && answers.guest !== undefined;
}
