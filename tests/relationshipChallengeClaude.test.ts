import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendRc,
  deriveRc,
  privateClueFor,
  rcAwaiting,
  rcContentMatches,
  rcPose,
  startRc,
  RC_LOG_LIMIT,
} from '../src/halalCards/relationshipChallengeClaude/engine';
import { DESTINATIONS, EVENING_PLAN, RC_CLAUDE_SCENARIOS, THREE_THINGS } from '../src/halalCards/relationshipChallengeClaude/scenarios';
import { RC_ASSETS, RC_ROOM, RC_ROOM_LAYOUT, rcAsset } from '../src/halalCards/relationshipChallengeClaude/scene';
import { RC_ARABIC, RC_ENGLISH_KEYS } from '../src/halalCards/relationshipChallengeClaude/strings';
import type { RcAction, RcClaudeState, RcScenario } from '../src/halalCards/relationshipChallengeClaude/types';
import type { Seat } from '../src/halalCards/types';

let n = 0;
function play(scenario: RcScenario, state: RcClaudeState, steps: [Seat, RcAction][]): RcClaudeState {
  for (const [seat, action] of steps) {
    const result = appendRc(scenario, state, action, seat, `t${(n += 1)}`);
    if (result.kind === 'applied') state = result.state;
  }
  return state;
}

function collectAll(scenario: RcScenario, state: RcClaudeState): RcClaudeState {
  const steps: [Seat, RcAction][] = [];
  scenario.hotspots.forEach((hotspot, i) => {
    const seat: Seat = i % 2 ? 'guest' : 'host';
    steps.push([seat, { type: 'inspect', hotspotId: hotspot.id }]);
    if (hotspot.clueId !== 'final') steps.push([seat, { type: 'collect', clueId: hotspot.clueId }]);
  });
  return play(scenario, state, steps);
}

test('scenario A opens only with 342 agreed by both', () => {
  let state = collectAll(THREE_THINGS, startRc(THREE_THINGS));
  assert.equal(deriveRc(THREE_THINGS, state).ready, true);

  state = play(THREE_THINGS, state, [
    ['host', { type: 'propose', value: '234' }],
    ['guest', { type: 'confirm', value: '234' }],
  ]);
  let view = deriveRc(THREE_THINGS, state);
  assert.equal(view.solved, false);
  assert.deepEqual(view.misses, ['234']);
  assert.equal(view.proposal, null);

  state = play(THREE_THINGS, state, [['guest', { type: 'propose', value: '342' }]]);
  view = deriveRc(THREE_THINGS, state);
  assert.equal(view.solved, false, 'one seat alone never decides');
  assert.equal(rcAwaiting(view), 'host');

  state = play(THREE_THINGS, state, [['host', { type: 'confirm', value: '342' }]]);
  view = deriveRc(THREE_THINGS, state);
  assert.equal(view.solved, true);
  assert.equal(rcPose(view, 'host'), 'celebrating');
});

test('scenario B: the moon row picks the park loop, the sun row would pick the café', () => {
  const fits = (row: 'sun' | 'moon') =>
    DESTINATIONS.filter((d) => d[row].setting === 'outdoors' && d[row].length === 'short').map((d) => d.id);
  assert.deepEqual(fits('moon'), ['park_loop']);
  assert.deepEqual(fits('sun'), ['cafe_terrace']);
  assert.equal(EVENING_PLAN.answer.value, 'park_loop');

  let state = collectAll(EVENING_PLAN, startRc(EVENING_PLAN, 'female'));
  assert.deepEqual(state.cast, { host: 'wife', guest: 'husband' });
  state = play(EVENING_PLAN, state, [
    ['host', { type: 'propose', value: 'park_loop' }],
    ['guest', { type: 'confirm', value: 'park_loop' }],
  ]);
  assert.equal(deriveRc(EVENING_PLAN, state).solved, true);
});

test('invalid, duplicate and out-of-order events change nothing', () => {
  const start = startRc(THREE_THINGS);
  // Collect before the hotspot was looked at.
  assert.equal(appendRc(THREE_THINGS, start, { type: 'collect', clueId: 'a_leaf' }, 'host', 'x1').kind, 'ignored');
  // Propose before every clue is on the board.
  assert.equal(appendRc(THREE_THINGS, start, { type: 'propose', value: '342' }, 'host', 'x2').kind, 'ignored');
  // Hints cannot skip a level.
  assert.equal(appendRc(THREE_THINGS, start, { type: 'hint', level: 2 }, 'host', 'x3').kind, 'ignored');
  // A malformed answer.
  const ready = collectAll(THREE_THINGS, start);
  assert.equal(appendRc(THREE_THINGS, ready, { type: 'propose', value: '34' }, 'host', 'x4').kind, 'ignored');

  // A retried action id lands once.
  const once = appendRc(THREE_THINGS, start, { type: 'inspect', hotspotId: 'shelf_leaf' }, 'host', 'same');
  assert.equal(once.kind, 'applied');
  if (once.kind !== 'applied') return;
  assert.equal(appendRc(THREE_THINGS, once.state, { type: 'inspect', hotspotId: 'shelf_leaf' }, 'host', 'same').kind, 'duplicate');

  // A tampered log with a duplicate token and a bogus seat derives the same view.
  const tampered: RcClaudeState = {
    ...ready,
    log: [
      ...ready.log,
      { id: 'dup', seat: 'guest', type: 'collect', clueId: 'a_leaf' },
      { id: 'bad', seat: 'nobody' as Seat, type: 'hint', level: 1 },
      ready.log[0]!,
    ],
  };
  assert.deepEqual(deriveRc(THREE_THINGS, tampered).collected, deriveRc(THREE_THINGS, ready).collected);
  assert.equal(deriveRc(THREE_THINGS, tampered).hintLevel, 0);
});

test('two phones racing the same clue: the second write is ignored, not doubled', () => {
  const base = play(THREE_THINGS, startRc(THREE_THINGS), [['host', { type: 'inspect', hotspotId: 'tray_cup' }]]);
  const host = appendRc(THREE_THINGS, base, { type: 'collect', clueId: 'a_cup' }, 'host', 'h1');
  assert.equal(host.kind, 'applied');
  if (host.kind !== 'applied') return;
  // The guest's write was refused as stale; it re-applies on the newer log.
  const retry = appendRc(THREE_THINGS, host.state, { type: 'collect', clueId: 'a_cup' }, 'guest', 'g1');
  assert.equal(retry.kind, 'ignored');
  assert.deepEqual(deriveRc(THREE_THINGS, host.state).collected, ['a_cup']);
});

test('after solving, only pings and emotes are accepted', () => {
  let state = collectAll(THREE_THINGS, startRc(THREE_THINGS));
  state = play(THREE_THINGS, state, [
    ['host', { type: 'propose', value: '342' }],
    ['guest', { type: 'confirm', value: '342' }],
  ]);
  assert.equal(appendRc(THREE_THINGS, state, { type: 'hint', level: 1 }, 'host', 'late').kind, 'ignored');
  assert.equal(appendRc(THREE_THINGS, state, { type: 'emote', emote: 'agree' }, 'guest', 'cheer').kind, 'applied');
});

test('chatter is capped and repeated pings are dropped', () => {
  let state = play(THREE_THINGS, startRc(THREE_THINGS), [['host', { type: 'ping', hotspotId: 'print_arch' }]]);
  assert.equal(appendRc(THREE_THINGS, state, { type: 'ping', hotspotId: 'print_arch' }, 'host', 'again').kind, 'ignored');
  state = { ...state, log: Array.from({ length: RC_LOG_LIMIT }, (_, i) => ({ id: `e${i}`, seat: 'host' as Seat, type: 'emote' as const, emote: 'thinking' as const })) };
  assert.equal(appendRc(THREE_THINGS, state, { type: 'emote', emote: 'agree' }, 'guest', 'over').kind, 'ignored');
  assert.equal(appendRc(THREE_THINGS, state, { type: 'inspect', hotspotId: 'shelf_leaf' }, 'guest', 'still').kind, 'applied');
});

test('each seat has exactly one private clue', () => {
  for (const scenario of RC_CLAUDE_SCENARIOS) {
    const host = privateClueFor(scenario, 'host');
    const guest = privateClueFor(scenario, 'guest');
    assert.ok(host && guest && host.id !== guest.id, scenario.scenarioId);
  }
});

test('content guard rejects other editions and other states', () => {
  const state = startRc(THREE_THINGS);
  assert.equal(rcContentMatches(THREE_THINGS, state, 1), true);
  assert.equal(rcContentMatches(THREE_THINGS, state, 2), false);
  assert.equal(rcContentMatches(EVENING_PLAN, state, 1), false);
  assert.equal(rcContentMatches(THREE_THINGS, { kind: 'lab', cursor: 0 }, 1), false);
});

test('scene manifest: assets exist, sit inside the room, hotspots are big enough', () => {
  for (const scenario of RC_CLAUDE_SCENARIOS) {
    assert.match(scenario.activityId, /^rc-claude-[a-z0-9-]+$/);
    const layout = RC_ROOM_LAYOUT[scenario.timeOfDay];
    for (const placement of layout) {
      const asset = rcAsset(placement.assetId);
      assert.ok(asset.variants.includes(scenario.timeOfDay), `${asset.id} is not a ${scenario.timeOfDay} asset`);
    }
    for (const hotspot of scenario.hotspots) {
      const b = hotspot.interactionBounds;
      assert.ok(b.width >= 150 && b.height >= 150, `${hotspot.id} is too small`);
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= RC_ROOM.width && b.y + b.height <= RC_ROOM.height, `${hotspot.id} leaves the room`);
      assert.ok(layout.some((placement) => placement.assetId === hotspot.assetId), `${hotspot.id} has no art in the room`);
    }
  }
  assert.equal(new Set(RC_ASSETS.map((asset) => asset.id)).size, RC_ASSETS.length);
  for (const asset of RC_ASSETS) assert.match(asset.id, /^rc_claude_/);
});

test('Arabic covers every English line', () => {
  const missing = RC_ENGLISH_KEYS.filter((key) => !RC_ARABIC[key]);
  assert.deepEqual(missing, []);
});
