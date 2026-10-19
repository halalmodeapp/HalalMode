import type { RcDestination, RcScenario, RcScenarioId } from './types.ts';

/**
 * The two launch scenarios. Both use the same room, the same 1000 × 1500
 * coordinate grid and the same engine; they differ in time of day, props and
 * the kind of thinking they ask for.
 *
 * Hit rectangles are generous on purpose (at least ~150 units, about 56
 * points on a 375-point phone) so nobody has to hunt for pixels.
 */

/**
 * Scenario A, morning: observation and information exchange. The host knows
 * the order to read three motifs in; the guest knows that each is worth how
 * many times it repeats. The room shows the repeats. Arch 3, Leaf 4, Cup 2,
 * read Arch → Leaf → Cup: 342.
 */
export const THREE_THINGS: RcScenario = {
  scenarioId: 'three_things_we_noticed',
  activityId: 'rc-claude-three-things',
  version: 1,
  timeOfDay: 'morning',
  titleKey: 'a.title',
  taglineKey: 'a.tagline',
  goalKey: 'a.goal',
  minutes: 5,
  privateClues: [
    { id: 'a_order', owner: 'host', textKey: 'a.private.order', artAssetId: 'rc_claude_clue_card', motifs: ['arch', 'leaf', 'cup'] },
    { id: 'a_values', owner: 'guest', textKey: 'a.private.values', artAssetId: 'rc_claude_clue_card' },
  ],
  clues: [
    { id: 'a_leaf', kind: 'motif', textKey: 'a.clue.leaf', artAssetId: 'rc_claude_token_leaf', motif: 'leaf', count: 4 },
    { id: 'a_arch', kind: 'motif', textKey: 'a.clue.arch', artAssetId: 'rc_claude_token_arch', motif: 'arch', count: 3 },
    { id: 'a_cup', kind: 'motif', textKey: 'a.clue.cup', artAssetId: 'rc_claude_token_cup', motif: 'cup', count: 2 },
  ],
  hotspots: [
    {
      id: 'shelf_leaf',
      assetId: 'rc_claude_leaf_vase',
      position: { x: 130, y: 245 },
      interactionBounds: { x: 55, y: 150, width: 200, height: 210 },
      clueId: 'a_leaf',
      labelKey: 'spot.shelf',
    },
    {
      id: 'print_arch',
      assetId: 'rc_claude_framed_print',
      position: { x: 800, y: 200 },
      interactionBounds: { x: 675, y: 65, width: 250, height: 270 },
      clueId: 'a_arch',
      labelKey: 'spot.print',
    },
    {
      id: 'tray_cup',
      assetId: 'rc_claude_morning_breakfast_tray',
      position: { x: 420, y: 890 },
      interactionBounds: { x: 320, y: 805, width: 200, height: 170 },
      clueId: 'a_cup',
      labelKey: 'spot.tray',
    },
    {
      id: 'keepsake_box',
      assetId: 'rc_claude_keepsake_box_closed',
      position: { x: 620, y: 895 },
      interactionBounds: { x: 535, y: 810, width: 170, height: 170 },
      clueId: 'final',
      labelKey: 'spot.box',
    },
  ],
  answer: { kind: 'symbol_sequence', value: '342', slots: 3 },
  hints: ['a.hint.1', 'a.hint.2', 'a.hint.3'],
  completionTextKey: 'a.complete',
  reflectionKey: 'a.reflect',
};

export const DESTINATIONS: RcDestination[] = [
  {
    id: 'park_loop',
    titleKey: 'b.dest.park_loop',
    artAssetId: 'rc_claude_dest_park_loop',
    sun: { setting: 'outdoors', length: 'long' },
    moon: { setting: 'outdoors', length: 'short' },
  },
  {
    id: 'cafe_terrace',
    titleKey: 'b.dest.cafe_terrace',
    artAssetId: 'rc_claude_dest_cafe_terrace',
    sun: { setting: 'outdoors', length: 'short' },
    moon: { setting: 'outdoors', length: 'long' },
  },
  {
    id: 'tea_at_home',
    titleKey: 'b.dest.tea_at_home',
    artAssetId: 'rc_claude_dest_tea_at_home',
    sun: { setting: 'indoors', length: 'short' },
    moon: { setting: 'indoors', length: 'short' },
  },
  {
    id: 'bookshop',
    titleKey: 'b.dest.bookshop',
    artAssetId: 'rc_claude_dest_bookshop',
    sun: { setting: 'indoors', length: 'long' },
    moon: { setting: 'indoors', length: 'long' },
  },
];

/**
 * Scenario B, night: constraint comparison and agreement. The host's note
 * says outdoors, the guest's says short and calm, and the lamp says tonight
 * the moon row counts. Read that way only the park loop fits; read by the sun
 * row, the café terrace would, which is the gentle trap.
 */
export const EVENING_PLAN: RcScenario = {
  scenarioId: 'evening_plan',
  activityId: 'rc-claude-evening-plan',
  version: 1,
  timeOfDay: 'night',
  titleKey: 'b.title',
  taglineKey: 'b.tagline',
  goalKey: 'b.goal',
  minutes: 5,
  privateClues: [
    { id: 'b_outdoors', owner: 'host', textKey: 'b.private.outdoors', artAssetId: 'rc_claude_note_paper' },
    { id: 'b_short', owner: 'guest', textKey: 'b.private.short', artAssetId: 'rc_claude_note_paper' },
  ],
  clues: [
    { id: 'b_mark', kind: 'mark', textKey: 'b.clue.mark', artAssetId: 'rc_claude_table_lamp_on' },
    { id: 'b_cards', kind: 'cards', textKey: 'b.clue.cards', artAssetId: 'rc_claude_card_envelope' },
  ],
  hotspots: [
    {
      id: 'lamp_mark',
      assetId: 'rc_claude_table_lamp_on',
      position: { x: 95, y: 1120 },
      interactionBounds: { x: 15, y: 995, width: 170, height: 310 },
      clueId: 'b_mark',
      labelKey: 'spot.lamp',
    },
    {
      id: 'envelope_cards',
      assetId: 'rc_claude_card_envelope',
      position: { x: 620, y: 900 },
      interactionBounds: { x: 535, y: 815, width: 170, height: 170 },
      clueId: 'b_cards',
      labelKey: 'spot.envelope',
    },
    {
      id: 'evening_tray',
      assetId: 'rc_claude_evening_tray',
      position: { x: 420, y: 890 },
      interactionBounds: { x: 320, y: 805, width: 200, height: 170 },
      clueId: 'final',
      labelKey: 'spot.eveningTray',
    },
  ],
  answer: { kind: 'constraint_choice', value: 'park_loop', options: DESTINATIONS },
  hints: ['b.hint.1', 'b.hint.2', 'b.hint.3'],
  completionTextKey: 'b.complete',
  reflectionKey: 'b.reflect',
};

export const RC_CLAUDE_SCENARIOS: RcScenario[] = [THREE_THINGS, EVENING_PLAN];

export function findRcScenario(id: string): RcScenario | undefined {
  return RC_CLAUDE_SCENARIOS.find((scenario) => scenario.scenarioId === id);
}

export function rcScenarioForActivity(activityId: string): RcScenario | undefined {
  return RC_CLAUDE_SCENARIOS.find((scenario) => scenario.activityId === activityId);
}

export function isRcClaudeActivity(activityId: string): boolean {
  return activityId.startsWith('rc-claude-');
}

export const RC_SCENARIO_IDS: RcScenarioId[] = RC_CLAUDE_SCENARIOS.map((scenario) => scenario.scenarioId);
