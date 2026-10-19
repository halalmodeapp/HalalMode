/**
 * Relationship Challenge Claude, the Claude implementation of the fourth
 * Halal Cards experience: a short, cooperative, point-and-click hidden-clue
 * room for two.
 *
 * Kept apart from Relationship Challenge Codex on purpose (the two are being
 * compared before one is promoted): nothing here imports Codex files and
 * nothing in the shared Halal Cards types was changed. A challenge session is
 * an ordinary Halal Cards session whose activity id starts `rc-claude-` and
 * whose state is a `RcClaudeState`.
 *
 * Content is data, as everywhere in Halal Cards. Gameplay never looks at
 * image pixels: hit rectangles, anchors and answers live here in TypeScript.
 */

import type { Seat } from '../types.ts';

export type RcScenarioId = 'three_things_we_noticed' | 'evening_plan';

export type RcTimeOfDay = 'morning' | 'night';

export type RcCharacter = 'husband' | 'wife';

export type RcPose = 'idle' | 'noticing' | 'interacting' | 'celebrating';

/** Scenario A's three motifs. Drawn in TypeScript, never baked into art. */
export type RcMotif = 'leaf' | 'arch' | 'cup';

/** Logical room units. The room is always 1000 wide and 1500 tall. */
export interface RcPoint {
  x: number;
  y: number;
}

export interface RcRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A clue a player finds in the room and adds to the shared board. */
export type RcClue =
  | {
      id: string;
      kind: 'motif';
      textKey: string;
      artAssetId: string;
      motif: RcMotif;
      /** How many times the motif repeats on its object. */
      count: number;
    }
  | {
      id: string;
      kind: 'mark';
      textKey: string;
      artAssetId: string;
    }
  | {
      id: string;
      kind: 'cards';
      textKey: string;
      artAssetId: string;
    };

export interface RcPrivateClue {
  id: string;
  owner: Seat;
  textKey: string;
  artAssetId: string;
  /** Scenario A's order card shows these, always left to right. */
  motifs?: RcMotif[];
}

export interface RcHotspot {
  id: string;
  /** The scene layer this hotspot sits on. */
  assetId: string;
  /** Where a ping ring or highlight is centred. */
  position: RcPoint;
  interactionBounds: RcRect;
  /** The clue it gives, or `final` for the box or tray. */
  clueId: string | 'final';
  labelKey: string;
}

export type RcSetting = 'outdoors' | 'indoors';
export type RcLength = 'short' | 'long';

/** Scenario B's illustrated cards. Each has a daytime and an evening row. */
export interface RcDestination {
  id: string;
  titleKey: string;
  artAssetId: string;
  sun: { setting: RcSetting; length: RcLength };
  moon: { setting: RcSetting; length: RcLength };
}

export type RcAnswer =
  | { kind: 'symbol_sequence'; value: string; slots: number }
  | { kind: 'constraint_choice'; value: string; options: RcDestination[] };

export interface RcScenario {
  scenarioId: RcScenarioId;
  /** Halal Cards activity id; the server accepts `^[a-z0-9-]{3,80}$`. */
  activityId: string;
  /** Bump when a change would break a session in progress. */
  version: number;
  timeOfDay: RcTimeOfDay;
  titleKey: string;
  taglineKey: string;
  goalKey: string;
  minutes: number;
  privateClues: RcPrivateClue[];
  clues: RcClue[];
  hotspots: RcHotspot[];
  answer: RcAnswer;
  hints: [category: string, location: string, reveal: string];
  completionTextKey: string;
  reflectionKey: string;
}

// ---------------------------------------------------------------------------
// Shared state: an ordered log of meaningful events
// ---------------------------------------------------------------------------

export type RcEmote = 'thinking' | 'found' | 'agree' | 'moment';

export const RC_EMOTES: RcEmote[] = ['thinking', 'found', 'agree', 'moment'];

/** One meaningful thing a player did. */
export type RcAction =
  | { type: 'inspect'; hotspotId: string }
  | { type: 'collect'; clueId: string }
  | { type: 'ping'; hotspotId: string }
  | { type: 'emote'; emote: RcEmote }
  | { type: 'hint'; level: 1 | 2 | 3 }
  /** Puts an answer forward; the proposer has agreed to it. */
  | { type: 'propose'; value: string }
  /** Agrees to the answer on the table. */
  | { type: 'confirm'; value: string };

/** An action as stored: who did it, under a client action id. */
export type RcEvent = RcAction & {
  /** Client action id. A repeated id is ignored, which makes retries safe. */
  id: string;
  seat: Seat;
};

/**
 * What is stored in the Halal Cards session. The server orders writes by
 * version; every phone derives the same view from the same log.
 */
export interface RcClaudeState {
  kind: 'rc_claude';
  scenarioId: RcScenarioId;
  cast: Record<Seat, RcCharacter>;
  log: RcEvent[];
}
