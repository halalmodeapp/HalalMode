import type {
  Activity,
  ActivityState,
  Awaiting,
  CardsSession,
  QuizAnswer,
  Seat,
} from '../types.ts';
import { adventurePending, resolveSealedChoices, startAdventure } from './adventure.ts';
import { currentLabStep, labKey, labNeedsAnswers } from './lab.ts';
import { answerComplete, quizKey, quizNeeds } from './quiz.ts';
import { answersBySeat, bothAnswered, otherSeat } from './seats.ts';

export function initialState(activity: Activity, hostGender?: 'male' | 'female'): ActivityState {
  switch (activity.kind) {
    case 'lab':
      return { kind: 'lab', cursor: 0 };
    case 'quiz':
      return { kind: 'quiz', cursor: 0 };
    case 'adventure':
      return startAdventure(activity, hostGender);
  }
}

/**
 * What this phone should show right now. Derived, never stored: the stored
 * state plus the sealed answers are enough for both phones to agree.
 */
export type Turn =
  /** A card to read together; either player moves on. */
  | { kind: 'read' }
  /** This seat owes a sealed answer under `key`. */
  | { kind: 'answer'; key: string }
  /** Answered; the other has not. */
  | { kind: 'waiting'; key: string }
  /** Both answered a lab scenario or quiz card. */
  | { kind: 'reveal'; key: string }
  /** It is this seat's call in the story. */
  | { kind: 'decide'; key: string }
  /** The other seat is deciding in the story. */
  | { kind: 'watch'; key: string }
  /** Both sealed story choices are in; whichever phone sees it moves the story on. */
  | { kind: 'resolve'; key: string; picks: Record<Seat, string> }
  | { kind: 'finished' };

export function currentTurn(activity: Activity, session: CardsSession): Turn {
  const { state, mySeat } = session;

  if (activity.kind === 'lab' && state.kind === 'lab') {
    const step = currentLabStep(activity, state.cursor);
    if (!step) return { kind: 'finished' };
    if (!labNeedsAnswers(step)) return { kind: 'read' };
    const key = labKey(step);
    const answers = answersBySeat<string>(session, key);
    if (bothAnswered(answers)) return { kind: 'reveal', key };
    return answers[mySeat] !== undefined ? { kind: 'waiting', key } : { kind: 'answer', key };
  }

  if (activity.kind === 'quiz' && state.kind === 'quiz') {
    const card = activity.cards[state.cursor];
    if (!card) return { kind: 'finished' };
    const key = quizKey(card);
    const answers = answersBySeat<QuizAnswer>(session, key);
    if (bothAnswered(answers)) return { kind: 'reveal', key };
    const mine = answerComplete(quizNeeds(activity, state.cursor, mySeat), answers[mySeat]);
    return mine ? { kind: 'waiting', key } : { kind: 'answer', key };
  }

  if (activity.kind === 'adventure' && state.kind === 'adventure') {
    const pending = adventurePending(activity, state);
    if (pending.type === 'ended') return { kind: 'finished' };
    if (pending.type === 'role') {
      return pending.seat === mySeat ? { kind: 'decide', key: pending.key } : { kind: 'watch', key: pending.key };
    }
    const answers = answersBySeat<string>(session, pending.key);
    if (bothAnswered(answers)) return { kind: 'resolve', key: pending.key, picks: answers };
    return answers[mySeat] !== undefined ? { kind: 'waiting', key: pending.key } : { kind: 'answer', key: pending.key };
  }

  throw new Error(`Session state ${state.kind} does not belong to ${activity.kind} ${activity.id}.`);
}

/** Moves a lab or quiz on by one card. */
export function advanceCursor(activity: Activity, state: ActivityState): ActivityState {
  if (state.kind === 'adventure') throw new Error('Adventures advance by decisions.');
  const length = activity.kind === 'lab' ? activity.steps.length : activity.kind === 'quiz' ? activity.cards.length : 0;
  return { ...state, cursor: Math.min(state.cursor + 1, length) };
}

export function isFinished(activity: Activity, state: ActivityState): boolean {
  if (state.kind === 'lab' && activity.kind === 'lab') return state.cursor >= activity.steps.length;
  if (state.kind === 'quiz' && activity.kind === 'quiz') return state.cursor >= activity.cards.length;
  if (state.kind === 'adventure') return !!state.endingId;
  return false;
}

/** The story's next state once both sealed choices are known. */
export function resolveStory(activity: Activity, state: ActivityState, picks: Record<Seat, string>): ActivityState {
  if (activity.kind !== 'adventure' || state.kind !== 'adventure') throw new Error('Not a story.');
  return resolveSealedChoices(activity, state, picks);
}

/** 0–1, for the progress line at the top of the play screen. */
export function progressOf(activity: Activity, state: ActivityState): number {
  if (state.kind === 'lab' && activity.kind === 'lab') return state.cursor / Math.max(1, activity.steps.length);
  if (state.kind === 'quiz' && activity.kind === 'quiz') return state.cursor / Math.max(1, activity.cards.length);
  if (state.kind === 'adventure') return state.endingId ? 1 : Math.min(0.92, state.step / 8);
  return 0;
}

/**
 * Who the session waits on next, from this phone's view: the seat that owes a
 * sealed answer or a story decision. Null while a card is simply being read,
 * when either player may move on. Sent with every write so the server can
 * badge and notify the right person.
 */
export function awaitingOf(activity: Activity, session: CardsSession): Awaiting | null {
  if (session.status !== 'active') return null;
  const turn = currentTurn(activity, session);
  const them = otherSeat(session.mySeat);
  switch (turn.kind) {
    case 'answer':
      return session.answers[turn.key]?.theirReady ? session.mySeat : 'both';
    case 'waiting':
    case 'watch':
      return them;
    case 'decide':
      return session.mySeat;
    default:
      return null;
  }
}

/**
 * Whether this session can be played with the content this app has. A session
 * started on an older edition — a renamed scene, a removed card — is offered a
 * restart rather than drawn half-broken.
 */
export function contentMatches(activity: Activity, session: Pick<CardsSession, 'state' | 'contentVersion'>): boolean {
  if ((activity.version ?? 1) !== (session.contentVersion ?? 1)) return false;
  const { state } = session;
  if (state.kind !== activity.kind) return false;
  if (state.kind === 'lab' && activity.kind === 'lab') return state.cursor <= activity.steps.length;
  if (state.kind === 'quiz' && activity.kind === 'quiz') return state.cursor <= activity.cards.length;
  if (state.kind === 'adventure' && activity.kind === 'adventure') {
    return state.endingId ? !!activity.endings[state.endingId] : !!activity.scenes[state.sceneId];
  }
  return false;
}
