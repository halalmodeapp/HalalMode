import type {
  Adventure,
  AdventureState,
  LessonCard,
  RoleId,
  Seat,
  StoryChoice,
  StoryDecision,
  StoryEnding,
  StoryReveal,
  StoryScene,
  Target,
} from '../types.ts';
import { applyEffects, holds, possibleTargets, resolveNext } from './conditions.ts';

const END = 'end:';

/**
 * Seats take the character of their own gender when the story allows it, so
 * a brother plays the husband and a sister the wife. Without a gender the
 * host plays A.
 */
export function startAdventure(
  adventure: Adventure,
  hostGender?: 'male' | 'female'
): AdventureState {
  const hostRole: RoleId =
    hostGender && adventure.roles.B.gender === hostGender && adventure.roles.A.gender !== hostGender
      ? 'B'
      : 'A';
  const vars: Record<string, number> = {};
  for (const [name, variable] of Object.entries(adventure.variables)) vars[name] = variable.initial;
  return {
    kind: 'adventure',
    sceneId: adventure.start,
    step: 0,
    attempt: 0,
    roles: hostRole === 'A' ? { A: 'host', B: 'guest' } : { A: 'guest', B: 'host' },
    vars,
    flags: [],
    history: [],
  };
}

export function roleOfSeat(state: AdventureState, seat: Seat): RoleId {
  return state.roles.A === seat ? 'A' : 'B';
}

export function currentScene(adventure: Adventure, state: AdventureState): StoryScene | undefined {
  if (state.endingId) return undefined;
  return adventure.scenes[state.sceneId];
}

export function currentEnding(adventure: Adventure, state: AdventureState): StoryEnding | undefined {
  return state.endingId ? adventure.endings[state.endingId] : undefined;
}

/** Every answer is filed under its step, so a replayed scene is a new key. */
export function decisionKey(state: AdventureState): string {
  return `a:${state.step}:${state.attempt}`;
}

/** The options a given seat may pick from right now. */
export function choicesFor(
  decision: StoryDecision,
  state: AdventureState,
  seat: Seat
): StoryChoice[] {
  const pool =
    decision.mode === 'private' && decision.byRole
      ? decision.byRole[roleOfSeat(state, seat)]
      : decision.choices;
  return pool.filter((choice) => holds(choice.when, state));
}

export type AdventurePending =
  | { type: 'role'; seat: Seat; key: string }
  | { type: 'sealed'; key: string; joint: boolean }
  | { type: 'ended' };

export function adventurePending(adventure: Adventure, state: AdventureState): AdventurePending {
  const scene = currentScene(adventure, state);
  if (!scene) return { type: 'ended' };
  const key = decisionKey(state);
  const { decision } = scene;
  if (decision.mode === 'role') {
    return { type: 'role', seat: state.roles[decision.actor ?? 'A'], key };
  }
  return { type: 'sealed', key, joint: decision.mode === 'joint' };
}

export function scenePassages(scene: StoryScene, state: AdventureState): string[] {
  return scene.passages.filter((passage) => holds(passage.when, state)).map((passage) => passage.text);
}

export function sceneLessons(scene: StoryScene, state: AdventureState): LessonCard[] {
  return (scene.lessons ?? []).filter((lesson) => holds(lesson.when, state));
}

export function endingEpilogues(ending: StoryEnding, state: AdventureState): string[] {
  return (ending.epilogues ?? []).filter((passage) => holds(passage.when, state)).map((passage) => passage.text);
}

/** Finds a choice by id among everything a scene offers. */
export function findChoice(decision: StoryDecision, choiceId: string): StoryChoice | undefined {
  return (
    decision.choices.find((choice) => choice.id === choiceId) ??
    decision.byRole?.A.find((choice) => choice.id === choiceId) ??
    decision.byRole?.B.find((choice) => choice.id === choiceId)
  );
}

function goTo(state: AdventureState, target: Target): AdventureState {
  if (target.startsWith(END)) {
    return { ...state, endingId: target.slice(END.length), step: state.step + 1, attempt: 0 };
  }
  return { ...state, sceneId: target, step: state.step + 1, attempt: 0 };
}

function lessonIds(choices: StoryChoice[], state: AdventureState): string[] {
  return choices
    .map((choice) => choice.lesson)
    .filter((lesson): lesson is LessonCard => !!lesson && holds(lesson.when, state))
    .map((lesson) => lesson.id);
}

/** How many recent reveals a session keeps for a player who was away. */
const REVEALS_KEPT = 8;

/** Files a reveal under the next number, so each phone can tell which it has read. */
function withReveal(state: AdventureState, reveal: Omit<StoryReveal, 'seq'>): AdventureState {
  const reveals = state.reveals ?? [];
  const seq = (reveals[reveals.length - 1]?.seq ?? 0) + 1;
  return { ...state, reveals: [...reveals, { ...reveal, seq }].slice(-REVEALS_KEPT) };
}

export function latestReveal(state: AdventureState): StoryReveal | undefined {
  return state.reveals?.[state.reveals.length - 1];
}

/** One player, holding the character whose call it is, decides. */
export function resolveRoleChoice(
  adventure: Adventure,
  state: AdventureState,
  seat: Seat,
  choiceId: string
): AdventureState {
  const scene = currentScene(adventure, state);
  if (!scene || scene.decision.mode !== 'role') throw new Error('No role decision is open.');
  if (state.roles[scene.decision.actor ?? 'A'] !== seat) throw new Error('It is not this seat’s turn.');
  const choice = choicesFor(scene.decision, state, seat).find((item) => item.id === choiceId);
  if (!choice) throw new Error(`Choice ${choiceId} is not available.`);

  const affected = applyEffects(state, choice.effects);
  const target = resolveNext(choice.next, affected);
  const picks = { [seat]: choice.id } as Partial<Record<Seat, string>>;
  return goTo(
    withReveal(
      { ...affected, history: [...state.history, { sceneId: scene.id, picks, beats: [choice.beat] }] },
      { sceneId: scene.id, step: state.step, mode: 'role', picks, beats: [choice.beat], lessonIds: lessonIds([choice], affected) }
    ),
    target
  );
}

/**
 * Both sealed choices are in. Private decisions always move the story on;
 * joint ones move it on only when the two choices match.
 */
export function resolveSealedChoices(
  adventure: Adventure,
  state: AdventureState,
  picks: Record<Seat, string>
): AdventureState {
  const scene = currentScene(adventure, state);
  if (!scene || scene.decision.mode === 'role') throw new Error('No sealed decision is open.');
  const { decision } = scene;
  const host = choicesFor(decision, state, 'host').find((choice) => choice.id === picks.host);
  const guest = choicesFor(decision, state, 'guest').find((choice) => choice.id === picks.guest);
  if (!host || !guest) throw new Error('A sealed choice is not available.');

  if (decision.mode === 'joint') {
    if (host.id !== guest.id) {
      return withReveal(
        { ...state, attempt: state.attempt + 1 },
        { sceneId: scene.id, step: state.step, mode: 'joint', picks: { ...picks }, beats: [], mismatch: true, lessonIds: [] }
      );
    }
    const affected = applyEffects(state, host.effects);
    return goTo(
      withReveal(
        { ...affected, history: [...state.history, { sceneId: scene.id, picks: { ...picks }, beats: [host.beat] }] },
        { sceneId: scene.id, step: state.step, mode: 'joint', picks: { ...picks }, beats: [host.beat], lessonIds: lessonIds([host], affected) }
      ),
      resolveNext(host.next, affected)
    );
  }

  // Private: put the choices in character order so combos read [A, B].
  const byRole = { A: state.roles.A === 'host' ? host : guest, B: state.roles.A === 'host' ? guest : host };
  const same = byRole.A.id === byRole.B.id;
  const chosen = same ? [byRole.A] : [byRole.A, byRole.B];
  let affected = chosen.reduce((current, choice) => applyEffects(current, choice.effects), state);

  const combo = decision.combos?.find(({ pair: [first, second] }) =>
    decision.byRole
      ? first === byRole.A.id && second === byRole.B.id
      : (first === byRole.A.id && second === byRole.B.id) || (first === byRole.B.id && second === byRole.A.id)
  );
  affected = applyEffects(affected, combo?.effects);
  const next = combo?.next ?? (same ? byRole.A.next : decision.diverge ?? byRole.A.next);
  const beats = combo?.beat ? [combo.beat] : chosen.map((choice) => choice.beat);

  return goTo(
    withReveal(
      { ...affected, history: [...state.history, { sceneId: scene.id, picks: { ...picks }, beats }] },
      { sceneId: scene.id, step: state.step, mode: 'private', picks: { ...picks }, beats, lessonIds: lessonIds(chosen, affected) }
    ),
    resolveNext(next, affected)
  );
}

/** After this many mismatched joint choices, the couple may let the story decide. */
export const JOINT_ESCAPE_AFTER = 2;

export function canLetStoryDecide(adventure: Adventure, state: AdventureState): boolean {
  const scene = currentScene(adventure, state);
  const last = latestReveal(state);
  return !!scene && scene.decision.mode === 'joint' && state.attempt >= JOINT_ESCAPE_AFTER && !!last?.mismatch && last.step === state.step;
}

/**
 * Two people who keep choosing differently can hand the call to the story: it
 * takes one of their last two choices — alternating whose by step, so neither
 * always wins — as if both had picked it.
 */
export function letStoryDecide(adventure: Adventure, state: AdventureState): AdventureState {
  if (!canLetStoryDecide(adventure, state)) throw new Error('The story cannot decide here.');
  const picks = latestReveal(state)?.picks ?? {};
  const pick = (state.step % 2 === 0 ? picks.host : picks.guest) ?? picks.host ?? picks.guest;
  if (!pick) throw new Error('No earlier choices to decide between.');
  return resolveSealedChoices(adventure, state, { host: pick, guest: pick });
}

/** Looks a lesson up anywhere in the story, by id. */
export function findLesson(adventure: Adventure, lessonId: string): LessonCard | undefined {
  for (const scene of Object.values(adventure.scenes)) {
    for (const lesson of scene.lessons ?? []) if (lesson.id === lessonId) return lesson;
    const all = [...scene.decision.choices, ...(scene.decision.byRole?.A ?? []), ...(scene.decision.byRole?.B ?? [])];
    for (const choice of all) if (choice.lesson?.id === lessonId) return choice.lesson;
  }
  return undefined;
}

/** The hidden states, read out at the ending. */
export function variableReadings(adventure: Adventure, state: AdventureState) {
  return Object.entries(adventure.variables).map(([name, variable]) => {
    const value = state.vars[name] ?? variable.initial;
    const delta = value - variable.initial;
    const level: 0 | 1 | 2 = delta <= -2 ? 0 : delta >= 2 ? 2 : 1;
    return { name, label: variable.label, reading: variable.readings[level], level, value, concerning: !!variable.concerning };
  });
}

// ---------------------------------------------------------------------------
// Validation and exploration — used by tests, and by anyone writing a story
// ---------------------------------------------------------------------------

function allChoices(decision: StoryDecision): StoryChoice[] {
  return [...decision.choices, ...(decision.byRole?.A ?? []), ...(decision.byRole?.B ?? [])];
}

/** Structural problems: broken links, unreachable scenes, unused endings. */
export function validateAdventure(adventure: Adventure): string[] {
  const problems: string[] = [];
  const check = (target: Target, where: string) => {
    if (target.startsWith(END)) {
      if (!adventure.endings[target.slice(END.length)]) problems.push(`${where} → missing ending ${target}`);
    } else if (!adventure.scenes[target]) {
      problems.push(`${where} → missing scene ${target}`);
    }
  };
  if (!adventure.scenes[adventure.start]) problems.push(`start scene ${adventure.start} is missing`);

  const reached = new Set<string>([adventure.start]);
  const queue = [adventure.start];
  while (queue.length) {
    const id = queue.shift() as string;
    const scene = adventure.scenes[id];
    if (!scene) continue;
    if (scene.id !== id) problems.push(`scene ${id} declares id ${scene.id}`);
    const { decision } = scene;
    if (decision.mode === 'role' && !decision.actor) problems.push(`${id}: role decision without actor`);
    if (decision.mode !== 'private' && decision.byRole) problems.push(`${id}: byRole only works in private mode`);
    const choices = allChoices(decision);
    if (choices.length < 2) problems.push(`${id}: fewer than two choices`);
    const ids = new Set<string>();
    const targets: Target[] = [];
    for (const choice of choices) {
      if (ids.has(choice.id) && !decision.byRole) problems.push(`${id}: duplicate choice ${choice.id}`);
      ids.add(choice.id);
      targets.push(...possibleTargets(choice.next));
    }
    for (const combo of decision.combos ?? []) {
      for (const choiceId of combo.pair) if (!ids.has(choiceId)) problems.push(`${id}: combo names unknown ${choiceId}`);
      targets.push(...possibleTargets(combo.next));
    }
    if (decision.diverge) targets.push(...possibleTargets(decision.diverge));
    for (const target of targets) {
      check(target, id);
      if (!target.startsWith(END) && !reached.has(target)) {
        reached.add(target);
        queue.push(target);
      }
    }
  }
  for (const id of Object.keys(adventure.scenes)) {
    if (!reached.has(id)) problems.push(`scene ${id} can never be reached`);
  }
  return problems;
}

export interface Exploration {
  /** Ending ids some playthrough actually reaches. */
  endings: Set<string>;
  /** Distinct ending-plus-epilogue combinations — what a couple can read at the end. */
  outcomes: Set<string>;
  scenesVisited: Set<string>;
  /** Positions where no choice was available. */
  deadEnds: string[];
  statesExplored: number;
}

/**
 * Plays every combination of choices — honouring conditions, effects and
 * combos — to prove what can really happen. Memoised on the full story
 * state, so it stays fast on large branching stories.
 */
export function exploreAdventure(adventure: Adventure, limit = 200_000): Exploration {
  const result: Exploration = {
    endings: new Set(),
    outcomes: new Set(),
    scenesVisited: new Set(),
    deadEnds: [],
    statesExplored: 0,
  };
  const seen = new Set<string>();
  const stack: AdventureState[] = [startAdventure(adventure)];
  while (stack.length && result.statesExplored < limit) {
    const state = stack.pop() as AdventureState;
    const ending = currentEnding(adventure, state);
    if (ending) {
      result.endings.add(ending.id);
      result.outcomes.add([ending.id, ...endingEpilogues(ending, state)].join('|'));
      continue;
    }
    const memo = `${state.sceneId}|${JSON.stringify(state.vars)}|${[...state.flags].sort().join(',')}`;
    if (seen.has(memo)) continue;
    seen.add(memo);
    result.statesExplored += 1;
    const scene = currentScene(adventure, state);
    if (!scene) {
      result.deadEnds.push(state.sceneId);
      continue;
    }
    result.scenesVisited.add(scene.id);
    const fresh = { ...state, history: [], reveals: [] };
    const { decision } = scene;
    if (decision.mode === 'role') {
      const seat = state.roles[decision.actor ?? 'A'];
      const options = choicesFor(decision, fresh, seat);
      if (!options.length) result.deadEnds.push(scene.id);
      for (const choice of options) stack.push(resolveRoleChoice(adventure, fresh, seat, choice.id));
    } else {
      const hostOptions = choicesFor(decision, fresh, 'host');
      const guestOptions = choicesFor(decision, fresh, 'guest');
      if (!hostOptions.length || !guestOptions.length) result.deadEnds.push(scene.id);
      for (const host of hostOptions) {
        for (const guest of guestOptions) {
          if (decision.mode === 'joint' && host.id !== guest.id) continue;
          stack.push(resolveSealedChoices(adventure, fresh, { host: host.id, guest: guest.id }));
        }
      }
    }
  }
  return result;
}
