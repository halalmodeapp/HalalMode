import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import {
  advanceCardsSession,
  agreeGuideEntry,
  cancelCardsSession,
  fetchCardsAccess,
  fetchCardsSession,
  fetchCardsSessions,
  fetchGuide,
  proposeGuideEntry,
  removeGuideEntry,
  respondCardsInvite,
  StaleSessionError,
  submitCardsAnswer,
} from '@/api/halalCards';
import { findActivity } from '@/halalCards/content';
import { currentTurn, isFinished, resolveStory, type Turn } from '@/halalCards/engine/session';
import type { ActivityState, CardsSession } from '@/halalCards/types';
import { queryKeys } from '@/lib/queryClient';

const LIVE: CardsSession['status'][] = ['invited', 'active'];

/** How often an open game looks for the other player's move. */
const POLL_MS = 2500;

export function useCardsAccess(connectionId: string) {
  return useQuery({
    queryKey: queryKeys.cardsAccess(connectionId),
    queryFn: () => fetchCardsAccess(connectionId),
    staleTime: 30_000,
  });
}

export function useCardsSessions(connectionId: string, options?: { poll?: number }) {
  return useQuery({
    queryKey: queryKeys.cardsSessions(connectionId),
    queryFn: () => fetchCardsSessions(connectionId),
    staleTime: 0,
    refetchInterval: options?.poll ?? 15_000,
  });
}

export function useCardsSession(connectionId: string, sessionId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.cardsSession(sessionId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchCardsSession(sessionId),
    staleTime: 0,
    refetchInterval: (current) => (current.state.data && LIVE.includes(current.state.data.status) ? POLL_MS : false),
  });

  const session = query.data;
  const activity = session ? findActivity(session.activityId) : undefined;
  const turn: Turn | undefined = useMemo(
    () => (session && activity && session.status === 'active' ? currentTurn(activity, session) : undefined),
    [activity, session]
  );

  const apply = (next: CardsSession) => {
    queryClient.setQueryData(key, next);
    void queryClient.invalidateQueries({ queryKey: queryKeys.cardsSessions(connectionId) });
  };

  const onStale = (error: unknown) => {
    // The other phone got there first. Its version is the truth; fetch it.
    if (error instanceof StaleSessionError) void query.refetch();
  };

  const answer = useMutation({
    mutationFn: (input: { key: string; answer: unknown }) => submitCardsAnswer(sessionId, input.key, input.answer),
    onSuccess: apply,
  });

  const advance = useMutation({
    mutationFn: (input: { state: ActivityState; version: number }) => {
      if (!activity) throw new Error('Unknown activity.');
      return advanceCardsSession(sessionId, input.version, input.state, isFinished(activity, input.state));
    },
    onSuccess: apply,
    onError: onStale,
  });

  const respond = useMutation({
    mutationFn: (accept: boolean) => respondCardsInvite(sessionId, accept),
    onSuccess: apply,
  });

  const cancel = useMutation({
    mutationFn: () => cancelCardsSession(sessionId),
    onSuccess: apply,
  });

  // When both sealed story choices are in, whichever phone sees it first moves
  // the story on. The engine is deterministic, so both would write the same
  // thing; the version check lets exactly one of them land.
  const resolvedVersion = useRef<number | null>(null);
  useEffect(() => {
    if (!session || !activity || turn?.kind !== 'resolve') return;
    if (resolvedVersion.current === session.version || advance.isPending) return;
    resolvedVersion.current = session.version;
    advance.mutate({ state: resolveStory(activity, session.state, turn.picks), version: session.version });
  }, [activity, advance, session, turn]);

  return { query, session, activity, turn, answer, advance, respond, cancel };
}

export function useGuide(connectionId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.cardsGuide(connectionId);
  const query = useQuery({ queryKey: key, queryFn: () => fetchGuide(connectionId), staleTime: 0, refetchInterval: 10_000 });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });

  const propose = useMutation({
    mutationFn: (input: { text: string; source: string | null }) => proposeGuideEntry(connectionId, input.text, input.source),
    onSuccess: refresh,
  });
  const agree = useMutation({ mutationFn: agreeGuideEntry, onSuccess: refresh });
  const remove = useMutation({ mutationFn: removeGuideEntry, onSuccess: refresh });

  return { query, propose, agree, remove };
}
