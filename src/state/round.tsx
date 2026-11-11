import { USE_MOCKS } from '@/lib/supabase';
import { resetMySampleFlow } from '@/api/account';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  fetchCurrentRoundState,
  softSelectIntroduction,
  submitKeeps,
  type OwedAnswers,
} from '@/api/introductions';
import { DwellLedger, inferSoftSelect } from '@/lib/dwell';
import {
  MatchingEngagementLedger,
  submissionEngagement,
  type MatchingEngagementObservation,
} from '@/lib/matchingEngagement';
import type { DailyRoundEmptyReason, NarrowingCriterion } from '@/lib/dailyRoundState';
import { queryKeys } from '@/lib/queryClient';
import { resolveActiveId, roundPickRules } from '@/lib/roundInvariants';
import { useAuth } from '@/state/auth';
import { useSession } from '@/state/session';
import type { Introduction, IntroductionRound } from '@/types';

interface RoundValue {
  round: IntroductionRound | undefined;
  emptyReason: DailyRoundEmptyReason | null;
  /** Which of the member's own must-haves to loosen first, when relevant. */
  narrowingCriterion: NarrowingCriterion | null;
  thinCriterion: NarrowingCriterion | null;
  /** Set only while a built set waits to open, to name whose dawn it is. */
  nextSetCity: string | null;
  /**
   * When the member's current day ends: the loaded set's own end, otherwise
   * the server's scheduled or submitted-round Fajr.
   */
  resetsAt: string | null;
  /** Everyone the member still owes answers to, oldest first. */
  owedAll: OwedAnswers[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;

  /** Everyone in the set. Nobody is ever turned down one by one. */
  live: Introduction[];
  activeId: string | null;
  active: Introduction | null;
  setActive: (id: string) => void;

  /** How many the member may send interest to in this set, never more than it holds. */
  keepLimit: number;
  allowsSelectAll: boolean;
  /** Introduction ids with interest shown, oldest first. The order is the rank. */
  selected: string[];
  /**
   * Shows or withdraws interest. Returns false, changing nothing, when the
   * member is already at their limit, the screen then asks who to swap out.
   */
  toggleSelect: (id: string) => boolean;
  /** Swaps one selection for another, keeping the rest in order. */
  switchSelection: (removeId: string, addId: string) => void;
  /** Premium: everyone in the set at once. */
  selectAll: () => void;

  /** Local reading timer; a bounded, rounded total is submitted as a private matching signal. */
  profileOpened: (introductionId: string) => void;
  profileClosed: (introductionId: string) => void;
  /** Visibility timers for optional, private matching signals. */
  bioVisibility: (introductionId: string, visible: boolean) => void;
  photoVisibility: (introductionId: string, storagePath: string | null | undefined, visible: boolean) => void;
  submitting: boolean;
  /**
   * Sends interest for this set, first choice first, and resolves with the
   * mutual matches. Rejects when the set on screen is no longer the loaded one.
   */
  submit: (roundId: string, orderedIntroductionIds: string[]) => Promise<string[]>;
  /** True once interest is sent, drives the "Nothing more today" state. */
  submitted: boolean;
  /** A mutual is held only until both members have an open conversation slot. */
  waitingForConnection: boolean;
  submitError: string | null;

  reset: () => void;
}

const RoundContext = createContext<RoundValue | null>(null);

/**
 * Owns the interaction state for the current round.
 *
 * Lives above the tab navigator so a trip into a profile and back does not
 * forget who has been chosen.
 */
export function RoundProvider({ children }: { children: ReactNode }) {
  const { tier } = useSession();
  const { user } = useAuth();
  const memberId = user?.id;
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [waitingForConnection, setWaitingForConnection] = useState(false);

  const {
    data: roundState,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.round, USE_MOCKS ? tier : memberId],
    queryFn: () => fetchCurrentRoundState(tier),
    // The provider is mounted above the route stack, including public auth.
    // Do not call the member-only RPC until a verified account is present.
    enabled: USE_MOCKS || !!memberId,
  });
  const previousTier = useRef(tier);
  useEffect(() => {
    const changed = previousTier.current !== tier;
    previousTier.current = tier;
    // A membership change can affect capacity without replacing the loaded set.
    if (changed && !USE_MOCKS && memberId) void refetch();
  }, [tier, memberId, refetch]);

  const round = roundState?.round;
  const emptyReason = roundState?.status && roundState.status !== 'ready'
    ? roundState.status
    : null;

  const narrowingCriterion = roundState?.narrowingCriterion ?? null;
  const thinCriterion = roundState?.thinCriterion ?? null;
  const nextSetCity = roundState?.city ?? null;
  const nextFajrAt = roundState?.nextFajrAt ?? null;
  const resetsAt = round?.expiresAt ?? nextFajrAt;
  useEffect(() => {
    if (!resetsAt) return;
    const remaining = Date.parse(resetsAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    // Refresh the server state when the displayed day ends, even while foregrounded.
    const timer = setTimeout(() => void refetch(), Math.min(remaining + 100, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [resetsAt, refetch]);
  const owedAll = useMemo(() => roundState?.owedAll ?? [], [roundState?.owedAll]);

  const live = useMemo(() => round?.introductions ?? [], [round]);

  const rules = roundPickRules(round?.tier, tier);
  const keepLimit = Math.min(rules.keepLimit, live.length);
  const { allowsSelectAll } = rules;

  const resolvedActiveId = useMemo(
    () => resolveActiveId(live, activeId),
    [activeId, live]
  );

  const active = useMemo(
    () => live.find((item) => item.id === resolvedActiveId) ?? null,
    [live, resolvedActiveId]
  );

  // Read from a ref so a toggle can answer at once, before the next render.
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const ids = new Set(live.map(item => item.id));
    const next = selectedRef.current.filter(id => ids.has(id));
    if (next.length === selectedRef.current.length) return;
    selectedRef.current = next;
    setSelected(next);
  }, [live]);

  const toggleSelect = useCallback(
    (id: string) => {
      const current = selectedRef.current;
      if (current.includes(id)) {
        selectedRef.current = current.filter((item) => item !== id);
      } else if (current.length >= keepLimit) {
        return false;
      } else {
        selectedRef.current = [...current, id];
      }
      setSelected(selectedRef.current);
      return true;
    },
    [keepLimit]
  );

  const switchSelection = useCallback((removeId: string, addId: string) => {
    selectedRef.current = [
      ...selectedRef.current.filter((item) => item !== removeId && item !== addId),
      addId,
    ];
    setSelected(selectedRef.current);
  }, []);

  const selectAll = useCallback(() => {
    if (!allowsSelectAll) return;
    const current = selectedRef.current;
    selectedRef.current = [
      ...current,
      ...live.map((item) => item.id).filter((id) => !current.includes(id)),
    ].slice(0, keepLimit);
    setSelected(selectedRef.current);
  }, [allowsSelectAll, keepLimit, live]);

  // A ref, not state: reading a profile must never re-render the round.
  const ledger = useRef(new DwellLedger()).current;
  const matchingEngagement = useRef(new MatchingEngagementLedger()).current;

  // Backgrounding is not navigation, so nothing else stops the clock on an
  // open profile.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        ledger.resume();
        matchingEngagement.resume();
      } else {
        ledger.pause();
        matchingEngagement.pause();
      }
    });
    return () => subscription.remove();
  }, [ledger, matchingEngagement]);
  const profileOpened = useCallback((id: string) => ledger.opened(id), [ledger]);
  const profileClosed = useCallback((id: string) => ledger.closed(id), [ledger]);
  const bioVisibility = useCallback(
    (id: string, visible: boolean) =>
      matchingEngagement.bioVisibility(id, visible),
    [matchingEngagement]
  );
  const photoVisibility = useCallback(
    (id: string, path: string | null | undefined, visible: boolean) =>
      matchingEngagement.photoVisibility(id, path, visible),
    [matchingEngagement]
  );

  const submitMutation = useMutation({
    mutationFn: async ({ roundId, ordered, softSelect, engagement }: {
      roundId: string;
      ordered: string[];
      softSelect: string | null;
      engagement: MatchingEngagementObservation[];
    }) => {
      // Submitting closes the set to further signals, so this goes first.
      if (softSelect) {
        await softSelectIntroduction(softSelect).catch(() => {
          // A courtesy signal. Losing it must never cost the member their round.
        });
      }
      return submitKeeps(roundId, ordered, engagement);
    },
    onSuccess: (result) => {
      setSubmitted(true);
      setWaitingForConnection((result.waitingMutualProfileIds?.length ?? 0) > 0);
      void queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      // A mutual may already be waiting on this member's questions.
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
    },
  });

  const submit = useCallback(
    async (roundId: string, ordered: string[]) => {
      if (round?.id !== roundId) throw new Error('round_changed');
      // Raw reading times stay here; only the inferred id and bounded totals go on.
      const chosen = new Set(ordered);
      const reading = ledger.records();
      const result = await submitMutation.mutateAsync({
        roundId,
        ordered,
        softSelect: inferSoftSelect(reading, live.map((item) => item.id).filter((id) => !chosen.has(id))),
        engagement: submissionEngagement(matchingEngagement.snapshot(), reading),
      });
      return result.mutualProfileIds;
    },
    [ledger, live, matchingEngagement, round?.id, submitMutation]
  );

  const clearLocal = useCallback(() => {
    ledger.clear();
    matchingEngagement.clear();
    selectedRef.current = [];
    setSelected([]);
    setActiveId(null);
    setSubmitted(false);
    setWaitingForConnection(false);
  }, [ledger, matchingEngagement]);

  const reset = useCallback(() => {
    // Live, this is the testers' reset: the server clears sample rounds and
    // connections (and refuses anyone who is not a tester) before the app
    // forgets its local choices and asks for a fresh set.
    void (USE_MOCKS ? Promise.resolve() : resetMySampleFlow())
      .catch(() => undefined)
      .then(() => {
        clearLocal();
        void queryClient.invalidateQueries({ queryKey: queryKeys.round });
        void queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      });
  }, [clearLocal, queryClient]);

  // Choices belong to one member and one set.
  const roundId = round?.id;
  useEffect(() => {
    clearLocal();
  }, [clearLocal, memberId, roundId]);

  const value = useMemo<RoundValue>(
    () => ({
      round,
      emptyReason,
      narrowingCriterion,
      thinCriterion,
      nextSetCity,
      resetsAt,
      owedAll,
      isLoading,
      error: (error as Error) ?? null,
      refresh: () => void refetch(),
      live,
      activeId: resolvedActiveId,
      active,
      setActive: setActiveId,
      keepLimit,
      allowsSelectAll,
      selected,
      toggleSelect,
      switchSelection,
      selectAll,
      profileOpened,
      profileClosed,
      bioVisibility,
      photoVisibility,
      submitting: submitMutation.isPending,
      submit,
      submitted,
      waitingForConnection,
      // Supabase errors are not always Error instances; keep their message either way.
      submitError: submitMutation.error ? String((submitMutation.error as { message?: unknown }).message ?? 'failed') : null,
      reset,
    }),
    [
      round,
      emptyReason,
      narrowingCriterion,
      thinCriterion,
      nextSetCity,
      resetsAt,
      owedAll,
      isLoading,
      error,
      refetch,
      live,
      resolvedActiveId,
      active,
      keepLimit,
      allowsSelectAll,
      selected,
      toggleSelect,
      switchSelection,
      selectAll,
      profileOpened,
      profileClosed,
      bioVisibility,
      photoVisibility,
      submitMutation.isPending,
      submit,
      submitted,
      waitingForConnection,
      submitMutation.error,
      reset,
    ]
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

export function useRound(): RoundValue {
  const value = useContext(RoundContext);
  if (!value) throw new Error('useRound must be used inside <RoundProvider>');
  return value;
}
