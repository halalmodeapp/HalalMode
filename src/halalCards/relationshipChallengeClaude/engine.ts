import type { Seat } from '../types.ts';
import type {
  RcAction,
  RcCharacter,
  RcClaudeState,
  RcEmote,
  RcEvent,
  RcPose,
  RcScenario,
} from './types.ts';

/**
 * The puzzle rules, pure and deterministic.
 *
 * The stored state is an ordered log of events. The server orders writes (a
 * write must name the version it was computed from), and every phone derives
 * the same view by replaying the log through `deriveRc`, which skips anything
 * invalid: a duplicate action id, a clue collected before it was found, a
 * second copy of a token, a hint that jumps a level, an answer before the
 * clues are in or after the puzzle is solved. So a retried, raced or
 * tampered write can never corrupt progress; at worst it is ignored.
 */

/** Pings and emotes are capped so a long session cannot bloat the row. */
export const RC_LOG_LIMIT = 240;

const SEATS: Seat[] = ['host', 'guest'];

export function rcOtherSeat(seat: Seat): Seat {
  return seat === 'host' ? 'guest' : 'host';
}

export function startRc(scenario: RcScenario, hostGender?: 'male' | 'female'): RcClaudeState {
  const host: RcCharacter = hostGender === 'female' ? 'wife' : 'husband';
  return {
    kind: 'rc_claude',
    scenarioId: scenario.scenarioId,
    cast: { host, guest: host === 'husband' ? 'wife' : 'husband' },
    log: [],
  };
}

export function isRcClaudeState(value: unknown): value is RcClaudeState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<RcClaudeState>;
  return state.kind === 'rc_claude' && typeof state.scenarioId === 'string' && Array.isArray(state.log) && !!state.cast;
}

export interface RcProposal {
  value: string;
  by: Seat;
  agreed: Seat[];
}

export interface RcView {
  discovered: string[];
  collected: string[];
  hintLevel: 0 | 1 | 2 | 3;
  proposal: RcProposal | null;
  /** Agreed answers that did not open the box, newest last. */
  misses: string[];
  solved: boolean;
  /** Every required clue is on the board; the box or tray can be used. */
  ready: boolean;
  /** The last ping per seat, with its position in the log. */
  pings: Partial<Record<Seat, { hotspotId: string; at: number }>>;
  emotes: Partial<Record<Seat, { emote: RcEmote; at: number }>>;
  /** Valid events applied, the shared progress counter. */
  applied: number;
  /** Who did each of the most recent things, for character poses. */
  lastBySeat: Partial<Record<Seat, { type: RcAction['type']; at: number }>>;
}

function emptyView(): RcView {
  return {
    discovered: [],
    collected: [],
    hintLevel: 0,
    proposal: null,
    misses: [],
    solved: false,
    ready: false,
    pings: {},
    emotes: {},
    applied: 0,
    lastBySeat: {},
  };
}

export function requiredClues(scenario: RcScenario): string[] {
  return scenario.clues.map((clue) => clue.id);
}

/** Whether `value` is even a well-formed answer for this scenario. */
export function answerShapeOk(scenario: RcScenario, value: string): boolean {
  const { answer } = scenario;
  if (answer.kind === 'symbol_sequence') return new RegExp(`^[0-9]{${answer.slots}}$`).test(value);
  return answer.options.some((option) => option.id === value);
}

export function answerCorrect(scenario: RcScenario, value: string): boolean {
  return scenario.answer.value === value;
}

/**
 * Applies one event to a view, returning the next view or null when the
 * event is not valid at this point. Never mutates.
 */
function step(scenario: RcScenario, view: RcView, event: RcEvent, at: number): RcView | null {
  if (!SEATS.includes(event.seat)) return null;
  const solvedLock = view.solved && event.type !== 'ping' && event.type !== 'emote';
  if (solvedLock) return null;
  const mark = (next: RcView): RcView => ({
    ...next,
    applied: view.applied + 1,
    lastBySeat: { ...next.lastBySeat, [event.seat]: { type: event.type, at } },
  });

  switch (event.type) {
    case 'inspect': {
      const spot = scenario.hotspots.find((hotspot) => hotspot.id === event.hotspotId);
      if (!spot || view.discovered.includes(spot.id)) return null;
      return mark({ ...view, discovered: [...view.discovered, spot.id] });
    }
    case 'collect': {
      const clue = scenario.clues.find((item) => item.id === event.clueId);
      if (!clue || view.collected.includes(clue.id)) return null;
      const spot = scenario.hotspots.find((hotspot) => hotspot.clueId === clue.id);
      if (!spot || !view.discovered.includes(spot.id)) return null;
      const collected = [...view.collected, clue.id];
      const ready = requiredClues(scenario).every((id) => collected.includes(id));
      return mark({ ...view, collected, ready });
    }
    case 'ping': {
      if (!scenario.hotspots.some((hotspot) => hotspot.id === event.hotspotId)) return null;
      const last = view.pings[event.seat];
      if (last && last.hotspotId === event.hotspotId && view.lastBySeat[event.seat]?.at === last.at) return null;
      return mark({ ...view, pings: { ...view.pings, [event.seat]: { hotspotId: event.hotspotId, at } } });
    }
    case 'emote':
      return mark({ ...view, emotes: { ...view.emotes, [event.seat]: { emote: event.emote, at } } });
    case 'hint': {
      if (event.level !== view.hintLevel + 1) return null;
      return mark({ ...view, hintLevel: event.level });
    }
    case 'propose': {
      if (!view.ready || !answerShapeOk(scenario, event.value)) return null;
      if (view.proposal?.value === event.value) return null;
      return mark({ ...view, proposal: { value: event.value, by: event.seat, agreed: [event.seat] } });
    }
    case 'confirm': {
      const proposal = view.proposal;
      if (!proposal || proposal.value !== event.value || proposal.agreed.includes(event.seat)) return null;
      const agreed = [...proposal.agreed, event.seat];
      if (agreed.length < SEATS.length) return mark({ ...view, proposal: { ...proposal, agreed } });
      // Both agreed. The box opens, or it stays closed and they look again.
      if (answerCorrect(scenario, proposal.value)) return mark({ ...view, proposal: { ...proposal, agreed }, solved: true });
      return mark({ ...view, proposal: null, misses: [...view.misses, proposal.value] });
    }
  }
}

export function deriveRc(scenario: RcScenario, state: RcClaudeState): RcView {
  let view = emptyView();
  const seen = new Set<string>();
  state.log.forEach((event, at) => {
    if (!event || typeof event.id !== 'string' || seen.has(event.id)) return;
    seen.add(event.id);
    view = step(scenario, view, event, at) ?? view;
  });
  return view;
}

export type RcAppendResult =
  | { kind: 'applied'; state: RcClaudeState; view: RcView }
  /** Already in the log under this id: a retry that landed. */
  | { kind: 'duplicate' }
  /** Not valid now (already collected, already solved…). Nothing to write. */
  | { kind: 'ignored' };

/** The next state with this action in it, or why there is nothing to write. */
export function appendRc(
  scenario: RcScenario,
  state: RcClaudeState,
  action: RcAction,
  seat: Seat,
  actionId: string
): RcAppendResult {
  if (state.log.some((event) => event.id === actionId)) return { kind: 'duplicate' };
  const isChatter = action.type === 'ping' || action.type === 'emote';
  if (isChatter && state.log.length >= RC_LOG_LIMIT) return { kind: 'ignored' };
  const before = deriveRc(scenario, state);
  const event = { ...action, id: actionId, seat } as RcEvent;
  const after = step(scenario, before, event, state.log.length);
  if (!after) return { kind: 'ignored' };
  const nextState: RcClaudeState = { ...state, log: [...state.log, event] };
  return { kind: 'applied', state: nextState, view: deriveRc(scenario, nextState) };
}

/** Whose move the server should badge. Null while either can act. */
export function rcAwaiting(view: RcView): Seat | 'both' | null {
  if (view.solved) return null;
  if (view.proposal && view.proposal.agreed.length === 1) return rcOtherSeat(view.proposal.by);
  return null;
}

/** 0–1 for the progress line: clues found, then agreement. */
export function rcProgress(scenario: RcScenario, view: RcView): number {
  if (view.solved) return 1;
  const total = scenario.clues.length + 1;
  return Math.min(0.95, (view.collected.length + (view.proposal ? 0.5 : 0)) / total);
}

/** A character's pose, from what their player did most recently. */
export function rcPose(view: RcView, seat: Seat): RcPose {
  if (view.solved) return 'celebrating';
  const last = view.lastBySeat[seat];
  if (!last) return 'idle';
  // Only a recent action shows: within the last three events anyone made.
  const latest = Math.max(...Object.values(view.lastBySeat).map((item) => item?.at ?? -1));
  if (latest - last.at > 3) return 'idle';
  if (last.type === 'inspect' || last.type === 'ping') return 'noticing';
  if (last.type === 'collect' || last.type === 'propose' || last.type === 'confirm') return 'interacting';
  return 'idle';
}

/** The private clue for this seat, and only this seat. */
export function privateClueFor(scenario: RcScenario, seat: Seat) {
  return scenario.privateClues.find((clue) => clue.owner === seat);
}

/** Whether a stored session can be played with the content this app has. */
export function rcContentMatches(scenario: RcScenario, state: unknown, contentVersion: number | undefined): boolean {
  return isRcClaudeState(state) && state.scenarioId === scenario.scenarioId && (contentVersion ?? 1) === scenario.version;
}

let counter = 0;

/** A client action id, unique enough across two phones and retries. */
export function rcActionId(seat: Seat): string {
  counter = (counter + 1) % 1_000_000;
  return `${seat[0]}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
