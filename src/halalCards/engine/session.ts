import type {
  Activity,
  ActivityState,
  Awaiting,
  CardsSession,
  QuizAnswer,
  Seat,
} from '../types.ts';
import { adventurePending, choicesFor, resolveSealedChoices, startAdventure } from './adventure.ts';
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
 * started on an older edition, a renamed scene, a removed card, is offered a
 * restart rather than drawn half-broken.
 */
export function contentMatches(activity: Activity, session: Pick<CardsSession, 'state' | 'contentVersion'>): boolean {
  if ((activity.version ?? 1) !== (session.contentVersion ?? 1)) return false;
  const { state } = session;
  if (!state || typeof state !== 'object' || state.kind !== activity.kind) return false;
  const count = (value: number) => Number.isSafeInteger(value) && value >= 0;
  if (state.kind === 'lab' && activity.kind === 'lab') return count(state.cursor) && state.cursor <= activity.steps.length;
  if (state.kind === 'quiz' && activity.kind === 'quiz') return count(state.cursor) && state.cursor <= activity.cards.length;
  if (state.kind === 'adventure' && activity.kind === 'adventure') {
    const record = (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value);
    const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
    const picks = (value: unknown) => record(value) && Object.entries(value).every(([seat, choice]) =>
      (seat === 'host' || seat === 'guest') && typeof choice === 'string');
    if (!count(state.step) || !count(state.attempt) || !record(state.roles)
      || !['host', 'guest'].includes(state.roles.A) || !['host', 'guest'].includes(state.roles.B)
      || state.roles.A === state.roles.B || !record(state.vars)
      || !Object.values(state.vars).every((value) => typeof value === 'number' && Number.isFinite(value))
      || !strings(state.flags) || !Array.isArray(state.history)) return false;
    if (!state.history.every((entry) => record(entry) && typeof entry.sceneId === 'string'
      && !!activity.scenes[entry.sceneId] && picks(entry.picks) && strings(entry.beats))) return false;
    if (state.reveals !== undefined && (!Array.isArray(state.reveals) || !state.reveals.every((reveal) =>
      record(reveal) && count(reveal.seq) && count(reveal.step) && typeof reveal.sceneId === 'string'
      && !!activity.scenes[reveal.sceneId] && ['role', 'private', 'joint'].includes(reveal.mode)
      && picks(reveal.picks) && strings(reveal.beats) && strings(reveal.lessonIds)))) return false;
    if (typeof state.sceneId !== 'string' || !activity.scenes[state.sceneId]) return false;
    return state.endingId === undefined || (typeof state.endingId === 'string' && !!activity.endings[state.endingId]);
  }
  return false;
}

/** Bad persisted data reaches recovery before turn or automatic resolution runs. */
export function inspectSession(activity: Activity | undefined, session: CardsSession): {
  compatible: boolean;
  turn?: Turn;
  resolvedState?: ActivityState;
} {
  if (!activity || !contentMatches(activity, session)) return { compatible: false };
  try {
    // Sealed rows cannot be edited. Offer restart if an older client saved an
    // answer this content cannot use, including answers on past quiz cards.
    for (const [key, sealed] of Object.entries(session.answers)) {
      for (const [seat, answer] of [[session.mySeat, sealed.mine], [otherSeat(session.mySeat), sealed.theirs]] as const) {
        if (answer === undefined) continue;
        if (activity.kind === 'quiz') {
          const index = activity.cards.findIndex((card) => quizKey(card) === key);
          if (index < 0) continue;
          const card = activity.cards[index];
          if (!card) return { compatible: false };
          const limit = activity.format === 'more_likely' ? 2 : card.options.length;
          const value = answer as QuizAnswer;
          const needs = quizNeeds(activity, index, seat);
          const valid = (choice: unknown) => Number.isInteger(choice) && (choice as number) >= 0 && (choice as number) < limit;
          if (!value || (needs.self && !valid(value.self)) || (needs.guess && !valid(value.guess))) return { compatible: false };
        } else if (activity.kind === 'lab') {
          const step = activity.steps.find((item) => labKey(item) === key);
          if (step?.type === 'scenario' && !step.choices.some((choice) => choice.id === answer)) return { compatible: false };
        }
      }
    }
    const turn = session.status === 'active' ? currentTurn(activity, session) : undefined;
    if (turn?.kind === 'resolve') {
      return { compatible: true, turn, resolvedState: resolveStory(activity, session.state, turn.picks) };
    }
    // An unusable first answer must also recover while the other is sealed.
    if (activity.kind === 'adventure' && session.state.kind === 'adventure' && turn && 'key' in turn) {
      const scene = activity.scenes[session.state.sceneId];
      if (!scene) return { compatible: false };
      const answers = answersBySeat<string>(session, turn.key);
      for (const seat of ['host', 'guest'] as const) {
        if (answers[seat] !== undefined && !choicesFor(scene.decision, session.state, seat).some((choice) => choice.id === answers[seat])) {
          return { compatible: false };
        }
      }
    }
    return { compatible: true, turn };
  } catch {
    return { compatible: false };
  }
}
