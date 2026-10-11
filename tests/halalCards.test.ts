import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ADVENTURES,
  ALL_ACTIVITIES,
  LAB_LESSONS,
  QUIZZES,
  findActivity,
} from '../src/halalCards/content/index';
import {
  adventurePending,
  canLetStoryDecide,
  letStoryDecide,
  choicesFor,
  exploreAdventure,
  findLesson,
  latestReveal,
  resolveRoleChoice,
  resolveSealedChoices,
  startAdventure,
  validateAdventure,
  variableReadings,
} from '../src/halalCards/engine/adventure';
import { holds, resolveNext } from '../src/halalCards/engine/conditions';
import { revealCard, scoreQuiz, quizNeeds } from '../src/halalCards/engine/quiz';
import { advanceCursor, awaitingOf, contentMatches, currentTurn, initialState, isFinished } from '../src/halalCards/engine/session';
import {
  firstTrack,
  initialSeenCursor,
  inTrack,
  promptRepeatsTitle,
  quizSummaryKey,
  resolveRetryDelay,
  showFormatEyebrow,
  viewCursor,
} from '../src/halalCards/present';
import { soloActingSeat, soloAdvance, soloAnswer, soloStart, soloView } from '../src/halalCards/solo';
import { sessionCue } from '../src/halalCards/status';
import { canStartSession } from '../src/halalCards/access';
import { activityStrings, placeholdersOf, translateActivity } from '../src/halalCards/i18n';
import type { Adventure, AdventureState, CardsSession, Quiz } from '../src/halalCards/types';
import { SITE_COUNTS_PATH, siteCountsScript } from '../src/halalCards/siteCounts';

function session(partial: Partial<CardsSession> & Pick<CardsSession, 'state' | 'activityId'>): CardsSession {
  return {
    id: 's1',
    connectionId: 'c1',
    hostId: 'h',
    mySeat: 'host',
    status: 'active',
    version: 1,
    answers: {},
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

test('the catalogue has what the first build promised', () => {
  assert.deepEqual(LAB_LESSONS.map((lesson) => lesson.rule), ['zero', 'one', 'two', 'three']);
  assert.ok(new Set(QUIZZES.map((quiz) => quiz.format)).size >= 5, 'at least five quiz formats');
  assert.ok(ADVENTURES.length >= 3);
  assert.ok(ADVENTURES.length >= 15, 'every outlined adventure is built');
  const ids = ALL_ACTIVITIES.map((activity) => activity.id);
  assert.equal(new Set(ids).size, ids.length, 'activity ids are unique');
  assert.equal(findActivity('lab-rule-one')?.title, 'Sweat the small stuff');
});

test('every lab lesson teaches through several scenarios, then insight and discussion', () => {
  for (const lesson of LAB_LESSONS) {
    const types = lesson.steps.map((step) => step.type);
    assert.ok(types.filter((type) => type === 'scenario').length >= 3, `${lesson.id} has 3+ scenarios`);
    assert.ok(types.includes('insight') && types.includes('discussion'), `${lesson.id} ends in insight and discussion`);
    for (const step of lesson.steps) {
      if (step.type !== 'scenario') continue;
      assert.ok(step.choices.some((choice) => choice.tone === 'helps'), `${step.id} has a healthier option`);
      assert.ok(step.choices.some((choice) => choice.tone !== 'helps'), `${step.id} has a tempting one`);
    }
  }
});

test('quiz cards fit their format', () => {
  for (const quiz of QUIZZES) {
    for (const card of quiz.cards) {
      if (quiz.format === 'more_likely') continue;
      assert.ok(card.options.length >= 2, `${card.id} has options`);
      if (quiz.format === 'know_me' || quiz.format === 'guess_my_answer') {
        assert.ok(card.guessPrompt?.includes('{{name}}'), `${card.id} has a personal guess prompt`);
      }
      if (quiz.format === 'would_you_rather') assert.equal(card.options.length, 2);
    }
  }
});

for (const adventure of ADVENTURES) {
  test(`${adventure.title}: structure is sound`, () => {
    assert.deepEqual(validateAdventure(adventure), []);
    const modes = new Set(Object.values(adventure.scenes).map((scene) => scene.decision.mode));
    assert.deepEqual([...modes].sort(), ['joint', 'private', 'role'], 'uses every kind of decision');
    const actors = new Set(
      Object.values(adventure.scenes)
        .filter((scene) => scene.decision.mode === 'role')
        .map((scene) => scene.decision.actor)
    );
    assert.deepEqual([...actors].sort(), ['A', 'B'], 'both characters get turns');
    assert.ok(Object.values(adventure.scenes).some((scene) => scene.turningPoint && scene.image), 'has an illustrated turning point');
    for (const ending of Object.values(adventure.endings)) {
      assert.ok(ending.image.prompt && ending.whatHappened && ending.pattern.name && ending.couldHaveChanged && ending.takeaway, `${ending.id} is complete`);
    }
  });

  test(`${adventure.title}: real play reaches every scene and every ending`, () => {
    const explored = exploreAdventure(adventure);
    assert.deepEqual(explored.deadEnds, [], 'no position without a choice');
    assert.deepEqual(
      Object.keys(adventure.scenes).filter((id) => !explored.scenesVisited.has(id)),
      [],
      'every scene is reachable by playing'
    );
    assert.deepEqual(
      Object.keys(adventure.endings).filter((id) => !explored.endings.has(id)),
      [],
      'every ending is reachable by playing'
    );
    assert.ok(Object.keys(adventure.endings).length >= 8, 'branches wildly');
    assert.ok(explored.outcomes.size >= 10, `distinct outcomes: ${explored.outcomes.size}`);
  });

  test(`${adventure.title}: every lesson id resolves`, () => {
    for (const scene of Object.values(adventure.scenes)) {
      const choices = [...scene.decision.choices, ...(scene.decision.byRole?.A ?? []), ...(scene.decision.byRole?.B ?? [])];
      for (const choice of choices) if (choice.lesson) assert.ok(findLesson(adventure, choice.lesson.id));
    }
  });
}

test('across the stories there are dozens of possible outcomes', () => {
  const total = ADVENTURES.reduce((sum, adventure) => sum + exploreAdventure(adventure).outcomes.size, 0);
  assert.ok(total >= 36, `outcomes: ${total}`);
});

test('every scenario, scene and ending has room for an illustration', () => {
  for (const lesson of LAB_LESSONS) {
    for (const step of lesson.steps) {
      if (step.type === 'scenario') assert.ok(step.image, `${lesson.id}/${step.id} has an image slot`);
    }
  }
  const ids = new Set<string>();
  const seen = (id: string) => {
    assert.ok(!ids.has(id), `image slot ${id} is used once`);
    ids.add(id);
  };
  for (const activity of ALL_ACTIVITIES) seen(activity.cover.id);
  for (const adventure of ADVENTURES) {
    for (const scene of Object.values(adventure.scenes)) {
      assert.ok(scene.image, `${adventure.id}/${scene.id} has an image slot`);
      seen(scene.image!.id);
    }
    for (const ending of Object.values(adventure.endings)) seen(ending.image.id);
  }
});

test('conditions and routes', () => {
  const context = { vars: { trust: 2 }, flags: ['told'] };
  assert.equal(holds({ var: 'trust', gte: 2 }, context), true);
  assert.equal(holds({ var: 'trust', lte: 1 }, context), false);
  assert.equal(holds({ all: [{ flag: 'told' }, { notFlag: 'hid' }] }, context), true);
  assert.equal(holds({ any: [{ flag: 'hid' }, { var: 'missing', lte: 0 }] }, context), true);
  assert.equal(resolveNext({ routes: [{ when: { flag: 'hid' }, to: 'a' }, { to: 'b' }] }, context), 'b');
});

const tiny: Adventure = {
  id: 'tiny',
  kind: 'adventure',
  title: 'Tiny',
  tagline: '',
  description: '',
  minutes: 1,
  themes: [],
  cover: { id: 'c', role: 'cover', prompt: 'p', alt: 'a' },
  roles: { A: { name: 'Adam', gender: 'male', sketch: '' }, B: { name: 'Bushra', gender: 'female', sketch: '' } },
  variables: { trust: { label: 'Trust', initial: 0, readings: ['low', 'mid', 'high'] } },
  start: 'one',
  scenes: {
    one: {
      id: 'one',
      title: 'One',
      passages: [{ text: 'Start.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: '?',
        choices: [
          { id: 'kind', label: 'Kind', effects: { vars: { trust: 2 } }, next: 'two', beat: 'B was kind.' },
          { id: 'cold', label: 'Cold', effects: { vars: { trust: -2 }, flags: ['cold'] }, next: 'two', beat: 'B was cold.' },
        ],
      },
    },
    two: {
      id: 'two',
      title: 'Two',
      passages: [{ text: 'Warm.', when: { var: 'trust', gte: 1 } }, { text: 'Chilly.', when: { flag: 'cold' } }],
      decision: {
        mode: 'private',
        prompt: '?',
        choices: [],
        byRole: {
          A: [
            { id: 'stay', label: 'Stay', next: 'three', beat: 'A stayed.' },
            { id: 'go', label: 'Go', next: 'three', beat: 'A left.' },
          ],
          B: [
            { id: 'reach', label: 'Reach', next: 'three', beat: 'B reached.' },
            { id: 'wait', label: 'Wait', next: 'three', beat: 'B waited.' },
          ],
        },
        combos: [{ pair: ['go', 'reach'], next: 'end:loop', beat: 'The loop.' }],
      },
    },
    three: {
      id: 'three',
      title: 'Three',
      passages: [{ text: 'Choose together.' }],
      decision: {
        mode: 'joint',
        prompt: '?',
        choices: [
          { id: 'talk', label: 'Talk', next: { routes: [{ when: { var: 'trust', gte: 1 }, to: 'end:good' }, { to: 'end:ok' }] }, beat: 'They talked.' },
          { id: 'bury', label: 'Bury', when: { notFlag: 'cold' }, next: 'end:ok', beat: 'They buried it.' },
        ],
      },
    },
  },
  endings: {
    good: { id: 'good', title: 'Good', mood: 'tender', image: { id: 'g', role: 'outcome', prompt: 'p', alt: 'a' }, whatHappened: '', pattern: { name: '', explanation: '' }, couldHaveChanged: '', takeaway: '' },
    ok: { id: 'ok', title: 'Ok', mood: 'steady', image: { id: 'o', role: 'outcome', prompt: 'p', alt: 'a' }, whatHappened: '', pattern: { name: '', explanation: '' }, couldHaveChanged: '', takeaway: '' },
    loop: { id: 'loop', title: 'Loop', mood: 'strained', image: { id: 'l', role: 'outcome', prompt: 'p', alt: 'a' }, whatHappened: '', pattern: { name: '', explanation: '' }, couldHaveChanged: '', takeaway: '' },
  },
};

test('seats take the character of their own gender', () => {
  assert.deepEqual(startAdventure(tiny, 'female').roles, { A: 'guest', B: 'host' });
  assert.deepEqual(startAdventure(tiny, 'male').roles, { A: 'host', B: 'guest' });
  assert.deepEqual(startAdventure(tiny).roles, { A: 'host', B: 'guest' });
});

test('turns: only the character’s player may decide, and choices carry forward', () => {
  let state = startAdventure(tiny, 'male'); // host = Adam (A), guest = Bushra (B)
  assert.deepEqual(adventurePending(tiny, state), { type: 'role', seat: 'guest', key: 'a:0:0' });
  assert.throws(() => resolveRoleChoice(tiny, state, 'host', 'kind'));
  state = resolveRoleChoice(tiny, state, 'guest', 'cold');
  assert.equal(state.sceneId, 'two');
  assert.equal(state.vars.trust, -2);
  assert.deepEqual(latestReveal(state)?.picks, { guest: 'cold' });
  assert.equal(latestReveal(state)?.seq, 1);

  // Private, by role: each seat sees only their character's options.
  assert.deepEqual(choicesFor(tiny.scenes.two!.decision, state, 'host').map((c) => c.id), ['stay', 'go']);
  assert.deepEqual(choicesFor(tiny.scenes.two!.decision, state, 'guest').map((c) => c.id), ['reach', 'wait']);
  state = resolveSealedChoices(tiny, state, { host: 'stay', guest: 'wait' });
  assert.equal(state.sceneId, 'three');
  assert.deepEqual(state.history[1]?.beats, ['A stayed.', 'B waited.']);

  // An earlier cold choice closed a door.
  assert.deepEqual(choicesFor(tiny.scenes.three!.decision, state, 'host').map((c) => c.id), ['talk']);
});

test('combos are matched in character order and override the default path', () => {
  let state: AdventureState = resolveRoleChoice(tiny, startAdventure(tiny, 'female'), 'host', 'kind');
  // host is Bushra (B) here, so the pair [A=go, B=reach] is guest=go, host=reach.
  const looped = resolveSealedChoices(tiny, state, { host: 'reach', guest: 'go' });
  assert.equal(looped.endingId, 'loop');
  assert.deepEqual(looped.history.at(-1)?.beats, ['The loop.']);
  state = resolveSealedChoices(tiny, state, { host: 'wait', guest: 'go' });
  assert.equal(state.sceneId, 'three');
});

test('joint decisions go round again until both agree', () => {
  let state = resolveRoleChoice(tiny, startAdventure(tiny, 'male'), 'guest', 'kind');
  state = resolveSealedChoices(tiny, state, { host: 'stay', guest: 'reach' });
  const before = state.step;
  const retry = resolveSealedChoices(tiny, state, { host: 'talk', guest: 'bury' });
  assert.equal(retry.sceneId, 'three');
  assert.equal(retry.step, before);
  assert.equal(retry.attempt, 1);
  assert.equal(latestReveal(retry)?.mismatch, true);
  const agreed = resolveSealedChoices(tiny, retry, { host: 'talk', guest: 'talk' });
  // Every reveal is kept in order for a player who was away.
  assert.deepEqual(agreed.reveals?.map((reveal) => [reveal.seq, reveal.sceneId, !!reveal.mismatch]), [
    [1, 'one', false],
    [2, 'two', false],
    [3, 'three', true],
    [4, 'three', false],
  ]);
  assert.equal(agreed.endingId, 'good');
  assert.equal(variableReadings(tiny, agreed)[0]?.reading, 'high');
});

test('session turns: sealed answers stay sealed until both have answered', () => {
  const story = startAdventure(tiny, 'male');
  const base = session({ activityId: 'tiny', state: story });
  assert.deepEqual(currentTurn(tiny, base), { kind: 'watch', key: 'a:0:0' });
  assert.deepEqual(currentTurn(tiny, { ...base, mySeat: 'guest' }), { kind: 'decide', key: 'a:0:0' });

  const atTwo = resolveRoleChoice(tiny, story, 'guest', 'kind');
  const s2 = session({ activityId: 'tiny', state: atTwo });
  assert.deepEqual(currentTurn(tiny, s2), { kind: 'answer', key: 'a:1:0' });
  const waiting = { ...s2, answers: { 'a:1:0': { mine: 'stay', theirReady: false } } };
  assert.deepEqual(currentTurn(tiny, waiting), { kind: 'waiting', key: 'a:1:0' });
  const both = { ...s2, answers: { 'a:1:0': { mine: 'stay', theirs: 'reach', theirReady: true } } };
  assert.deepEqual(currentTurn(tiny, both), { kind: 'resolve', key: 'a:1:0', picks: { host: 'stay', guest: 'reach' } });
});

test('lab sessions alternate private scenarios with shared reading', () => {
  const lesson = LAB_LESSONS[0]!;
  let state = initialState(lesson);
  assert.deepEqual(currentTurn(lesson, session({ activityId: lesson.id, state })), { kind: 'read' });
  state = advanceCursor(lesson, state);
  const scenario = lesson.steps[1]!;
  const s = session({ activityId: lesson.id, state });
  assert.deepEqual(currentTurn(lesson, s), { kind: 'answer', key: `l:${scenario.id}` });
  assert.deepEqual(
    currentTurn(lesson, { ...s, answers: { [`l:${scenario.id}`]: { mine: 'ask', theirs: 'walk', theirReady: true } } }),
    { kind: 'reveal', key: `l:${scenario.id}` }
  );
  while (!isFinished(lesson, state)) state = advanceCursor(lesson, state);
  assert.deepEqual(currentTurn(lesson, session({ activityId: lesson.id, state })), { kind: 'finished' });
});

test('quizzes: know-me alternates the subject, guesses are scored', () => {
  const quiz = QUIZZES.find((item) => item.format === 'know_me') as Quiz;
  assert.deepEqual(quizNeeds(quiz, 0, 'host'), { self: true, guess: false });
  assert.deepEqual(quizNeeds(quiz, 0, 'guest'), { self: false, guess: true });
  assert.deepEqual(quizNeeds(quiz, 1, 'host'), { self: false, guess: true });
  const reveal = revealCard(quiz, 0, { host: { self: 2 }, guest: { guess: 2 } });
  assert.deepEqual(reveal.guessedRight, { guest: true });

  const score = scoreQuiz(quiz, [
    { host: { self: 2 }, guest: { guess: 2 } },
    { host: { guess: 0 }, guest: { self: 1 } },
  ]);
  assert.deepEqual(score.guesses, { host: { right: 0, total: 1 }, guest: { right: 1, total: 1 } });
});

test('quizzes: more-likely compares who each person pointed at', () => {
  const quiz = QUIZZES.find((item) => item.format === 'more_likely') as Quiz;
  // Host says "me" (0), guest says "my partner" (1): both point at the host.
  assert.equal(revealCard(quiz, 0, { host: { self: 0 }, guest: { self: 1 } }).agreed, true);
  assert.equal(revealCard(quiz, 0, { host: { self: 0 }, guest: { self: 0 } }).agreed, false);
});

test('quizzes: scale measures distance', () => {
  const quiz = QUIZZES.find((item) => item.format === 'scale') as Quiz;
  const reveal = revealCard(quiz, 0, { host: { self: 1 }, guest: { self: 3 } });
  assert.equal(reveal.distance, 2);
  assert.equal(scoreQuiz(quiz, [{ host: { self: 1 }, guest: { self: 2 } }]).close, 1);
});

test('premium unlocks the connection, not the person', () => {
  assert.equal(canStartSession({ myTier: 'premium', access: { unlocked: false, unlockedByMe: false, track: 'getting_to_know' } }), true);
  assert.equal(canStartSession({ myTier: 'free', access: { unlocked: true, unlockedByMe: false, track: 'getting_to_know' } }), true);
  assert.equal(canStartSession({ myTier: 'free', access: { unlocked: false, unlockedByMe: false, track: 'getting_to_know' } }), false);
});

// ---------------------------------------------------------------------------
// Improvement pass: turns, catch-up, escape hatches, versions, solo, tracks
// ---------------------------------------------------------------------------

test('awaiting names who the session waits on, for badges and pushes', () => {
  const lesson = LAB_LESSONS[0]!;
  const atScenario = advanceCursor(lesson, initialState(lesson));
  const key = `l:${lesson.steps[1]!.id}`;
  const base = session({ activityId: lesson.id, state: atScenario });
  assert.equal(awaitingOf(lesson, base), 'both');
  assert.equal(awaitingOf(lesson, { ...base, answers: { [key]: { theirReady: true } } }), 'host');
  assert.equal(awaitingOf(lesson, { ...base, answers: { [key]: { mine: 'ask', theirReady: false } } }), 'guest');
  assert.equal(awaitingOf(lesson, { ...base, answers: { [key]: { mine: 'ask', theirs: 'walk', theirReady: true } } }), null);
  assert.equal(awaitingOf(lesson, session({ activityId: lesson.id, state: initialState(lesson) })), null, 'reading is nobody\'s turn');

  const story = startAdventure(tiny, 'male');
  assert.equal(awaitingOf(tiny, session({ activityId: 'tiny', state: story })), 'guest', 'the actor of a role decision');
});

test('a session on an older content edition is offered a restart', () => {
  const adventure = ADVENTURES[0]!;
  const state = startAdventure(adventure);
  assert.equal(contentMatches(adventure, { state, contentVersion: 1 }), true);
  assert.equal(contentMatches(adventure, { state, contentVersion: 2 }), false);
  assert.equal(contentMatches(adventure, { state: { ...state, sceneId: 'renamed' }, contentVersion: 1 }), false);
  const lesson = LAB_LESSONS[0]!;
  assert.equal(contentMatches(lesson, { state: { kind: 'lab', cursor: 999 }, contentVersion: 1 }), false);
});

test('joint decisions can be handed to the story after two mismatches', () => {
  let state = resolveRoleChoice(tiny, startAdventure(tiny, 'male'), 'guest', 'kind');
  state = resolveSealedChoices(tiny, state, { host: 'stay', guest: 'reach' });
  assert.equal(canLetStoryDecide(tiny, state), false);
  state = resolveSealedChoices(tiny, state, { host: 'talk', guest: 'bury' });
  assert.equal(canLetStoryDecide(tiny, state), false, 'one mismatch is not enough');
  state = resolveSealedChoices(tiny, state, { host: 'talk', guest: 'bury' });
  assert.equal(canLetStoryDecide(tiny, state), true);
  const decided = letStoryDecide(tiny, state);
  assert.ok(decided.endingId, 'the story moves on');
  assert.ok(['talk', 'bury'].includes(decided.history.at(-1)!.picks.host!), 'it takes one of their choices');
});

test('catch-up: a reveal the partner skipped past is still shown', () => {
  const lesson = LAB_LESSONS[0]!;
  const scenario = lesson.steps[1]!;
  const key = `l:${scenario.id}`;
  const answered = { [key]: { mine: 'ask', theirs: 'walk', theirReady: true } };
  const moved = session({ activityId: lesson.id, state: { kind: 'lab', cursor: 2 }, answers: answered });
  assert.equal(initialSeenCursor(lesson, moved), 1, 'opening shows the reveal that was skipped');
  assert.deepEqual(viewCursor(1, 2), { index: 1, catchingUp: true });
  assert.deepEqual(viewCursor(2, 2), { index: 2, catchingUp: false });
  assert.equal(initialSeenCursor(lesson, session({ activityId: lesson.id, state: { kind: 'lab', cursor: 1 } })), 1);
});

test('quiz results are described in words, never counted', () => {
  const quiz = QUIZZES.find((item) => item.format === 'same_page') as Quiz;
  const same = { host: { self: 0 }, guest: { self: 0 } };
  const differ = { host: { self: 0 }, guest: { self: 1 } };
  assert.equal(quizSummaryKey(scoreQuiz(quiz, [same, same, same])), 'quizMostlySame');
  assert.equal(quizSummaryKey(scoreQuiz(quiz, [same, differ])), 'quizMixed');
  assert.equal(quizSummaryKey(scoreQuiz(quiz, [differ, differ, differ])), 'quizMostlyDifferent');
});

test('repeated labels are dropped', () => {
  assert.equal(showFormatEyebrow({ title: 'Would you rather?' }, 'Would you rather'), false);
  assert.equal(showFormatEyebrow({ title: 'Money' }, 'Same page?'), true);
  assert.equal(promptRepeatsTitle({ title: 'Would you rather?' }, 'Would you rather…'), true);
  assert.equal(promptRepeatsTitle({ title: 'Money' }, 'The wedding should be…'), false);
});

test('tracks keep later-stage cards for later', () => {
  const affection = QUIZZES.find((item) => item.id === 'quiz-affection')!;
  assert.equal(inTrack(affection, 'getting_to_know'), false);
  assert.equal(inTrack(affection, 'engaged'), true);
  assert.equal(firstTrack(affection), 'engaged');
  assert.equal(inTrack(LAB_LESSONS[0]!, 'getting_to_know'), true);
});

test('solo preview: a Lab workshop shows every path, alone', () => {
  const lesson = LAB_LESSONS[0]!;
  let run = soloStart(lesson);
  run = soloAdvance(run, advanceCursor(lesson, run.state));
  const key = `l:${lesson.steps[1]!.id}`;
  assert.equal(currentTurn(lesson, soloView(lesson, run)).kind, 'answer');
  run = soloAnswer(lesson, run, key, 'ask');
  assert.deepEqual(currentTurn(lesson, soloView(lesson, run)), { kind: 'reveal', key });
});

test('solo preview: an Adventure is played as both characters', () => {
  let run = soloStart(tiny);
  assert.equal(soloActingSeat(tiny, run), 'guest', 'the first move belongs to B');
  run = soloAdvance(run, resolveRoleChoice(tiny, run.state as AdventureState, 'guest', 'kind'));
  assert.equal(soloActingSeat(tiny, run), 'host');
  run = soloAnswer(tiny, run, 'a:1:0', 'stay');
  assert.equal(soloActingSeat(tiny, run), 'guest');
  run = soloAnswer(tiny, run, 'a:1:0', 'wait');
  assert.equal((run.state as AdventureState).sceneId, 'three', 'the story moved on by itself');
  run = soloAnswer(tiny, run, 'a:2:0', 'talk');
  assert.equal((run.state as AdventureState).endingId, 'good');
});

test('session cues come from the light summary', () => {
  assert.equal(sessionCue({ status: 'invited', mySeat: 'guest', awaiting: null }), 'invited_you');
  assert.equal(sessionCue({ status: 'active', mySeat: 'host', awaiting: 'both' }), 'your_turn');
  assert.equal(sessionCue({ status: 'active', mySeat: 'host', awaiting: 'guest' }), 'their_turn');
  assert.equal(sessionCue({ status: 'active', mySeat: 'host', awaiting: null }), 'in_play');
  assert.equal(sessionCue({ status: 'expired', mySeat: 'host', awaiting: null }), 'ended');
});

test('a failed story resolve retries with growing waits', () => {
  assert.deepEqual([0, 1, 2, 3, 10].map(resolveRetryDelay), [1000, 2000, 4000, 8000, 30000]);
});

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

test('every activity string has a stable key, and translating swaps only words', () => {
  const adventure = ADVENTURES.find((item) => item.id === 'adv-fajr-alarm')!;
  const strings = activityStrings(adventure);
  assert.equal(strings['adv-fajr-alarm.title'], 'Fajr Alarm');
  assert.ok(strings['adv-fajr-alarm.scenes.alarm.decision.choices.wake.label']);
  assert.ok(strings['adv-fajr-alarm.cover.alt'], 'screen-reader text is translated');
  assert.equal(strings['adv-fajr-alarm.cover.prompt'], undefined, 'image prompts stay English for the image model');
  assert.equal(Object.keys(strings).some((key) => key.endsWith('.id')), false, 'ids are never translated');

  const translated = translateActivity(adventure, {
    'adv-fajr-alarm.title': 'منبه الفجر',
    'adv-fajr-alarm.scenes.alarm.decision.choices.wake.label': 'أيقظها بلطف',
  });
  assert.equal(translated.title, 'منبه الفجر');
  assert.equal(translated.scenes.alarm!.decision.choices[0]!.label, 'أيقظها بلطف');
  assert.equal(translated.scenes.alarm!.decision.choices[0]!.id, 'wake', 'structure is untouched');
  assert.equal(translated.tagline, adventure.tagline, 'missing keys stay English');
  assert.deepEqual(validateAdventure(translated), []);
});

test('quiz options and lab points are keyed by position; placeholders are detectable', () => {
  const quiz = QUIZZES.find((item) => item.id === 'quiz-know-me')!;
  const strings = activityStrings(quiz);
  assert.equal(strings['quiz-know-me.cards.km-comfort.options.0'], quiz.cards[0]!.options[0]);
  assert.deepEqual(placeholdersOf(strings['quiz-know-me.cards.km-comfort.guessPrompt']!), ['name']);
});

test('every translation file present is complete and keeps its placeholders', async () => {
  const fs = await import('node:fs');
  const dir = 'src/halalCards/translations';
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
  const source: Record<string, string> = {};
  for (const activity of ALL_ACTIVITIES) Object.assign(source, activityStrings(activity));
  for (const file of files) {
    const translation = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8')) as { content: Record<string, string> };
    for (const [key, english] of Object.entries(source)) {
      const text = translation.content[key];
      assert.ok(text && text.trim(), `${file}: ${key} is translated`);
      assert.deepEqual(placeholdersOf(text!), placeholdersOf(english), `${file}: ${key} keeps its placeholders`);
    }
  }
});

test('the website states the catalogue as it is', () => {
  // halalmo.de reads its Halal Cards numbers from this generated file.
  const onDisk = readFileSync(SITE_COUNTS_PATH, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(onDisk, siteCountsScript(), `${SITE_COUNTS_PATH} is out of date: run npm run cards:strings`);
});
