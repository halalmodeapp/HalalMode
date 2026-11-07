import {
  MOCK_CONNECTIONS,
  MOCK_MESSAGES,
  MOCK_THEIR_ANSWERS,
} from '@/data/mock';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';
import { hydrateProfileMedia } from '@/api/profileMedia';
import type { ChatMessage, Connection, QuestionAnswer } from '@/types';

export async function fetchConnections(): Promise<Connection[]> {
  if (USE_MOCKS) return MOCK_CONNECTIONS;

  const client = requireSupabase();
  const { data, error } = await client.rpc('get_connections');
  if (error) throw error;
  return Promise.all(
    (data as Connection[]).map(async (connection) => ({
      ...connection,
      profile: await hydrateProfileMedia(connection.profile),
    }))
  );
}

export async function fetchConnection(id: string): Promise<Connection> {
  if (USE_MOCKS) {
    const found = MOCK_CONNECTIONS.find((connection) => connection.id === id);
    if (!found) throw new Error(`No connection ${id}`);
    return found;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('get_connection', { p_id: id });
  if (error) throw error;
  const rawConnection = data as Connection;
  const connection: Connection = {
    ...rawConnection,
    profile: await hydrateProfileMedia(rawConnection.profile),
  };

  return connection;
}

/**
 * Saves this member's five picks. The server intersects them with the other
 * side's picks; the union becomes the shared list, tagged with who chose what.
 */
export async function submitQuestionPicks(
  connectionId: string,
  questionIds: string[]
): Promise<void> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const connection = MOCK_CONNECTIONS.find((item) => item.id === connectionId);
    if (!connection) throw new Error('Connection not found.');
    connection.myQuestionPicksSubmitted = true;
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc('submit_question_picks', {
    p_connection_id: connectionId,
    p_question_ids: questionIds,
  });
  if (error) throw error;
}

/**
 * Submits one answer and returns the pair with the other side's answer filled
 * in, the double-blind reveal.
 *
 * The unlock happens server-side on purpose. If the client held their answer
 * and merely blurred it, anyone with a debugger could read it early, and the
 * honesty the whole flow depends on would be theatre.
 */
export async function submitAnswer(
  connectionId: string,
  questionId: string,
  answer: string
): Promise<QuestionAnswer> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const connection = MOCK_CONNECTIONS.find(item => item.id === connectionId);
    const question = connection?.questions.find(item => item.questionId === questionId);
    if (!connection || !question) throw new Error('Connection not found.');
    question.myAnswer = question.myAnswer || answer;
    question.mySubmittedAt = question.mySubmittedAt || new Date().toISOString();
    if (connection.questions.every(item => item.mySubmittedAt)) {
      for (const item of connection.questions) {
        item.theirAnswer = MOCK_THEIR_ANSWERS[item.questionId];
        item.theirSubmittedAt = new Date().toISOString();
      }
      connection.stage = 'recap';
    }
    return { ...question };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('submit_answer', {
    p_connection_id: connectionId,
    p_question_id: questionId,
    p_answer: answer,
  });
  if (error) throw error;
  return data as QuestionAnswer;
}

/**
 * The written comparison of both members' answers. `summary` is null when it
 * is not available; `pending` says it is still being written, so it is worth
 * asking again in a moment. Once written it is saved on the server, so later
 * reads return the same text straight away.
 */
export async function fetchConnectionSummary(
  connectionId: string,
  language: string,
): Promise<{ summary: string | null; pending: boolean }> {
  if (USE_MOCKS) return { summary: null, pending: false };
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('connection-summary', {
    body: { connectionId, language },
  });
  if (error) return { summary: null, pending: false };
  return {
    summary: typeof data?.summary === 'string' ? data.summary : null,
    pending: data?.pending === true,
  };
}

/** Answers the member chose to keep, by question id. Private to them. */
const mockSavedAnswers: Record<string, string> = {};

export async function fetchSavedAnswers(): Promise<Record<string, string>> {
  if (USE_MOCKS) return { ...mockSavedAnswers };
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_my_saved_answers');
  if (error) throw error;
  return (data ?? {}) as Record<string, string>;
}

export async function saveAnswer(questionId: string, body: string): Promise<void> {
  if (USE_MOCKS) {
    mockSavedAnswers[questionId] = body;
    return;
  }
  const client = requireSupabase();
  const { error } = await client.rpc('save_my_answer', { p_question_id: questionId, p_body: body });
  if (error) throw error;
}

export async function fetchMessages(
  connectionId: string
): Promise<ChatMessage[]> {
  const page = await fetchMessagesPage(connectionId);
  return page.messages;
}

export type MessageCursor = {
  createdAt: string;
  id: string;
};

export type MessagePage = {
  messages: ChatMessage[];
  nextCursor?: MessageCursor;
  hasMore: boolean;
};

/**
 * Fetches a bounded, oldest-to-newest page. Cursor access is verified by the
 * server so a client cannot use pagination to probe another connection.
 */
export async function fetchMessagesPage(
  connectionId: string,
  before?: MessageCursor
): Promise<MessagePage> {
  if (USE_MOCKS) {
    return {
      messages: MOCK_MESSAGES.filter((m) => m.connectionId === connectionId),
      hasMore: false,
    };
  }

  const client = requireSupabase();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in to read messages.');
  const { data, error } = await client.rpc('get_connection_messages', {
    p_connection_id: connectionId,
    p_before_at: before?.createdAt ?? null,
    p_before_id: before?.id ?? null,
    p_limit: 50,
  });
  if (error) throw error;
  const payload = data as {
    messages?: Record<string, unknown>[];
    nextCursor?: { createdAt?: unknown; id?: unknown } | null;
    hasMore?: unknown;
  } | null;
  const nextCursor = payload?.nextCursor;
  return {
    messages: (payload?.messages ?? []).map((row) => messageFromRow(row, user.id)),
    hasMore: payload?.hasMore === true,
    ...(typeof nextCursor?.createdAt === 'string' && typeof nextCursor.id === 'string'
      ? { nextCursor: { createdAt: nextCursor.createdAt, id: nextCursor.id } }
      : {}),
  };
}

export async function sendMessage(
  connectionId: string,
  text: string,
  clientRequestId?: string
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: `local-${Date.now()}`,
    connectionId,
    sender: 'me',
    text,
    createdAt: new Date().toISOString(),
  };

  if (USE_MOCKS) return message;

  const client = requireSupabase();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('You must be signed in to send a message.');
  const { data, error } = await client.rpc('send_message', {
    p_connection_id: connectionId,
    p_body: text,
    p_client_request_id: clientRequestId ?? null,
  });
  if (error) throw error;
  return messageFromRow(data as Record<string, unknown>, user.id);
}

/** Marks only incoming messages as read; a caller can never mark their own sent message as read. */
export async function markMessagesRead(connectionId: string): Promise<void> {
  if (USE_MOCKS) return;

  const client = requireSupabase();
  const { error } = await client.rpc('mark_connection_messages_read', {
    p_connection_id: connectionId,
  });
  if (error) throw error;
}

/** Opening a conversation is a one-way server transition from the recap. */
export async function openConnection(connectionId: string): Promise<void> {
  if (USE_MOCKS) return;

  const client = requireSupabase();
  const { error } = await client.rpc('open_connection', {
    p_connection_id: connectionId,
  });
  if (error) throw error;
}

/**
 * Closes a connection politely. Both sides simply see it move to closed, no
 * reason is surfaced, ever.
 */
export async function closeConnection(connectionId: string): Promise<void> {
  if (USE_MOCKS) return;

  const client = requireSupabase();
  const { error } = await client.rpc('close_connection', {
    p_connection_id: connectionId,
  });
  if (error) throw error;
}

/** Closes a connection with a kind word to the other person: a reason, or the member's own. */
export async function closeConnectionWithFarewell(connectionId: string, reason: string, message: string): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('close_connection_with_farewell', {
    p_connection_id: connectionId,
    p_reason: reason,
    p_message: message || null,
  });
  if (error) throw error;
}

export interface FarewellNote {
  connectionId: string;
  name: string | null;
  reason: string;
  message: string | null;
}

export async function fetchMyFarewells(): Promise<FarewellNote[]> {
  if (USE_MOCKS) return [];
  const { data, error } = await requireSupabase().rpc('get_my_farewells');
  if (error) throw error;
  return (data ?? []) as FarewellNote[];
}

export async function markFarewellSeen(connectionId: string): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('mark_farewell_seen', { p_connection_id: connectionId });
  if (error) throw error;
}

export function messageFromRow(row: Record<string, unknown>, currentUserId: string): ChatMessage {
  return {
    id: String(row.id),
    connectionId: String(row.connection_id),
    sender: row.sender_id === currentUserId ? 'me' : 'them',
    deletedAt: row.deleted_at as string | undefined,
    text: row.body as string | undefined,
    voiceUrl: row.voice_path as string | undefined,
    voiceDurationSeconds: row.voice_duration_seconds as number | undefined,
    createdAt: String(row.created_at),
    readAt: row.read_at as string | undefined,
  };
}

export type WaitingMatch = { id: string; firstName: string; blurredPhotos: string[] };

export async function fetchWaitingMatches(): Promise<WaitingMatch[]> {
  if (USE_MOCKS) return [];
  const { data, error } = await requireSupabase().rpc('get_my_waiting_matches');
  if (error) throw error;
  return data ?? [];
}

export async function fetchDeletableMessageIds(connectionId: string): Promise<string[]> {
  if (USE_MOCKS) return MOCK_MESSAGES.filter(m => m.connectionId === connectionId && m.sender === 'me' && !m.deletedAt).map(m => m.id);
  const { data, error } = await requireSupabase().rpc('get_deletable_message_ids', { p_connection_id: connectionId });
  if (error) throw error;
  return data ?? [];
}

export async function deleteMessageForEveryone(messageId: string): Promise<void> {
  if (USE_MOCKS) {
    const message = MOCK_MESSAGES.find(m => m.id === messageId);
    if (message) {
      message.deletedAt = new Date().toISOString();
      message.text = undefined;
      message.voiceUrl = undefined;
      const latest = MOCK_MESSAGES.filter(m => m.connectionId === message.connectionId).at(-1);
      const connection = MOCK_CONNECTIONS.find(c => c.id === message.connectionId);
      if (connection && latest?.id === messageId) connection.lastMessageDeleted = true;
    }
    return;
  }
  const { error } = await requireSupabase().rpc('delete_message_for_everyone', { p_message_id: messageId });
  if (error) throw error;
}

export async function fetchMessageDeletions(connectionId: string, messageIds: string[]): Promise<{ id: string; deletedAt: string }[]> {
  if (USE_MOCKS) return MOCK_MESSAGES.filter(m => m.connectionId === connectionId && m.deletedAt && messageIds.includes(m.id))
    .map(m => ({ id: m.id, deletedAt: m.deletedAt! }));
  if (!messageIds.length) return [];
  const { data, error } = await requireSupabase().rpc('get_connection_message_deletions', {
    p_connection_id: connectionId, p_message_ids: messageIds,
  });
  if (error) throw error;
  return data ?? [];
}
