import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  advanceCardsSession,
  cancelCardsSession,
  fetchCardsSession,
  respondCardsInvite,
  StaleSessionError,
} from '@/api/halalCards';
import { useScreenActive } from '@/hooks/useScreenActive';
import { appendRc, deriveRc, isRcClaudeState, rcActionId, rcAwaiting, startRc } from '@/halalCards/relationshipChallengeClaude/engine';
import { rcScenarioForActivity } from '@/halalCards/relationshipChallengeClaude/scenarios';
import type { RcAction, RcClaudeState, RcScenario } from '@/halalCards/relationshipChallengeClaude/types';
import type { ActivityState, CardsSession, Seat } from '@/halalCards/types';
import { queryKeys } from '@/lib/queryClient';

/**
 * A challenge played over the existing Halal Cards session: same invitation,
 * accept/decline, leave and server. The shared state is the event log; each
 * action is appended to the version it was computed from, and the server
 * refuses a write from an older version. On that refusal the phone fetches
 * the newer log and re-applies the same action under the same id, so a
 * retry can never double a clue, and a reconnect resumes where the log is.
 */

const POLL_MS = 2500;
const LIVE: CardsSession['status'][] = ['invited', 'active'];
const RETRIES = 4;

/** The boundary with the shared Halal Cards types, which do not list this kind. */
export function asActivityState(state: RcClaudeState): ActivityState {
  return state as unknown as ActivityState;
}

export function useRcClaudeSession(connectionId: string, sessionId: string) {
  const active = useScreenActive();
  const queryClient = useQueryClient();
  const key = queryKeys.cardsSession(sessionId);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [inFlight, setInFlight] = useState(0);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchCardsSession(sessionId),
    enabled: active && !!sessionId,
    staleTime: 0,
    refetchInterval: (current) => (current.state.data && LIVE.includes(current.state.data.status) ? POLL_MS : false),
  });

  const session = query.data;
  const scenario: RcScenario | undefined = session ? rcScenarioForActivity(session.activityId) : undefined;
  const state = session && isRcClaudeState(session.state) ? session.state : undefined;

  const apply = useCallback(
    (next: CardsSession) => {
      queryClient.setQueryData(key, next);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cardsSessions(connectionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cardsAttention });
    },
    [connectionId, key, queryClient]
  );

  const write = useCallback(
    async (action: RcAction, seat: Seat, actionId: string) => {
      for (let attempt = 0; attempt < RETRIES; attempt += 1) {
        const current = queryClient.getQueryData<CardsSession>(key);
        const currentScenario = current && rcScenarioForActivity(current.activityId);
        if (!current || !currentScenario || current.status !== 'active' || !isRcClaudeState(current.state)) return;
        const result = appendRc(currentScenario, current.state, action, seat, actionId);
        if (result.kind !== 'applied') return;
        try {
          const next = await advanceCardsSession(
            sessionId,
            current.version,
            asActivityState(result.state),
            result.view.solved,
            rcAwaiting(result.view)
          );
          apply(next);
          return;
        } catch (error) {
          if (!(error instanceof StaleSessionError)) throw error;
          // The other phone wrote first. Take its log and try again on top.
          apply(await fetchCardsSession(sessionId));
        }
      }
    },
    [apply, key, queryClient, sessionId]
  );

  /** Queued so two quick taps on one phone never race each other. */
  const dispatch = useCallback(
    (action: RcAction) => {
      const current = queryClient.getQueryData<CardsSession>(key);
      if (!current) return;
      const seat = current.mySeat;
      const actionId = rcActionId(seat);
      setInFlight((count) => count + 1);
      queue.current = queue.current
        .then(() => write(action, seat, actionId))
        .catch(() => undefined)
        .finally(() => setInFlight((count) => count - 1));
    },
    [key, queryClient, write]
  );

  const respond = useMutation({
    mutationFn: (accept: boolean) => respondCardsInvite(sessionId, accept, null),
    onSuccess: apply,
  });

  const cancel = useMutation({
    mutationFn: () => cancelCardsSession(sessionId),
    onSuccess: apply,
  });

  const view = useMemo(() => (scenario && state ? deriveRc(scenario, state) : undefined), [scenario, state]);

  return {
    query,
    session,
    scenario,
    state,
    view,
    dispatch,
    pending: inFlight > 0,
    // A failed poll with data in hand: keep playing, say we are reconnecting.
    reconnecting: query.isRefetchError || (!!session && query.isError),
    respond,
    cancel,
  };
}

/** The preview: the same engine, held in memory, both seats on one phone. */
export function useRcClaudeLocal(scenario: RcScenario) {
  const [state, setState] = useState<RcClaudeState>(() => startRc(scenario));
  const [seat, setSeat] = useState<Seat>('host');
  const dispatch = useCallback(
    (action: RcAction) =>
      setState((current) => {
        const result = appendRc(scenario, current, action, seat, rcActionId(seat));
        return result.kind === 'applied' ? result.state : current;
      }),
    [scenario, seat]
  );
  return {
    state,
    seat,
    setSeat,
    dispatch,
    reset: () => setState(startRc(scenario)),
  };
}
