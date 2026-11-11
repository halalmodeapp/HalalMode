import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ArcCarousel } from '@/components/introductions/ArcCarousel';
import { ConductAcknowledgement } from '@/components/introductions/ConductAcknowledgement';
import { FanReveal } from '@/components/introductions/FanReveal';
import { FirstChoiceDialog } from '@/components/introductions/FirstChoiceDialog';
import { HeroCard } from '@/components/introductions/HeroCard';
import { BrandHeader } from '@/components/navigation/BrandHeader';
import { SafetyControl } from '@/components/safety/SafetyControl';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, InlineNotice, LoadingState } from '@/components/ui/AsyncState';
import { resolveDailyPresentation, type NarrowingCriterion } from '@/lib/dailyRoundState';
import { narrowingCriterionKey } from '@/lib/narrowingCriterion';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ReadinessChecklist } from '@/components/readiness/ReadinessChecklist';
import { Screen } from '@/components/ui/Screen';
import { StretchScrollView } from '@/components/ui/StretchScrollView';
import { Text } from '@/components/ui/Text';
import { useNextFajr } from '@/hooks/useNextFajr';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { fetchMySampleMembers } from '@/api/account';
import { fetchMyProfile, fetchMyProfileReadiness } from '@/api/profile';
import { enableMyNotifications, fetchMyNotificationConsent } from '@/api/notifications';
import { trackProductEvent } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryClient';
import { acceptConduct, hasAcceptedConduct } from '@/lib/conductAcknowledgement';
import { countdownTo, countdownTick } from '@/lib/countdown';
import { hasSeenReveal, markRevealSeen } from '@/lib/revealSeen';
import { USE_MOCKS } from '@/lib/supabase';
import { readinessSteps, type ReadinessStep } from '@/lib/profileReadiness';
import { testIds } from '@/lib/testIds';
import { useRound } from '@/state/round';
import { useAuth } from '@/state/auth';
import { alpha, color, font, space } from '@/theme/tokens';
import { RTL_LAYOUT } from '@/lib/rtl';
import { errorMessage } from '@/lib/errorMessage';
import { useBreakpoint } from '@/theme/breakpoints';
import { ActionIcon } from '@/components/ui/ActionIcon';

/**
 * Names the criterion in the member's own words, matching the label on the
 * control they would go and change.
 */
/**
 * A short set says which of the member's own choices to loosen, if one of them is why. A very short one
 * says something even when none is, since only a handful of people fit their filters and location.
 */
function ThinSetNotice({ criterion, count }: { criterion: NarrowingCriterion | null; count: number }) {
  const { t } = useI18n();
  const key = narrowingCriterionKey(criterion);
  if (!key && count >= 3) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/(tabs)/you', params: { tab: 'private' } })}
    >
      <InlineNotice message={key ? t('daily.thinBody', { count, criterion: t(key) }) : t('daily.thinFew', { count })} />
    </Pressable>
  );
}

function DailyScrollScreen({ children, isRTL }: { children: ReactNode; isRTL: boolean }) {
  return (
    <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
      <StretchScrollView
        contentContainerStyle={styles.dailyScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </StretchScrollView>
    </Screen>
  );
}

/** The one dialog the Daily screen can have open, with the choices it holds. */
type DailyDialog =
  | { kind: 'none' }
  | { kind: 'confirm' }
  | { kind: 'nobody' }
  /** Choosing someone at the limit: who they are, and who to swap out for them. */
  | { kind: 'swap'; pendingId: string; swapOutId: string | null }
  | { kind: 'first-choice'; firstChoiceId: string | null };

const NO_DIALOG: DailyDialog = { kind: 'none' };

export default function DailyScreen() {
  const { t, isRTL, localeTag } = useI18n();
  // Back from Settings or Profile: undo any page scroll a phone keyboard left
  // behind, so the cards are where they belong.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.scrollY !== 0) window.scrollTo(0, 0);
    }, []),
  );
  const breakpoint = useBreakpoint();
  const wideLayout = breakpoint !== 'phone';
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const headerProfile = useQuery({ queryKey: queryKeys.profile('me'), queryFn: fetchMyProfile });
  const readinessQuery = useQuery({
    queryKey: queryKeys.profileReadiness,
    queryFn: fetchMyProfileReadiness,
    enabled: !USE_MOCKS,
  });
  const {
    round,
    emptyReason,
    narrowingCriterion,
    thinCriterion,
    nextSetCity,
    nextFajrAt,
    owedAll,
    isLoading,
    error,
    refresh,
    live,
    activeId,
    active,
    keepLimit,
    allowsSelectAll,
    selected,
    toggleSelect,
    switchSelection,
    selectAll,
    setActive,
    submit,
    submitting,
    submitted,
    waitingForConnection,
    submitError,
  } = useRound();

  const [dialog, setDialog] = useState<DailyDialog>(NO_DIALOG);
  const closeDialog = useCallback(() => setDialog(NO_DIALOG), []);
  const [conductVisible, setConductVisible] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const reducedMotion = useReducedMotion();
  const roundId = round?.id;
  const introductionCount = round?.introductions.length;
  const conductMemberId = user?.id ?? 'mock-member';
  const [conductCheckedFor, setConductCheckedFor] = useState<string | null>(null);
  const cardIds = live.map(item => item.id).join(',');

  useEffect(() => {
    // Dialog choices belong to the cards that were visible when they opened.
    setDialog(NO_DIALOG);
    setRevealing(false);
  }, [cardIds, conductMemberId, roundId]);

  useEffect(() => {
    let active = true;
    void hasAcceptedConduct(conductMemberId)
      .then((accepted) => { if (active) setConductVisible(!accepted); })
      // Storage should not prevent a member from entering their daily round.
      .catch(() => { if (active) setConductVisible(true); })
      .finally(() => { if (active) setConductCheckedFor(conductMemberId); });
    return () => { active = false; };
  }, [conductMemberId]);

  const acknowledgeConduct = useCallback(() => {
    setConductVisible(false);
    void acceptConduct(conductMemberId).catch(() => {
      // The current session remains acknowledged; the next launch can retry persistence.
    });
  }, [conductMemberId]);

  useEffect(() => {
    if (!roundId || introductionCount === undefined) return;
    trackProductEvent('daily_round_viewed', { introduction_count: introductionCount });
  }, [roundId, introductionCount]);

  // The fanned reveal, once per set. Waits for the conduct sheet so it is not
  // played behind it, unseen.
  useEffect(() => {
    if (!roundId || reducedMotion || conductCheckedFor !== conductMemberId || conductVisible || (introductionCount ?? 0) < 2) return;
    let cancelled = false;
    void hasSeenReveal(roundId).then((seen) => {
      if (!cancelled && !seen) setRevealing(true);
    });
    return () => { cancelled = true; };
  }, [conductCheckedFor, conductMemberId, conductVisible, introductionCount, reducedMotion, roundId]);

  const finishReveal = useCallback(() => {
    setRevealing(false);
    if (roundId) void markRevealSeen(roundId);
  }, [roundId]);

  // Tell the gate to look again; do not navigate. AuthGate owns where a member
  // belongs. When this screen navigated too, a brand-new member was caught
  // between them: the round fetched before they existed said "consent needed",
  // so this screen sent them to agree, and the gate, which knew they just had,
  // sent them straight back, forever, until React stopped the loop and their
  // first sight of the app was an error screen.
  useEffect(() => {
    if (emptyReason === 'legal_consent_required') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.legalConsent });
    }
  }, [emptyReason, queryClient]);

  // Use the exact server-generated end of this member's round. The scheduler
  // calculates that instant as their next Fajr with the shared astronomy code.
  const resetsAt = round?.expiresAt;
  const [countdown, setCountdown] = useState(() => countdownTo(resetsAt));
  useEffect(() => {
    setCountdown(countdownTo(resetsAt));
    if (!resetsAt) return;
    const timer = setInterval(() => {
      setCountdown(countdownTo(resetsAt));
    }, countdownTick(countdownTo(resetsAt)));
    return () => clearInterval(timer);
  }, [resetsAt]);

  const countdownLabel = !countdown
    ? null
    : countdown.done
      ? t('daily.newSetArriving')
      : countdown.hours > 0
        ? t('daily.newSetInHours', { hours: countdown.hours, minutes: countdown.minutes })
        : countdown.minutes > 0
          ? t('daily.newSetInMinutes', { minutes: countdown.minutes })
          : t('daily.newSetInSeconds');

  /**
   * Show Interest on one person. At the limit, nothing changes yet: the
   * member is asked who to swap out, so a choice is never dropped silently.
   */
  const handleToggle = useCallback(
    (id: string) => {
      const wasSelected = selected.includes(id);
      if (toggleSelect(id)) {
        if (!wasSelected) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      setDialog({ kind: 'swap', pendingId: id, swapOutId: selected[0] ?? null });
    },
    [selected, toggleSelect]
  );

  const confirmSwitch = useCallback(() => {
    if (dialog.kind === 'swap' && dialog.swapOutId) switchSelection(dialog.swapOutId, dialog.pendingId);
    setDialog(NO_DIALOG);
  }, [dialog, switchSelection]);

  /**
   * Sends the choices in the order given: the first is this member's first
   * choice. With more than one, they are asked which comes first rather than
   * the order they happened to tap being taken as a ranking.
   */
  const handleSubmit = useCallback(async (ordered: string[] = selected) => {
    setDialog(NO_DIALOG);
    if (!roundId) return;
    try {
      const mutual = await submit(roundId, ordered);
      if (mutual.length > 0 && mutual[0]) {
        router.push(`/match/${mutual[0]}`);
      }
    } catch {
      // A lost response may still have been committed: reload the set's real
      // state, so a send that went through shows as done rather than failed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
    }
  }, [queryClient, roundId, selected, submit]);

  const sendWithFirstChoice = useCallback(() => {
    if (dialog.kind !== 'first-choice' || !dialog.firstChoiceId) return;
    const first = dialog.firstChoiceId;
    void handleSubmit([first, ...selected.filter((id) => id !== first)]);
  }, [dialog, handleSubmit, selected]);

  /**
   * The card deck reports the exact profile it selected rather than only a
   * direction. This prevents rapid consecutive swipes from calculating from a
   * stale activeId and leaving the hero card and circle carousel one step apart.
   */
  const selectActiveIntroductionByProfileId = useCallback(
    (profileId: string) => {
      const introduction = live.find((item) => item.profile.id === profileId);
      if (introduction) setActive(introduction.id);
    },
    [live, setActive]
  );

  /** Opens the exact profile that is physically centred in the hero deck. */
  const openIntroductionByProfileId = useCallback(
    (profileId: string) => {
      const introduction = live.find((item) => item.profile.id === profileId);
      if (introduction) router.push(`/introduction/${introduction.id}`);
    },
    [live]
  );

  const presentation = resolveDailyPresentation({
    isLoading,
    conductReady: conductCheckedFor === conductMemberId,
    hasFetchError: !!error,
    round,
    emptyReason,
    owedCount: owedAll.length,
    profileReady: readinessQuery.data?.ready,
    narrowingCriterion,
    submitted,
  });

  switch (presentation.kind) {
    case 'loading':
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <LoadingState label={t('daily.loading')} />
        </DailyScrollScreen>
      );

    case 'fetch-error':
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <ErrorState
            title={t('daily.loadErrorTitle')}
            message={t('daily.loadErrorBody')}
            onRetry={refresh}
          />
        </DailyScrollScreen>
      );

    case 'owed-list': {
      // Someone is waiting on this member. No set until they have caught up.
      // Answering one refreshes the round, so this list shrinks as they reply.
      const names = listNames(owedAll.map((item) => item.name), localeTag);
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <View style={styles.readinessEmpty}>
            <EmptyState
              title={t('daily.owedListTitle', { names })}
              message={t('daily.owedListBody')}
            />
            {owedAll.map((item) => (
              <Button
                key={item.connectionId}
                label={t(item.step === 'questions' ? 'daily.owedPicksAction' : 'daily.owedAction', { name: item.name })}
                onPress={() => router.push(`/connection/${item.connectionId}/${item.step}`)}
              />
            ))}
          </View>
        </DailyScrollScreen>
      );
    }

    case 'profile-readiness': {
      // The same checklist as the profile, so a member sees exactly what is left
      // and that introductions start the moment it is done.
      const steps = readinessSteps(readinessQuery.data?.missing ?? [], headerProfile.data?.gender);
      const openStep = (step: ReadinessStep) =>
        router.push({ pathname: '/(tabs)/you', params: { tab: step === 'preferences' ? 'private' : 'profile' } });
      const next = steps.find((step) => !step.done);
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <View style={styles.readinessGate}>
            <Text variant="display" style={styles.gateTitle}>{t('readiness.gateTitle')}</Text>
            <View style={styles.gateCard}>
              <ReadinessChecklist steps={steps} lead={t('readiness.lead')} onPressStep={openStep} />
            </View>
            <Button
              label={next?.id === 'preferences' ? t('daily.finishPreferences') : t('daily.finishProfile')}
              onPress={() => openStep(next?.id ?? 'photo')}
            />
          </View>
        </DailyScrollScreen>
      );
    }

    case 'consent':
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <LoadingState label={t('legal.redirecting')} />
        </DailyScrollScreen>
      );

    // The same screen as the moment after choosing, so a reload looks the same.
    case 'server-complete':
      return <SetCompleteState waitingForConnection={false} nextFajrAt={round?.expiresAt ?? nextFajrAt} />;

    // A set that is built and simply has not opened yet; it is an ordinary wait
    // for the member's own dawn, not an empty matching result.
    case 'scheduled':
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <EmptyState
            title={t('daily.nextSetTitle')}
            message={
              nextSetCity
                ? t('daily.nextSetBody', { city: nextSetCity })
                : t('daily.nextSetBodyPlain')
            }
          />
          <FajrCountdown nextFajrAt={nextFajrAt} />
        </DailyScrollScreen>
      );

    case 'filters-too-narrow':
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <EmptyState
            title={t('daily.filtersTooNarrowTitle')}
            message={t('daily.filtersTooNarrowBody', {
              criterion: t(narrowingCriterionKey(presentation.criterion) ?? 'filters.ageRange'),
            })}
          />
        </DailyScrollScreen>
      );

    case 'empty-state': {
      const copy = {
        'awaiting-turn': ['daily.awaitingTurnTitle', 'daily.awaitingTurnBody'],
        'at-capacity': ['daily.atCapacityTitle', 'daily.atCapacityBody'],
        'matching-inputs': ['daily.matchingInputsUnavailableTitle', 'daily.matchingInputsUnavailableBody'],
      } as const;
      const [title, body] = copy[presentation.reason];
      return (
        <DailyScrollScreen isRTL={isRTL}>
          <DailyHeader />
          <EmptyState title={t(title)} message={t(body)} />
        </DailyScrollScreen>
      );
    }

    case 'first-set':
      return <FajrWaitState firstSet nextFajrAt={round?.expiresAt ?? nextFajrAt} />;

    case 'incomplete':
      return <FajrWaitState incomplete nextFajrAt={round?.expiresAt ?? nextFajrAt} />;

    // With no named status, including a legacy or sparse response, keep the
    // established least-revealing wait and countdown.
    case 'generic-wait':
      return <FajrWaitState nextFajrAt={round?.expiresAt ?? nextFajrAt} />;

    case 'local-complete':
      return <SetCompleteState waitingForConnection={waitingForConnection} nextFajrAt={round?.expiresAt ?? nextFajrAt} />;

    case 'live-cards':
      break;
  }

  const liveRound = presentation.round;

  const activeChosen = !!active && selected.includes(active.id);
  const nameOf = (id: string | null) =>
    live.find((item) => item.id === id)?.profile.firstName ?? '';
  const selectedIntroductions = selected
    .map((id) => live.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item);
  const canSelectAll = allowsSelectAll && live.length > 1 && selected.length < Math.min(keepLimit, live.length);
  const activeIndex = Math.max(0, live.findIndex((item) => item.id === activeId));

  return (
    <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
      <StretchScrollView
        style={styles.dailyScroll}
        contentContainerStyle={styles.dailyScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DailyHeader />

      <View style={[styles.headline, isRTL && styles.rowReverse]}>
        <View style={styles.headlineText}>
          {/* What this is, first; when it changes, underneath and quieter. */}
          <Text variant="display" style={styles.title}>
            {t(
              liveRound.introductions.length === 1
                ? 'daily.titleOne'
                : liveRound.introductions.length === 2
                  ? 'daily.titleTwo'
                  : 'daily.title',
              { count: liveRound.introductions.length }
            )}
          </Text>
          <Text variant="micro" style={styles.countdown}>
            {[
              liveRound.city ? t('daily.resetsIn', { city: liveRound.city }) : t('daily.resets'),
              countdownLabel,
            ].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      {submitError ? (
        <InlineNotice message={errorMessage({ message: submitError }, t, 'daily.submitError')} />
      ) : null}

      <ThinSetNotice criterion={thinCriterion} count={live.length} />

      <View style={styles.stage}>
        <Animated.View style={[styles.stageFill, revealing && styles.hidden]}>
          {active ? (
            <HeroCard
              profiles={live.map((item) => item.profile)}
              activeId={active.profile.id}
              chosen={activeChosen}
              chosenIds={live.filter((item) => selected.includes(item.id)).map((item) => item.profile.id)}
              corner={
                <SafetyControl
                  scope={{ kind: 'introduction', id: active.id }}
                  memberName={active.profile.firstName}
                  tone="dark"
                  onBlocked={() => void refresh()}
                />
              }
              onPress={openIntroductionByProfileId}
              onSwipe={selectActiveIntroductionByProfileId}
            />
          ) : null}

          {activeId ? (
            <ArcCarousel
              live={live}
              activeId={activeId}
              selectedIds={selected}
              onSelect={setActive}
              onOpen={(id) => router.push(`/introduction/${id}`)}
            />
          ) : null}
        </Animated.View>

        {revealing ? (
          <FanReveal
            profiles={live.map((item) => item.profile)}
            activeIndex={activeIndex}
            onDone={finishReveal}
          />
        ) : null}
      </View>

        <View style={styles.footer}>
        <View style={[styles.captionRow, wideLayout && styles.captionRowWide, isRTL && styles.rowReverse]}>
          <Text
            variant="caption"
            tone="whisper"
            style={[styles.captionText, wideLayout && styles.captionTextWide]}
          >
            {selected.length > 0
              ? t('daily.chosenOf', { count: selected.length, limit: Math.min(keepLimit, live.length) })
              : t('daily.chooseUpTo', { limit: Math.min(keepLimit, live.length) })}
          </Text>
          {selected.length === 0 ? (
            // Choosing nobody is a real answer, not something to be pushed past.
            <Pressable accessibilityRole="button" onPress={() => setDialog({ kind: 'nobody' })} hitSlop={8}>
              <Text variant="caption" style={styles.selectAll}>{t('daily.nobodyToday')}</Text>
            </Pressable>
          ) : null}
          {canSelectAll ? (
            <Pressable accessibilityRole="button" onPress={selectAll} hitSlop={8}>
              <Text variant="caption" style={styles.selectAll}>{t('daily.showInterestAll')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.actions, isRTL && styles.rowReverse]}>
          <Button
            testID={testIds.daily.select}
            label={activeChosen
              ? `✓ ${t('daily.interested')} ${selected.length}/${Math.min(keepLimit, live.length)}`
              : t('daily.select')}
            variant={activeChosen ? 'gold' : 'secondary'}
            disabled={!active}
            onPress={() => active && handleToggle(active.id)}
            style={styles.interestAction}
          />
          <Button
            testID={testIds.daily.primary}
            label={selected.length > 0 ? t('daily.sendCount', { count: selected.length }) : t('daily.sendInterest')}
            variant="primary"
            disabled={selected.length === 0}
            loading={submitting}
            onPress={() => {
              setDialog(selected.length > 1 ? { kind: 'first-choice', firstChoiceId: null } : { kind: 'confirm' });
            }}
            style={styles.primaryAction}
          />
        </View>
        </View>
      </StretchScrollView>

      <FirstChoiceDialog
        visible={dialog.kind === 'swap'}
        introductions={selectedIntroductions}
        selectedId={dialog.kind === 'swap' ? dialog.swapOutId : null}
        onSelect={(swapOutId) => setDialog((current) => current.kind === 'swap' ? { ...current, swapOutId } : current)}
        title={t('daily.limitTitle', { limit: keepLimit })}
        body={t('daily.limitBody', { name: nameOf(dialog.kind === 'swap' ? dialog.pendingId : null) })}
        confirmLabel={t('daily.switchSelection')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmSwitch}
        onCancel={closeDialog}
      />

      <ConfirmDialog
        visible={dialog.kind === 'confirm'}
        title={
          selected.length === 1
            ? t('daily.sendToName', { name: nameOf(selected[0] ?? null) })
            : t('daily.sendToCount', { count: selected.length })
        }
        body={t('daily.mutualOnly')}
        confirmLabel={t('daily.yesSend')}
        cancelLabel={t('daily.notYet')}
        onConfirm={() => void handleSubmit()}
        onCancel={closeDialog}
      />

      <FirstChoiceDialog
        visible={dialog.kind === 'first-choice'}
        introductions={selectedIntroductions}
        selectedId={dialog.kind === 'first-choice' ? dialog.firstChoiceId : null}
        onSelect={(firstChoiceId) => setDialog((current) => current.kind === 'first-choice' ? { ...current, firstChoiceId } : current)}
        body={t('daily.firstChoicePick')}
        cancelLabel={t('daily.notYet')}
        onConfirm={sendWithFirstChoice}
        onCancel={closeDialog}
      />

      <ConfirmDialog
        visible={dialog.kind === 'nobody'}
        title={t('daily.nobodyTodayTitle')}
        body={t('daily.nobodyTodayBody')}
        confirmLabel={t('daily.nobodyToday')}
        cancelLabel={t('daily.notYet')}
        onConfirm={() => void handleSubmit([])}
        onCancel={closeDialog}
      />

      <ConductAcknowledgement visible={conductVisible} onAccept={acknowledgeConduct} />
    </Screen>
  );
}

/**
 * The end of the round. Deliberately a dead end, no refresh, no "see more".
 * The reference is explicit that the empty state should close the session.
 */
/**
 * A large clock counting down to this member's own next Fajr, to the second:
 * HH:MM:SS under a small label.
 */
function FajrCountdown({ lead, nextFajrAt }: { lead?: string; nextFajrAt?: string | null }) {
  const scheduled = nextFajrAt ? new Date(nextFajrAt) : null;
  if (scheduled && Number.isFinite(scheduled.getTime())) {
    return <FajrCountdownClock lead={lead} nextFajr={scheduled} />;
  }
  return <CalculatedFajrCountdown lead={lead} />;
}

function CalculatedFajrCountdown({ lead }: { lead?: string }) {
  const nextFajr = useNextFajr();
  return <FajrCountdownClock lead={lead} nextFajr={nextFajr} />;
}

function FajrCountdownClock({ lead, nextFajr }: { lead?: string; nextFajr: Date | null }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!nextFajr) return null;
  const total = Math.max(0, Math.floor((nextFajr.getTime() - now) / 1000));
  if (total === 0) {
    return <Text variant="micro" center style={styles.completeCountdown}>{t('daily.newSetArriving')}</Text>;
  }
  const two = (value: number) => String(value).padStart(2, '0');
  const clock = `${two(Math.floor(total / 3600))}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;
  return (
    <View style={styles.fajrClock} accessibilityLabel={`${lead ?? t('daily.countdownLabel')} ${clock}`}>
      {lead
        ? <Text variant="body" center style={styles.fajrLead}>{lead}</Text>
        : <Text variant="micro" center>{t('daily.countdownLabel')}</Text>}
      <Text center style={styles.countdownClock}>{clock}</Text>
    </View>
  );
}

/**
 * No introduction fitted both sides today. A countdown to the member's next
 * Fajr, and on the phone apps a one-tap reminder: the Fajr notification says
 * the new set is ready and that it is time to pray.
 */
function FajrWaitState({ firstSet = false, incomplete = false, nextFajrAt }: { firstSet?: boolean; incomplete?: boolean; nextFajrAt?: string | null }) {
  const { t, isRTL, localeTag } = useI18n();
  const queryClient = useQueryClient();
  const native = Platform.OS !== 'web';
  const city = useQuery({ queryKey: queryKeys.profile('me'), queryFn: fetchMyProfile }).data?.city;
  const consentQuery = useQuery({
    queryKey: ['notification-consent'],
    queryFn: fetchMyNotificationConsent,
    enabled: native,
  });
  const [failed, setFailed] = useState(false);
  const [turningOn, setTurningOn] = useState(false);
  const turnOn = async () => {
    setTurningOn(true);
    setFailed(false);
    try {
      await enableMyNotifications(localeTag);
      await queryClient.invalidateQueries({ queryKey: ['notification-consent'] });
    } catch {
      setFailed(true);
    } finally {
      setTurningOn(false);
    }
  };
  return (
    <DailyScrollScreen isRTL={isRTL}>
      <DailyHeader />
      <Animated.View entering={FadeIn.duration(300)} style={styles.complete}>
        {/* "No one fitted" only when matching ran and found nobody. */}
        {firstSet ? null : (
          <Text variant="bodySmall" center style={styles.completeBody}>{t(incomplete ? 'daily.incompleteBody' : 'daily.waitBody')}</Text>
        )}
        {/* One sentence that runs straight into the clock. */}
        <FajrCountdown
          nextFajrAt={nextFajrAt}
          lead={firstSet
            ? (city ? t('daily.firstSetTitleCity', { city }) : t('daily.firstSetTitle'))
            : (city ? t('daily.nextAtFajrCity', { city }) : t('daily.nextAtFajr'))}
        />
        {!native ? (
          <Text variant="caption" center style={styles.completeBody}>{t('daily.remindersApp')}</Text>
        ) : consentQuery.data ? (
          <Text variant="label" center style={styles.completeBody}>✓ {t('daily.remindersOn')}</Text>
        ) : (
          <View style={styles.remind}>
            <Button label={t('daily.remindMe')} onPress={() => void turnOn()} loading={turningOn} />
            <Text variant="caption" center style={styles.completeBody}>{t('daily.remindMeNote')}</Text>
            {failed ? <InlineNotice message={t('daily.remindError')} /> : null}
          </View>
        )}
      </Animated.View>
    </DailyScrollScreen>
  );
}

function SetCompleteState({ waitingForConnection, nextFajrAt }: {
  waitingForConnection: boolean;
  nextFajrAt?: string | null;
}) {
  const { t, isRTL, localeTag } = useI18n();
  const city = useQuery({ queryKey: queryKeys.profile('me'), queryFn: fetchMyProfile }).data?.city;
  // The Fajr this member's next set arrives at, as a clock time in their own city.
  const calculated = useNextFajr();
  const scheduled = nextFajrAt ? new Date(nextFajrAt) : null;
  const fajr = scheduled && Number.isFinite(scheduled.getTime()) ? scheduled : calculated;
  const time = fajr ? new Intl.DateTimeFormat(localeTag, { hour: '2-digit', minute: '2-digit' }).format(fajr) : null;
  const lead = time
    ? (city ? t('daily.nextAtFajrCityAt', { city, time }) : t('daily.nextAtFajrAt', { time }))
    : (city ? t('daily.nextAtFajrCity', { city }) : t('daily.nextAtFajr'));
  return (
    <DailyScrollScreen isRTL={isRTL}>
      <DailyHeader />
      <Animated.View entering={FadeIn.duration(300)} style={styles.complete}>
        <Text variant="display" center style={styles.completeTitle}>
          {t('daily.completeTitle')}
        </Text>
        <FajrCountdown nextFajrAt={nextFajrAt} lead={lead} />
        {waitingForConnection ? <InlineNotice message={t('daily.waitingConnection')} /> : null}
      </Animated.View>
    </DailyScrollScreen>
  );
}

/**
 * The brand strip for every state of this tab. In demo mode (and for testers) a
 * reset button sits in its top right, beside the gear, so a test can start again
 * from any state, including once a set is complete.
 */
function DailyHeader() {
  const { t } = useI18n();
  const { reset } = useRound();
  const tester = useQuery({ queryKey: ['sample-members'], queryFn: fetchMySampleMembers });
  const show = USE_MOCKS || tester.data?.allowed;
  return (
    <BrandHeader
      trailing={show ? (
        <Pressable
          testID={testIds.daily.reset}
          accessibilityRole="button"
          accessibilityLabel={t('daily.demoResetLabel')}
          hitSlop={8}
          onPress={reset}
          style={styles.headerReset}
        >
          <ActionIcon name="refresh" size={15} color={color.muted} />
        </Pressable>
      ) : null}
    />
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  dailyScroll: { flex: 1 },
  dailyScrollContent: { flexGrow: 1, width: '100%' },
  remind: { width: '100%', maxWidth: 360, gap: 10, marginTop: 8 },
  fajrLead: { color: color.inkSoft, maxWidth: 420 },
  fajrClock: { alignItems: 'center', gap: 4, marginVertical: 18 },
  countdownClock: { fontFamily: font.display, fontSize: 52, lineHeight: 60, color: color.ink, fontVariant: ['tabular-nums'] },
  rowReverse: { flexDirection: 'row-reverse' },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headline: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 26,
    paddingTop: 6,
  },
  countdown: { color: color.faintest, marginTop: 6 },
  headlineText: { flex: 1 },
  title: { marginTop: 2 },
  headerReset: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.sandDeep,
    borderWidth: 1,
    borderColor: alpha.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.sandDeep,
    borderWidth: 1,
    borderColor: alpha.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Not clipped: tilted side cards sit lower than the centre one. The page
  // itself stops sideways scrolling (see +html.tsx).
  stage: { flex: 1, marginTop: 14, minHeight: 0 },
  stageFill: { flex: 1, minHeight: 0 },
  hidden: { opacity: 0 },

  footer: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    paddingHorizontal: 26,
    paddingTop: 6,
    gap: 8,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // The hint takes its own line; the quiet links sit beneath it, so neither is
  // squeezed into a narrow column on a phone.
  captionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 4 },
  captionText: { flexBasis: '100%' },
  captionRowWide: { justifyContent: 'space-between', columnGap: 10 },
  captionTextWide: { flex: 1, flexBasis: 'auto' },
  selectAll: { color: color.ink, textDecorationLine: 'underline' },
  interestAction: { flex: 1, paddingHorizontal: 10 },
  primaryAction: { flex: 1.2, paddingHorizontal: 10 },

  complete: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingHorizontal: 40,
  },
  completeCountdown: { color: color.gold, marginTop: 6 },
  completeTitle: { marginTop: 4 },
  completeBody: { maxWidth: 250 },
  completeReset: { marginTop: space.sm },
  readinessEmpty: { flex: 1, paddingHorizontal: 26, paddingBottom: 30 },
  readinessGate: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 18, paddingBottom: 30, gap: 18 },
  gateTitle: { fontSize: 30 },
  gateCard: { padding: 18, borderRadius: 20, backgroundColor: color.sand },
});

/** "Rukia", "Rukia and Salma", "Rukia, Salma and Amina", in the member's language. */
function listNames(names: string[], localeTag: string): string {
  try {
    return new Intl.ListFormat(localeTag, { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    return names.join(', ');
  }
}
