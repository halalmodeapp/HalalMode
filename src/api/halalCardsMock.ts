import { findActivity } from '@/halalCards/content';
import { choicesFor, currentScene, resolveRoleChoice } from '@/halalCards/engine/adventure';
import { currentLabStep } from '@/halalCards/engine/lab';
import { quizNeeds, quizOptions } from '@/halalCards/engine/quiz';
import { otherSeat } from '@/halalCards/engine/seats';
import { advanceCursor, awaitingOf, currentTurn, isFinished } from '@/halalCards/engine/session';
import { StaleSessionError } from '@/halalCards/errors';
import type {
  ActivityState,
  Awaiting,
  CardsAccess,
  CardsSession,
  CardsSummary,
  CardsTrack,
  GuideEntry,
  QuizAnswer,
  Seat,
} from '@/halalCards/types';

/**
 * Demo mode: an in-memory server and a partner who plays along.
 *
 * Mirrors the server's rules (sealing, versions, one open game per activity,
 * expiring invitations, open-stage only) and plays the other seat with the
 * real engine, a beat behind, so the whole flow, invite, accept, private
 * answers, turns, reveals, endings, the Journal, can be walked on one phone.
 * The partner sometimes moves on first, which is exactly the case the
 * catch-up screens exist for.
 */
interface MockSession {
  id: string;
  connectionId: string;
  activityId: string;
  hostIsMe: boolean;
  status: CardsSession['status'];
  state: ActivityState;
  version: number;
  contentVersion: number;
  awaiting: Awaiting | null;
  answers: Record<string, Partial<Record<Seat, unknown>>>;
  createdAt: string;
  updatedAt: string;
  /** When the partner last acted; they wait a moment before the next move. */
  partnerClock: number;
}

const PARTNER_DELAY_MS = 1800;
/** How long the partner lingers on a card to read before tapping Next. */
const PARTNER_READ_MS = 9000;
const OPEN_CONNECTIONS = new Set(['conn-1']);

const unlocked = new Set<string>(['conn-1']);
const tracks = new Map<string, CardsTrack>();
const sessions = new Map<string, MockSession>();
const guideEntries: (GuideEntry & { agreeAt?: number; removed?: boolean })[] = [];
let counter = 0;
const now = () => new Date().toISOString();
const delay = () => new Promise((resolve) => setTimeout(resolve, 250));

// A waiting invitation from the match, so the accept flow can be tried.
sessions.set('mock-invite', {
  id: 'mock-invite',
  connectionId: 'conn-1',
  activityId: 'quiz-would-you-rather',
  hostIsMe: false,
  status: 'invited',
  state: { kind: 'quiz', cursor: 0 },
  version: 1,
  contentVersion: 1,
  awaiting: null,
  answers: {},
  createdAt: now(),
  updatedAt: now(),
  partnerClock: 0,
});
guideEntries.push({
  id: 'mock-guide-1',
  connectionId: 'conn-1',
  text: 'Make major financial decisions together.',
  source: 'Same page? Money',
  proposedBySeat: 'them',
  agreed: false,
  createdAt: now(),
});

const mySeat = (session: MockSession): Seat => (session.hostIsMe ? 'host' : 'guest');

function view(session: MockSession, asPartner = false): CardsSession {
  const me = asPartner ? otherSeat(mySeat(session)) : mySeat(session);
  const them = otherSeat(me);
  const answers: CardsSession['answers'] = {};
  for (const [key, bySeat] of Object.entries(session.answers)) {
    const mine = bySeat[me];
    const theirs = bySeat[them];
    answers[key] = {
      ...(mine !== undefined ? { mine } : {}),
      ...(mine !== undefined && theirs !== undefined ? { theirs } : {}),
      theirReady: theirs !== undefined,
    };
  }
  return {
    id: session.id,
    connectionId: session.connectionId,
    activityId: session.activityId,
    hostId: session.hostIsMe ? 'me' : 'them',
    mySeat: me,
    status: session.status,
    state: session.state,
    version: session.version,
    contentVersion: session.contentVersion,
    awaiting: session.awaiting,
    answers,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function summary(session: MockSession): CardsSummary {
  return {
    id: session.id,
    connectionId: session.connectionId,
    activityId: session.activityId,
    mySeat: mySeat(session),
    status: session.status,
    awaiting: session.awaiting,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function touch(session: MockSession) {
  session.updatedAt = now();
}

function pick<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

function expire(session: MockSession) {
  if (session.status === 'invited' && Date.now() - Date.parse(session.createdAt) > 7 * 86400_000) {
    session.status = 'expired';
    session.version += 1;
  }
}

function recomputeAwaiting(session: MockSession) {
  const activity = findActivity(session.activityId);
  session.awaiting = activity ? awaitingOf(activity, view(session)) : null;
}

function partnerTick(session: MockSession) {
  expire(session);
  const clock = Date.now();
  if (session.status === 'invited' && session.hostIsMe && clock - Date.parse(session.createdAt) > PARTNER_DELAY_MS) {
    session.status = 'active';
    session.version += 1;
    session.partnerClock = clock;
    recomputeAwaiting(session);
    touch(session);
    return;
  }
  if (session.status !== 'active' || clock - session.partnerClock < PARTNER_DELAY_MS) return;
  const activity = findActivity(session.activityId);
  if (!activity) return;
  const theirs = view(session, true);
  const seat = theirs.mySeat;
  const turn = currentTurn(activity, theirs);

  if (turn.kind === 'answer') {
    let answer: unknown;
    if (activity.kind === 'lab' && session.state.kind === 'lab') {
      const step = currentLabStep(activity, session.state.cursor);
      if (step?.type === 'scenario') answer = pick(step.choices)?.id;
    } else if (activity.kind === 'quiz' && session.state.kind === 'quiz') {
      const card = activity.cards[session.state.cursor];
      if (card) {
        const needs = quizNeeds(activity, session.state.cursor, seat);
        const count = quizOptions(activity, card).length;
        const random = () => Math.floor(Math.random() * count);
        const quizAnswer: QuizAnswer = {};
        if (needs.self) quizAnswer.self = random();
        if (needs.guess) quizAnswer.guess = random();
        answer = quizAnswer;
      }
    } else if (activity.kind === 'adventure' && session.state.kind === 'adventure') {
      const scene = currentScene(activity, session.state);
      if (scene) {
        const options = choicesFor(scene.decision, session.state, seat);
        // In a joint decision the partner usually goes along with you.
        const yours = scene.decision.mode === 'joint' ? session.answers[turn.key]?.[mySeat(session)] : undefined;
        answer = yours !== undefined && Math.random() < 0.7 ? yours : pick(options)?.id;
      }
    }
    if (answer !== undefined) {
      session.answers[turn.key] = { ...session.answers[turn.key], [seat]: answer };
      session.partnerClock = clock;
      recomputeAwaiting(session);
      touch(session);
    }
    return;
  }

  if (turn.kind === 'decide' && activity.kind === 'adventure' && session.state.kind === 'adventure') {
    const scene = currentScene(activity, session.state);
    const choice = scene ? pick(choicesFor(scene.decision, session.state, seat)) : undefined;
    if (!choice) return;
    const next = resolveRoleChoice(activity, session.state, seat, choice.id);
    session.state = next;
    session.version += 1;
    if (next.endingId) session.status = 'completed';
    session.partnerClock = clock;
    recomputeAwaiting(session);
    touch(session);
    return;
  }

  // Read cards and reveals: the partner sometimes moves on before you do.
  if ((turn.kind === 'read' || turn.kind === 'reveal') && session.state.kind !== 'adventure' && clock - session.partnerClock > PARTNER_READ_MS) {
    const next = advanceCursor(activity, session.state);
    session.state = next;
    session.version += 1;
    if (isFinished(activity, next)) session.status = 'completed';
    session.partnerClock = clock;
    recomputeAwaiting(session);
    touch(session);
  }
}

function tickGuide() {
  for (const entry of guideEntries) {
    if (!entry.agreed && entry.agreeAt && Date.now() > entry.agreeAt) entry.agreed = true;
  }
}

function requireSession(id: string): MockSession {
  const session = sessions.get(id);
  if (!session) throw new Error('Session not found');
  return session;
}

function requireOpen(connectionId: string) {
  if (!OPEN_CONNECTIONS.has(connectionId)) throw new Error('Connection not found');
}

export const halalCardsMock = {
  async access(connectionId: string): Promise<CardsAccess> {
    await delay();
    requireOpen(connectionId);
    return { unlocked: unlocked.has(connectionId), unlockedByMe: false, track: tracks.get(connectionId) ?? 'getting_to_know' };
  },
  async setTrack(connectionId: string, track: CardsTrack): Promise<void> {
    await delay();
    requireOpen(connectionId);
    tracks.set(connectionId, track);
  },
  async summary(connectionId: string): Promise<CardsSummary[]> {
    await delay();
    requireOpen(connectionId);
    return [...sessions.values()]
      .filter((session) => session.connectionId === connectionId)
      .map((session) => {
        partnerTick(session);
        return summary(session);
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  },
  async attention(): Promise<Record<string, number>> {
    await delay();
    tickGuide();
    const counts: Record<string, number> = {};
    for (const session of sessions.values()) {
      partnerTick(session);
      const me = mySeat(session);
      const waiting =
        (session.status === 'invited' && !session.hostIsMe) ||
        (session.status === 'active' && (session.awaiting === 'both' || session.awaiting === me));
      if (waiting) counts[session.connectionId] = (counts[session.connectionId] ?? 0) + 1;
    }
    for (const entry of guideEntries) {
      if (!entry.removed && !entry.agreed && entry.proposedBySeat === 'them') {
        counts[entry.connectionId] = (counts[entry.connectionId] ?? 0) + 1;
      }
    }
    return counts;
  },
  async get(id: string): Promise<CardsSession> {
    await delay();
    const session = requireSession(id);
    partnerTick(session);
    return view(session);
  },
  async start(connectionId: string, activityId: string, state: ActivityState, contentVersion: number): Promise<CardsSession> {
    await delay();
    requireOpen(connectionId);
    const open = [...sessions.values()].find(
      (session) =>
        session.connectionId === connectionId &&
        session.activityId === activityId &&
        (session.status === 'invited' || session.status === 'active')
    );
    if (open) throw new Error('This activity is already open');
    unlocked.add(connectionId);
    counter += 1;
    const session: MockSession = {
      id: `mock-session-${counter}`,
      connectionId,
      activityId,
      hostIsMe: true,
      status: 'invited',
      state,
      version: 1,
      contentVersion,
      awaiting: null,
      answers: {},
      createdAt: now(),
      updatedAt: now(),
      partnerClock: Date.now(),
    };
    sessions.set(session.id, session);
    return view(session);
  },
  async respond(id: string, accept: boolean, awaiting: Awaiting | null): Promise<CardsSession> {
    await delay();
    const session = requireSession(id);
    expire(session);
    if (session.hostIsMe) throw new Error('Only the invited member can answer an invitation');
    if (session.status !== 'invited') throw new Error('This invitation is no longer open');
    session.status = accept ? 'active' : 'declined';
    session.awaiting = accept ? awaiting : null;
    session.version += 1;
    session.partnerClock = Date.now();
    touch(session);
    return view(session);
  },
  async cancel(id: string): Promise<CardsSession> {
    await delay();
    const session = requireSession(id);
    if (session.status === 'invited' || session.status === 'active') {
      session.status = 'cancelled';
      session.awaiting = null;
      session.version += 1;
      touch(session);
    }
    return view(session);
  },
  async answer(id: string, key: string, answer: unknown, awaiting: Awaiting | null): Promise<CardsSession> {
    await delay();
    const session = requireSession(id);
    if (session.status !== 'active') throw new Error('This session is not in play');
    const seat = mySeat(session);
    if (session.answers[key]?.[seat] === undefined) {
      session.answers[key] = { ...session.answers[key], [seat]: answer };
      session.partnerClock = Math.min(session.partnerClock, Date.now() - PARTNER_DELAY_MS / 2);
    }
    session.awaiting = awaiting;
    touch(session);
    return view(session);
  },
  async advance(
    id: string,
    expectedVersion: number,
    state: ActivityState,
    completed: boolean,
    awaiting: Awaiting | null
  ): Promise<CardsSession> {
    await delay();
    const session = requireSession(id);
    if (session.status !== 'active') throw new Error('This session is not in play');
    if (session.version !== expectedVersion) throw new StaleSessionError();
    session.state = state;
    session.version += 1;
    session.awaiting = completed ? null : awaiting;
    if (completed) session.status = 'completed';
    session.partnerClock = Date.now();
    touch(session);
    return view(session);
  },
  async guide(connectionId: string): Promise<GuideEntry[]> {
    await delay();
    requireOpen(connectionId);
    tickGuide();
    return guideEntries
      .filter((entry) => entry.connectionId === connectionId && !entry.removed)
      .map(({ agreeAt: _agreeAt, removed: _removed, ...entry }) => entry);
  },
  async propose(connectionId: string, text: string, source: string | null): Promise<void> {
    await delay();
    requireOpen(connectionId);
    if (!unlocked.has(connectionId)) throw new Error('Halal Cards needs Premium for this connection');
    if (/\d{6,}|@|https?:\/\//.test(text.replace(/\s/g, ''))) throw new Error('Journal entries cannot include contact details');
    const existing = guideEntries.find(
      (entry) => !entry.removed && entry.connectionId === connectionId && entry.text.trim().toLowerCase() === text.trim().toLowerCase()
    );
    if (existing) {
      if (existing.proposedBySeat === 'them') existing.agreed = true;
      return;
    }
    counter += 1;
    guideEntries.push({
      id: `mock-guide-${counter + 1}`,
      connectionId,
      text: text.trim(),
      source,
      proposedBySeat: 'me',
      agreed: false,
      createdAt: now(),
      agreeAt: Date.now() + 2500,
    });
  },
  async agree(entryId: string): Promise<void> {
    await delay();
    const entry = guideEntries.find((item) => item.id === entryId);
    if (entry && entry.proposedBySeat === 'them') entry.agreed = true;
  },
  async remove(entryId: string): Promise<void> {
    await delay();
    const entry = guideEntries.find((item) => item.id === entryId);
    if (entry) entry.removed = true;
  },
  async restore(entryId: string): Promise<void> {
    await delay();
    const entry = guideEntries.find((item) => item.id === entryId);
    if (entry) entry.removed = false;
  },
};
