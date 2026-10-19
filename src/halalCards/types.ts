/**
 * Halal Cards, the shared model for Relationship Lab, Quizzes and Adventures.
 *
 * Content is data. A new lesson, quiz, story, branch or ending is a new object
 * in `src/halalCards/content`, never a new screen: the engine reads these
 * shapes and the play screen renders whatever the engine says is next.
 *
 * Two people play one session. They are always called seats, `host` (the
 * member who started it) and `guest` (the one invited), never "me" and
 * "them", so a stored session reads the same from either phone.
 */

export type Seat = 'host' | 'guest';

export type ActivityKind = 'lab' | 'quiz' | 'adventure';

/**
 * Where a couple is. Getting-to-know content suits two people still deciding;
 * some cards only make sense once engaged or married, and are kept for then.
 */
export type CardsTrack = 'getting_to_know' | 'engaged' | 'married';

export const CARDS_TRACKS: CardsTrack[] = ['getting_to_know', 'engaged', 'married'];

/**
 * Room for an illustration generated outside the app. Until an image is added
 * to `images.ts` under this id, the card shows a drawn placeholder; `prompt`
 * is what to give the image model so every picture shares one style.
 */
export interface ImageSlot {
  id: string;
  role: 'cover' | 'scene' | 'turning_point' | 'outcome';
  prompt: string;
  /** Screen-reader description of the finished picture. */
  alt: string;
  /** Normalized vertical face-group centre for cropped catalogue thumbnails. */
  focalY?: number;
}

/** A lesson the couple may choose to keep in their Relationship Guide. */
export interface GuideSuggestion {
  id: string;
  text: string;
}

/** A short teaching card shown mid-activity. Never more than two sentences. */
export interface LessonCard {
  id: string;
  /** e.g. "Notice this" or "Pattern forming". */
  tag: string;
  text: string;
  /** Shown only while this holds (adventures). */
  when?: Condition;
}

interface ActivityBase {
  id: string;
  kind: ActivityKind;
  title: string;
  /** One line under the title in the catalogue. */
  tagline: string;
  /** Two or three sentences on the detail card before inviting. */
  description: string;
  minutes: number;
  cover: ImageSlot;
  /**
   * Bump when a change would break a session in progress (steps, cards or
   * scene ids removed or reordered). Sessions remember the edition they
   * started on and offer a restart instead of breaking. Defaults to 1.
   */
  version?: number;
  /** Tracks this suits. Absent means every track. */
  tracks?: CardsTrack[];
  /** Free members may try it alone, as a preview. */
  soloPreview?: boolean;
}

// ---------------------------------------------------------------------------
// Relationship Lab
// ---------------------------------------------------------------------------

export type LabRule = 'zero' | 'one' | 'two' | 'three';

export type ChoiceTone = 'helps' | 'mixed' | 'harms';

export interface LabChoice {
  id: string;
  label: string;
  /** What happens next if this is what you did. Shown at the reveal. */
  consequence: string;
  tone: ChoiceTone;
}

export type LabStep =
  | { type: 'intro'; id: string; title: string; body: string }
  | {
      type: 'scenario';
      id: string;
      title: string;
      /** The situation, in the second person or about a named couple. */
      body: string;
      prompt: string;
      choices: LabChoice[];
      image?: ImageSlot;
    }
  | { type: 'insight'; id: string; title: string; body: string; points?: string[] }
  | {
      type: 'discussion';
      id: string;
      prompt: string;
      followUps?: string[];
      guide?: GuideSuggestion[];
    };

export interface LabLesson extends ActivityBase {
  kind: 'lab';
  rule: LabRule;
  /** "Rule Zero", "Rule 1"… */
  ruleLabel: string;
  steps: LabStep[];
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

/**
 * - `know_me`: one person answers about themselves, the other guesses; the
 *   subject alternates card by card.
 * - `guess_my_answer`: both answer for themselves and guess the other at once.
 * - `same_page`: both answer; the reveal shows where you meet and differ.
 * - `more_likely`: both point at one of you.
 * - `would_you_rather`: two options, both choose.
 * - `scale`: an ordered set of answers; the reveal measures the distance.
 */
export type QuizFormat =
  | 'know_me'
  | 'guess_my_answer'
  | 'same_page'
  | 'more_likely'
  | 'would_you_rather'
  | 'scale';

export type QuizTopic =
  | 'getting_to_know'
  | 'expectations'
  | 'family'
  | 'money'
  | 'affection'
  | 'lifestyle'
  | 'future'
  | 'just_for_fun';

export interface QuizCard {
  id: string;
  /** Asked of the person answering for themselves. */
  prompt: string;
  /**
   * Asked of the person guessing. `{{name}}` is the other player's first
   * name. Needed by `know_me` and `guess_my_answer`.
   */
  guessPrompt?: string;
  /** `more_likely` has none, the options are always the two players. */
  options: string[];
  /** Said at the reveal, whatever was answered. A nudge to talk. */
  talk?: string;
}

export interface Quiz extends ActivityBase {
  kind: 'quiz';
  format: QuizFormat;
  topic: QuizTopic;
  cards: QuizCard[];
  /** Offered at the end; kept only if both agree. */
  guide?: GuideSuggestion[];
}

/** One player's sealed answer to one quiz card. Indices into `options`. */
export interface QuizAnswer {
  self?: number;
  guess?: number;
}

// ---------------------------------------------------------------------------
// Adventures
// ---------------------------------------------------------------------------

/** The two characters in a story. Seats are mapped onto them at the start. */
export type RoleId = 'A' | 'B';

export interface StoryRole {
  name: string;
  gender: 'male' | 'female';
  /** One line: who they are. */
  sketch: string;
}

/** Hidden relationship states. Numbers, never shown until the ending. */
export interface StoryVariable {
  label: string;
  initial: number;
  /** Shown at the ending as a short line, from low to high. */
  readings: [low: string, middle: string, high: string];
  /** True when more of it is worse (resentment, the loop), so meters read the right way round. */
  concerning?: boolean;
}

export type Condition =
  | { var: string; gte?: number; lte?: number }
  | { flag: string }
  | { notFlag: string }
  | { all: Condition[] }
  | { any: Condition[] };

export interface Effects {
  /** Added to hidden variables. */
  vars?: Record<string, number>;
  /** Remembered facts later scenes can test, e.g. "told_mother". */
  flags?: string[];
}

/** A scene id, or `end:<endingId>`. */
export type Target = string;

/** Where the story goes next: the first route whose condition holds. */
export type Next =
  | Target
  | { routes: { when?: Condition; to: Target }[] };

export interface StoryChoice {
  id: string;
  label: string;
  /** Only offered while this holds, earlier choices open and close doors. */
  when?: Condition;
  effects?: Effects;
  next: Next;
  /** Recorded for the ending's "how you got here", in the past tense. */
  beat: string;
  /** Shown straight after the choice is made. */
  lesson?: LessonCard;
}

/**
 * - `role`: the player holding that character decides, the other watches.
 * - `private`: both choose in secret; both choices take effect, and `combos`
 *   (or, when they agree, the shared choice's `next`) decide the path.
 * - `joint`: both must land on the same choice; a mismatch asks them to talk
 *   and choose again.
 */
export type DecisionMode = 'role' | 'private' | 'joint';

export interface StoryDecision {
  mode: DecisionMode;
  /** Whose call it is in `role` mode. */
  actor?: RoleId;
  prompt: string;
  /** Shared by both players. Empty when `byRole` is used. */
  choices: StoryChoice[];
  /**
   * `private` only: each player decides for their own character, from that
   * character's own options, the shape of a pursue/withdraw moment, where
   * two people act at once without knowing what the other will do.
   */
  byRole?: Record<RoleId, StoryChoice[]>;
  /**
   * `private` only: what happens for a particular pair of choices. With
   * `byRole` the pair is [A's choice, B's choice]; with shared choices it
   * matches in either order. Unmatched agreeing choices follow their own
   * `next`; unmatched different ones follow `diverge`.
   */
  combos?: { pair: [string, string]; next: Next; beat?: string; effects?: Effects }[];
  diverge?: Next;
}

export interface StoryPassage {
  text: string;
  when?: Condition;
}

export interface StoryScene {
  id: string;
  title: string;
  /** Paragraphs, each optionally conditional, joined in order. */
  passages: StoryPassage[];
  image?: ImageSlot;
  /** Marks a scene that changes the direction of the story. */
  turningPoint?: boolean;
  /** Shown on entering the scene, when its condition holds. */
  lessons?: LessonCard[];
  decision: StoryDecision;
}

export interface StoryEnding {
  id: string;
  title: string;
  /** Where the relationship stands, never simply good or bad. */
  mood: 'steady' | 'tender' | 'fragile' | 'strained' | 'bittersweet' | 'renewed';
  image: ImageSlot;
  whatHappened: string;
  pattern: { name: string; explanation: string };
  couldHaveChanged: string;
  takeaway: string;
  /** Extra closing lines that depend on how the hidden states ended up. */
  epilogues?: StoryPassage[];
  guide?: GuideSuggestion[];
}

export interface Adventure extends ActivityBase {
  kind: 'adventure';
  themes: string[];
  roles: Record<RoleId, StoryRole>;
  variables: Record<string, StoryVariable>;
  start: string;
  scenes: Record<string, StoryScene>;
  endings: Record<string, StoryEnding>;
}

/** An adventure that has been outlined but not yet written. */
export interface AdventureConcept {
  id: string;
  title: string;
  themes: string[];
  logline: string;
  turningPoints: string[];
  possibleEndings: string[];
  cover: ImageSlot;
}

export type Activity = LabLesson | Quiz | Adventure;

// ---------------------------------------------------------------------------
// Session state, what is stored and shared between the two phones
// ---------------------------------------------------------------------------

export interface LabState {
  kind: 'lab';
  cursor: number;
}

export interface QuizState {
  kind: 'quiz';
  cursor: number;
}

export interface StoryReveal {
  /** Increases by one with every reveal in a session. */
  seq: number;
  sceneId: string;
  step: number;
  mode: DecisionMode;
  picks: Partial<Record<Seat, string>>;
  /** What happened, as the ending will tell it. Empty for a mismatch. */
  beats: string[];
  /** Joint decisions that did not match go round again. */
  mismatch?: boolean;
  lessonIds: string[];
}

export interface StoryHistoryEntry {
  sceneId: string;
  picks: Partial<Record<Seat, string>>;
  beats: string[];
}

export interface AdventureState {
  kind: 'adventure';
  sceneId: string;
  /** Increments with every resolved decision; part of each answer key. */
  step: number;
  /** Joint retries at the current step. */
  attempt: number;
  roles: Record<RoleId, Seat>;
  vars: Record<string, number>;
  flags: string[];
  history: StoryHistoryEntry[];
  /** The most recent reveals, oldest first, so a player who was away misses none. */
  reveals?: StoryReveal[];
  endingId?: string;
}

export type ActivityState = LabState | QuizState | AdventureState;

export type SessionStatus = 'invited' | 'active' | 'declined' | 'cancelled' | 'completed' | 'expired';

export type Awaiting = Seat | 'both';

/** The light view of a session that lists and the chat use. */
export interface CardsSummary {
  id: string;
  connectionId: string;
  activityId: string;
  mySeat: Seat;
  status: SessionStatus;
  awaiting?: Awaiting | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sealed answers keyed by step. The server returns the other seat's answer
 * only once this seat has answered the same key, `theirReady` alone says
 * they have answered without saying what.
 */
export interface SealedAnswer<T = unknown> {
  mine?: T;
  theirs?: T;
  theirReady: boolean;
}

export interface CardsSession {
  id: string;
  connectionId: string;
  activityId: string;
  hostId: string;
  /** This phone's seat in the session. */
  mySeat: Seat;
  status: SessionStatus;
  state: ActivityState;
  version: number;
  /** The content edition this session started on. */
  contentVersion?: number;
  /** Who the session is waiting on, as last written. */
  awaiting?: Awaiting | null;
  answers: Record<string, SealedAnswer>;
  createdAt: string;
  updatedAt: string;
}

export interface GuideEntry {
  id: string;
  connectionId: string;
  text: string;
  /** Activity title, or null when written freehand. */
  source: string | null;
  proposedBySeat: 'me' | 'them';
  agreed: boolean;
  createdAt: string;
}

export interface CardsAccess {
  /** A Premium member has unlocked Halal Cards for this connection. */
  unlocked: boolean;
  unlockedByMe: boolean;
  track: CardsTrack;
}
