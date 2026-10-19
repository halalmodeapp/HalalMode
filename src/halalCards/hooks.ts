import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  advanceCardsSession,
  agreeGuideEntry,
  cancelCardsSession,
  fetchCardsAccess,
  fetchCardsAttention,
  fetchCardsSession,
  fetchCardsSummary,
  fetchGuide,
  proposeGuideEntry,
  removeGuideEntry,
  respondCardsInvite,
  restoreGuideEntry,
  setCardsTrack,
  StaleSessionError,
  submitCardsAnswer,
} from '@/api/halalCards';
import { useCardsContent } from '@/halalCards/localized';
import { awaitingOf, currentTurn, isFinished, resolveStory, type Turn } from '@/halalCards/engine/session';
import type { ActivityState, CardsSession, CardsTrack } from '@/halalCards/types';
import { resolveRetryDelay } from '@/halalCards/present';
import { queryKeys } from '@/lib/queryClient';
import { useScreenActive } from '@/hooks/useScreenActive';

const LIVE: CardsSession['status'][] = ['invited', 'active'];

/** How often an open game looks for the other player's move. */
const POLL_MS = 3000;

export function useCardsAccess(connectionId: string) {
  return useQuery({
    queryKey: queryKeys.cardsAccess(connectionId),
    queryFn: () => fetchCardsAccess(connectionId),
    staleTime: 30_000,
  });
}

export function useSetCardsTrack(connectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (track: CardsTrack) => setCardsTrack(connectionId, track),
    onMutate: (track) => {
      queryClient.setQueryData(queryKeys.cardsAccess(connectionId), (current: unknown) =>
        current ? { ...(current as object), track } : current
      );
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.cardsAccess(connectionId) }),
  });
}

/** The light session list for the hub and the chat. Pushes do the urgent work. */
export function useCardsSummary(connectionId: string, options?: { poll?: number; enabled?: boolean }) {
  const active = useScreenActive();
  return useQuery({
    queryKey: queryKeys.cardsSessions(connectionId),
    queryFn: () => fetchCardsSummary(connectionId),
    staleTime: 0,
    enabled: active && !!connectionId && (options?.enabled ?? true),
    refetchInterval: options?.poll ?? 30_000,
  });
}

/** Halal Cards items waiting on this member, by connection, for badges. */
export function useCardsAttention() {
  const active = useScreenActive();
  return useQuery({
    queryKey: queryKeys.cardsAttention,
    queryFn: fetchCardsAttention,
    enabled: active,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useCardsSession(connectionId: string, sessionId: string) {
  const active = useScreenActive();
  const queryClient = useQueryClient();
  const key = queryKeys.cardsSession(sessionId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchCardsSession(sessionId),
    enabled: active && !!sessionId,
    staleTime: 0,
    refetchInterval: (current) => (current.state.data && LIVE.includes(current.state.data.status) ? POLL_MS : false),
  });

  const session = query.data;
  const { findActivity } = useCardsContent();
  const activity = session ? findActivity(session.activityId) : undefined;
  const turn: Turn | undefined = useMemo(
    () => (session && activity && session.status === 'active' ? currentTurn(activity, session) : undefined),
    [activity, session]
  );

  const apply = (next: CardsSession) => {
    queryClient.setQueryData(key, next);
    void queryClient.invalidateQueries({ queryKey: queryKeys.cardsSessions(connectionId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.cardsAttention });
  };

  const onStale = (error: unknown) => {
    // The other phone got there first. Its version is the truth; fetch it.
    if (active && error instanceof StaleSessionError) void query.refetch();
  };

  const answer = useMutation({
    mutationFn: (input: { key: string; answer: unknown }) => {
      if (!session || !activity) throw new Error('Session not ready.');
      // Who the session waits on once this answer is in.
      const sealed = session.answers[input.key];
      const after: CardsSession = {
        ...session,
        answers: { ...session.answers, [input.key]: { theirReady: false, ...sealed, mine: input.answer } },
      };
      const awaiting = sealed?.theirReady ? null : awaitingOf(activity, after);
      return submitCardsAnswer(sessionId, input.key, input.answer, awaiting);
    },
    onSuccess: apply,
  });

  const advance = useMutation({
    mutationFn: (input: { state: ActivityState; version: number }) => {
      if (!activity || !session) throw new Error('Unknown activity.');
      const done = isFinished(activity, input.state);
      const awaiting = done ? null : awaitingOf(activity, { ...session, state: input.state });
      return advanceCardsSession(sessionId, input.version, input.state, done, awaiting);
    },
    onSuccess: apply,
    onError: onStale,
  });

  const respond = useMutation({
    mutationFn: (accept: boolean) => {
      const awaiting = accept && session && activity ? awaitingOf(activity, { ...session, status: 'active' }) : null;
      return respondCardsInvite(sessionId, accept, awaiting);
    },
    onSuccess: apply,
  });

  const cancel = useMutation({
    mutationFn: () => cancelCardsSession(sessionId),
    onSuccess: apply,
  });

  // When both sealed story choices are in, whichever phone sees it first moves
  // the story on. The engine is deterministic, so both would write the same
  // thing; the version check lets exactly one of them land. A failed save
  // (not a stale one) is retried with backoff rather than left on "Revealing".
  const resolvedVersion = useRef<number | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifecycle = useRef(0);
  useEffect(() => {
    return () => {
      lifecycle.current += 1;
      if (retryTimer.current !== null) clearTimeout(retryTimer.current);
      retryTimer.current = null;
      resolvedVersion.current = null;
    };
  }, [active, sessionId]);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active || !session || !activity || turn?.kind !== 'resolve') return;
    if (resolvedVersion.current === session.version || advance.isPending) return;
    resolvedVersion.current = session.version;
    const generation = lifecycle.current;
    advance.mutate(
      { state: resolveStory(activity, session.state, turn.picks), version: session.version },
      {
        onSuccess: () => { if (generation === lifecycle.current) setRetry(0); },
        onError: (error) => {
          if (error instanceof StaleSessionError || generation !== lifecycle.current) return;
          if (retryTimer.current !== null) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => {
            retryTimer.current = null;
            if (generation !== lifecycle.current) return;
            resolvedVersion.current = null;
            setRetry((value) => value + 1);
          }, resolveRetryDelay(retry));
        },
      }
    );
  }, [active, activity, advance, retry, session, turn]);

  return { query, session, activity, turn, answer, advance, respond, cancel };
}

export function useGuide(connectionId: string) {
  const active = useScreenActive();
  const queryClient = useQueryClient();
  const key = queryKeys.cardsGuide(connectionId);
  const query = useQuery({ queryKey: key, queryFn: () => fetchGuide(connectionId), enabled: active && !!connectionId, staleTime: 0, refetchInterval: 30_000 });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: queryKeys.cardsAttention });
  };

  const propose = useMutation({
    mutationFn: (input: { text: string; source: string | null }) => proposeGuideEntry(connectionId, input.text, input.source),
    onSuccess: refresh,
  });
  const agree = useMutation({ mutationFn: agreeGuideEntry, onSuccess: refresh });
  const remove = useMutation({ mutationFn: removeGuideEntry, onSuccess: refresh });
  const restore = useMutation({ mutationFn: restoreGuideEntry, onSuccess: refresh });

  return { query, propose, agree, remove, restore };
}
