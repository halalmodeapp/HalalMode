import { findActivity } from '@/halalCards/content';
import { choicesFor, currentScene, resolveRoleChoice } from '@/halalCards/engine/adventure';
import { currentLabStep } from '@/halalCards/engine/lab';
import { quizNeeds, quizOptions } from '@/halalCards/engine/quiz';
import { otherSeat } from '@/halalCards/engine/seats';
import { currentTurn } from '@/halalCards/engine/session';
import type {
  ActivityState,
  CardsAccess,
  CardsSession,
  GuideEntry,
  QuizAnswer,
  Seat,
} from '@/halalCards/types';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

/** Another phone moved the session on first. Refetch and look again. */
export class StaleSessionError extends Error {
  constructor() {
    super('This session has moved on.');
    this.name = 'StaleSessionError';
  }
}

function isStale(error: { code?: string } | null): boolean {
  return error?.code === '40001';
}

export async function fetchCardsAccess(connectionId: string): Promise<CardsAccess> {
  if (USE_MOCKS) return mock.access(connectionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_access', { p_connection_id: connectionId });
  if (error) throw error;
  const payload = data as { unlocked?: unknown; unlockedByMe?: unknown } | null;
  return { unlocked: payload?.unlocked === true, unlockedByMe: payload?.unlockedByMe === true };
}

export async function fetchCardsSessions(connectionId: string): Promise<CardsSession[]> {
  if (USE_MOCKS) return mock.list(connectionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_sessions', { p_connection_id: connectionId });
  if (error) throw error;
  return (data ?? []) as CardsSession[];
}

export async function fetchCardsSession(sessionId: string): Promise<CardsSession> {
  if (USE_MOCKS) return mock.get(sessionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_session', { p_session_id: sessionId });
  if (error) throw error;
  return data as CardsSession;
}

/** Creates the session as an invitation; it begins when the match accepts. */
export async function startCardsSession(
  connectionId: string,
  activityId: string,
  state: ActivityState
): Promise<CardsSession> {
  if (USE_MOCKS) return mock.start(connectionId, activityId, state);
  const { data, error } = await requireSupabase().rpc('start_halal_cards_session', {
    p_connection_id: connectionId,
    p_activity_id: activityId,
    p_state: state,
  });
  if (error) throw error;
  return data as CardsSession;
}

export async function respondCardsInvite(sessionId: string, accept: boolean): Promise<CardsSession> {
  if (USE_MOCKS) return mock.respond(sessionId, accept);
  const { data, error } = await requireSupabase().rpc('respond_halal_cards_invite', {
    p_session_id: sessionId,
    p_accept: accept,
  });
  if (error) throw error;
  return data as CardsSession;
}

export async function cancelCardsSession(sessionId: string): Promise<CardsSession> {
  if (USE_MOCKS) return mock.cancel(sessionId);
  const { data, error } = await requireSupabase().rpc('cancel_halal_cards_session', { p_session_id: sessionId });
  if (error) throw error;
  return data as CardsSession;
}

/** A sealed answer. Written once; the server never lets it change. */
export async function submitCardsAnswer(sessionId: string, key: string, answer: unknown): Promise<CardsSession> {
  if (USE_MOCKS) return mock.answer(sessionId, key, answer);
  const { data, error } = await requireSupabase().rpc('submit_halal_cards_answer', {
    p_session_id: sessionId,
    p_key: key,
    p_answer: answer,
  });
  if (error) throw error;
  return data as CardsSession;
}

export async function advanceCardsSession(
  sessionId: string,
  expectedVersion: number,
  state: ActivityState,
  completed: boolean
): Promise<CardsSession> {
  if (USE_MOCKS) return mock.advance(sessionId, expectedVersion, state, completed);
  const { data, error } = await requireSupabase().rpc('advance_halal_cards_session', {
    p_session_id: sessionId,
    p_expected_version: expectedVersion,
    p_state: state,
    p_completed: completed,
  });
  if (isStale(error)) throw new StaleSessionError();
  if (error) throw error;
  return data as CardsSession;
}

export async function fetchGuide(connectionId: string): Promise<GuideEntry[]> {
  if (USE_MOCKS) return mock.guide(connectionId);
  const { data, error } = await requireSupabase().rpc('get_halal_cards_guide', { p_connection_id: connectionId });
  if (error) throw error;
  return (data ?? []) as GuideEntry[];
}

export async function proposeGuideEntry(connectionId: string, text: string, source: string | null): Promise<void> {
  if (USE_MOCKS) return mock.propose(connectionId, text, source);
  const { error } = await requireSupabase().rpc('propose_halal_cards_guide_entry', {
    p_connection_id: connectionId,
    p_body: text,
    p_source: source ?? '',
  });
  if (error) throw error;
}

export async function agreeGuideEntry(entryId: string): Promise<void> {
  if (USE_MOCKS) return mock.agree(entryId);
  const { error } = await requireSupabase().rpc('agree_halal_cards_guide_entry', { p_entry_id: entryId });
  if (error) throw error;
}

export async function removeGuideEntry(entryId: string): Promise<void> {
  if (USE_MOCKS) return mock.remove(entryId);
  const { error } = await requireSupabase().rpc('remove_halal_cards_guide_entry', { p_entry_id: entryId });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Demo mode: an in-memory server and a partner who plays along
// ---------------------------------------------------------------------------

/**
 * Mirrors the server's rules (sealing, versions, one open game per activity)
 * and plays the other seat with the real engine, a beat behind, so the whole
 * flow — invite, accept, private answers, turns, reveals, endings — can be
 * walked on one phone.
 */
interface MockSession {
  id: string;
  connectionId: string;
  activityId: string;
  hostIsMe: boolean;
  status: CardsSession['status'];
  state: ActivityState;
  version: number;
  answers: Record<string, Partial<Record<Seat, unknown>>>;
  createdAt: string;
  updatedAt: string;
  /** When the partner last acted; they wait a moment before the next move. */
  partnerClock: number;
}

const PARTNER_DELAY_MS = 1800;

const mock = (() => {
  const unlocked = new Set<string>();
  const sessions = new Map<string, MockSession>();
  const guideEntries: (GuideEntry & { agreeAt?: number })[] = [];
  let counter = 0;
  const now = () => new Date().toISOString();
  const delay = () => new Promise((resolve) => setTimeout(resolve, 250));

  // A waiting invitation from the match, so the accept flow can be tried.
  unlocked.add('conn-1');
  sessions.set('mock-invite', {
    id: 'mock-invite',
    connectionId: 'conn-1',
    activityId: 'quiz-would-you-rather',
    hostIsMe: false,
    status: 'invited',
    state: { kind: 'quiz', cursor: 0 },
    version: 1,
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

  function view(session: MockSession): CardsSession {
    const me = mySeat(session);
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
      answers,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  function touch(session: MockSession) {
    session.updatedAt = now();
  }

  /** The partner's view of the session, so the engine can play their seat. */
  function partnerView(session: MockSession): CardsSession {
    const theirSeat = otherSeat(mySeat(session));
    const flipped = { ...session, hostIsMe: theirSeat === 'host' };
    return view(flipped);
  }

  function pick<T>(items: T[]): T | undefined {
    return items[Math.floor(Math.random() * items.length)];
  }

  function partnerTick(session: MockSession) {
    const clock = Date.now();
    if (session.status === 'invited' && session.hostIsMe && clock - Date.parse(session.createdAt) > PARTNER_DELAY_MS) {
      session.status = 'active';
      session.version += 1;
      session.partnerClock = clock;
      touch(session);
      return;
    }
    if (session.status !== 'active' || clock - session.partnerClock < PARTNER_DELAY_MS) return;
    const activity = findActivity(session.activityId);
    if (!activity) return;
    const theirs = partnerView(session);
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

  return {
    async access(connectionId: string): Promise<CardsAccess> {
      await delay();
      return { unlocked: unlocked.has(connectionId), unlockedByMe: false };
    },
    async list(connectionId: string): Promise<CardsSession[]> {
      await delay();
      return [...sessions.values()]
        .filter((session) => session.connectionId === connectionId)
        .map((session) => {
          partnerTick(session);
          return view(session);
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async get(id: string): Promise<CardsSession> {
      await delay();
      const session = requireSession(id);
      partnerTick(session);
      return view(session);
    },
    async start(connectionId: string, activityId: string, state: ActivityState): Promise<CardsSession> {
      await delay();
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
        answers: {},
        createdAt: now(),
        updatedAt: now(),
        partnerClock: Date.now(),
      };
      sessions.set(session.id, session);
      return view(session);
    },
    async respond(id: string, accept: boolean): Promise<CardsSession> {
      await delay();
      const session = requireSession(id);
      if (session.hostIsMe) throw new Error('Only the invited member can answer an invitation');
      if (session.status !== 'invited') throw new Error('This invitation is no longer open');
      session.status = accept ? 'active' : 'declined';
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
        session.version += 1;
        touch(session);
      }
      return view(session);
    },
    async answer(id: string, key: string, answer: unknown): Promise<CardsSession> {
      await delay();
      const session = requireSession(id);
      if (session.status !== 'active') throw new Error('This session is not in play');
      const seat = mySeat(session);
      if (session.answers[key]?.[seat] === undefined) {
        session.answers[key] = { ...session.answers[key], [seat]: answer };
        session.partnerClock = Math.min(session.partnerClock, Date.now() - PARTNER_DELAY_MS / 2);
      }
      touch(session);
      return view(session);
    },
    async advance(id: string, expectedVersion: number, state: ActivityState, completed: boolean): Promise<CardsSession> {
      await delay();
      const session = requireSession(id);
      if (session.status !== 'active') throw new Error('This session is not in play');
      if (session.version !== expectedVersion) throw new StaleSessionError();
      session.state = state;
      session.version += 1;
      if (completed) session.status = 'completed';
      session.partnerClock = Date.now();
      touch(session);
      return view(session);
    },
    async guide(connectionId: string): Promise<GuideEntry[]> {
      await delay();
      tickGuide();
      return guideEntries
        .filter((entry) => entry.connectionId === connectionId)
        .map(({ agreeAt: _agreeAt, ...entry }) => entry);
    },
    async propose(connectionId: string, text: string, source: string | null): Promise<void> {
      await delay();
      const existing = guideEntries.find(
        (entry) => entry.connectionId === connectionId && entry.text.trim().toLowerCase() === text.trim().toLowerCase()
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
      const index = guideEntries.findIndex((item) => item.id === entryId);
      if (index >= 0) guideEntries.splice(index, 1);
    },
  };
})();
