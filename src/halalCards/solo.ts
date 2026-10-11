import { resolveSealedChoices } from './engine/adventure.ts';
import { otherSeat } from './engine/seats.ts';
import { currentTurn, initialState, isFinished } from './engine/session.ts';
import type { Activity, ActivityState, CardsSession, Seat } from './types.ts';

/**
 * A free member's preview, played alone on this phone. The same engine and
 * the same play screens, with a local session in place of the server: the
 * member takes every seat in turn, and nothing is stored or shared.
 */
export interface SoloRun {
  state: ActivityState;
  answers: Record<string, Partial<Record<Seat, unknown>>>;
  version: number;
}

export function soloStart(activity: Activity): SoloRun {
  return { state: initialState(activity), answers: {}, version: 1 };
}

/** Which character's seat the member is playing right now. */
export function soloActingSeat(activity: Activity, run: SoloRun): Seat {
  if (activity.kind === 'adventure' && run.state.kind === 'adventure') {
    const scene = activity.scenes[run.state.sceneId];
    if (scene?.decision.mode === 'role') return run.state.roles[scene.decision.actor ?? 'A'];
    const key = `a:${run.state.step}:${run.state.attempt}`;
    return run.answers[key]?.host === undefined ? 'host' : 'guest';
  }
  return 'host';
}

/** The run as a session seen from the acting seat, for the play screens. */
export function soloView(activity: Activity, run: SoloRun): CardsSession {
  const seat = soloActingSeat(activity, run);
  const other = otherSeat(seat);
  const answers: CardsSession['answers'] = {};
  for (const [key, bySeat] of Object.entries(run.answers)) {
    const mine = bySeat[seat];
    const theirs = bySeat[other];
    answers[key] = {
      ...(mine !== undefined ? { mine } : {}),
      ...(mine !== undefined && theirs !== undefined ? { theirs } : {}),
      theirReady: theirs !== undefined,
    };
  }
  return {
    id: 'solo',
    connectionId: '',
    activityId: activity.id,
    hostId: 'me',
    mySeat: seat,
    status: isFinished(activity, run.state) ? 'completed' : 'active',
    state: run.state,
    version: run.version,
    contentVersion: activity.version ?? 1,
    answers,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * Records an answer for the acting seat. A Lab scenario or a joint story
 * choice is mirrored to the other seat (you are deciding for both); a private
 * story choice waits for the other character's turn, then the story moves on
 * at once.
 */
export function soloAnswer(activity: Activity, run: SoloRun, key: string, answer: unknown): SoloRun {
  const seat = soloActingSeat(activity, run);
  const scene = activity.kind === 'adventure' && run.state.kind === 'adventure' ? activity.scenes[run.state.sceneId] : undefined;
  const mirror = activity.kind === 'lab' || scene?.decision.mode === 'joint';
  const bySeat = { ...run.answers[key], [seat]: answer, ...(mirror ? { [otherSeat(seat)]: answer } : {}) };
  const next: SoloRun = { ...run, answers: { ...run.answers, [key]: bySeat } };
  const turn = currentTurn(activity, soloView(activity, next));
  if (turn.kind === 'resolve' && activity.kind === 'adventure' && next.state.kind === 'adventure') {
    return { ...next, state: resolveSealedChoices(activity, next.state, turn.picks), version: next.version + 1 };
  }
  return next;
}

export function soloAdvance(run: SoloRun, state: ActivityState): SoloRun {
  return { ...run, state, version: run.version + 1 };
}
