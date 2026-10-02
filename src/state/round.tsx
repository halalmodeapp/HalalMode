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
import type { DailyRoundEmptyReason, NarrowingCriterion } from '@/lib/dailyRoundState';
import { queryKeys } from '@/lib/queryClient';
import { resolveActiveId } from '@/lib/roundInvariants';
import { useAuth } from '@/state/auth';
import { useSession } from '@/state/session';
import { TIER_LIMITS, type Introduction, type IntroductionRound } from '@/types';

interface RoundValue {
  round: IntroductionRound | undefined;
  emptyReason: DailyRoundEmptyReason | null;
  /** Which of the member's own must-haves to loosen first, when relevant. */
  narrowingCriterion: NarrowingCriterion | null;
  /** Set only while a built set waits to open, to name whose dawn it is. */
  nextSetCity: string | null;
  /** Whose questions the member must answer before seeing a set. */
  owed: OwedAnswers | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;

  /** Everyone in the set. Nobody is ever turned down one by one. */
  live: Introduction[];
  activeId: string | null;
  active: Introduction | null;
  setActive: (id: string) => void;

  /** How many the member may send interest to at once at their tier. */
  keepLimit: number;
  /** Introduction ids with interest shown, oldest first. The order is the rank. */
  selected: string[];
  /**
   * Shows or withdraws interest. Returns false, changing nothing, when the
   * member is already at their limit — the screen then asks who to swap out.
   */
  toggleSelect: (id: string) => boolean;
  /** Swaps one selection for another, keeping the rest in order. */
  switchSelection: (removeId: string, addId: string) => void;
  /** Premium: everyone in the set at once. */
  selectAll: () => void;

  /** How long each profile was read. Kept on the device and never sent. */
  profileOpened: (introductionId: string) => void;
  profileClosed: (introductionId: string) => void;
  /**
   * Notes whoever was read longest but not chosen, before the set is sent.
   * Never shown to anyone.
   */
  recordSoftSelect: () => Promise<void>;

  submitting: boolean;
  /** Sends interest to the selection. Resolves with the mutual matches. */
  submit: (keptIntroductionIds?: string[]) => Promise<string[]>;
  /** True once interest is sent — drives the "Nothing more today" state. */
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
    queryKey: [...queryKeys.round, tier],
    queryFn: () => fetchCurrentRoundState(tier),
  });

  const round = roundState?.round;
  const emptyReason = roundState?.status && roundState.status !== 'ready'
    ? roundState.status
    : null;

  const narrowingCriterion = roundState?.narrowingCriterion ?? null;
  const nextSetCity = roundState?.city ?? null;
  const owed = roundState?.owed ?? null;

  const keepLimit = TIER_LIMITS[tier].keeps;

  const live = useMemo(() => round?.introductions ?? [], [round]);

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
    const current = selectedRef.current;
    selectedRef.current = [
      ...current,
      ...live.map((item) => item.id).filter((id) => !current.includes(id)),
    ].slice(0, keepLimit);
    setSelected(selectedRef.current);
  }, [keepLimit, live]);

  // A ref, not state: reading a profile must never re-render the round.
  const ledger = useRef(new DwellLedger()).current;

  // Backgrounding is not navigation, so nothing else stops the clock on an
  // open profile.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') ledger.resume();
      else ledger.pause();
    });
    return () => subscription.remove();
  }, [ledger]);
  const profileOpened = useCallback((id: string) => ledger.opened(id), [ledger]);
  const profileClosed = useCallback((id: string) => ledger.closed(id), [ledger]);

  const softSelectMutation = useMutation({ mutationFn: softSelectIntroduction });
  const recordSoftSelect = useCallback(async () => {
    const notChosen = live
      .map((item) => item.id)
      .filter((id) => !selectedRef.current.includes(id));
    const candidate = inferSoftSelect(ledger.records(), notChosen);
    if (!candidate) return;
    try {
      await softSelectMutation.mutateAsync(candidate);
    } catch {
      // A courtesy signal. Losing it must never cost the member their round.
    }
  }, [ledger, live, softSelectMutation]);

  const submitMutation = useMutation({
    mutationFn: async (keptIntroductionIds: string[]) => {
      if (!round) return { mutualProfileIds: [] };
      return submitKeeps(round.id, keptIntroductionIds);
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
    async (keptIntroductionIds?: string[]) => {
      const result = await submitMutation.mutateAsync(keptIntroductionIds ?? selectedRef.current);
      return result.mutualProfileIds;
    },
    [submitMutation]
  );

  const clearLocal = useCallback(() => {
    ledger.clear();
    selectedRef.current = [];
    setSelected([]);
    setActiveId(null);
    setSubmitted(false);
    setWaitingForConnection(false);
  }, [ledger]);

  const reset = useCallback(() => {
    clearLocal();
    void queryClient.invalidateQueries({ queryKey: queryKeys.round });
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
      nextSetCity,
      owed,
      isLoading,
      error: (error as Error) ?? null,
      refresh: () => void refetch(),
      live,
      activeId: resolvedActiveId,
      active,
      setActive: setActiveId,
      keepLimit,
      selected,
      toggleSelect,
      switchSelection,
      selectAll,
      profileOpened,
      profileClosed,
      recordSoftSelect,
      submitting: submitMutation.isPending,
      submit,
      submitted,
      waitingForConnection,
      submitError: submitMutation.error instanceof Error ? submitMutation.error.message : null,
      reset,
    }),
    [
      round,
      emptyReason,
      narrowingCriterion,
      nextSetCity,
      owed,
      isLoading,
      error,
      refetch,
      live,
      resolvedActiveId,
      active,
      keepLimit,
      selected,
      toggleSelect,
      switchSelection,
      selectAll,
      profileOpened,
      profileClosed,
      recordSoftSelect,
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
