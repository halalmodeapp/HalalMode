import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useNextFajr } from '@/hooks/useNextFajr';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import type { NarrowingCriterion } from '@/lib/dailyRoundState';
import { fetchMySampleMembers } from '@/api/account';
import { fetchMyProfile, fetchMyProfileReadiness } from '@/api/profile';
import { trackProductEvent } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryClient';
import { acceptConduct, hasAcceptedConduct } from '@/lib/conductAcknowledgement';
import { countdownTo, countdownTick } from '@/lib/countdown';
import { hasSeenReveal, markRevealSeen } from '@/lib/revealSeen';
import { USE_MOCKS } from '@/lib/supabase';
import { testIds } from '@/lib/testIds';
import { useRound } from '@/state/round';
import { useAuth } from '@/state/auth';
import { useSession } from '@/state/session';
import { alpha, color, font, space } from '@/theme/tokens';
import { RTL_LAYOUT } from '@/lib/rtl';

/**
 * Names the criterion in the member's own words, matching the label on the
 * control they would go and change.
 */
const NARROWING_CRITERION_KEYS: Record<NarrowingCriterion, TranslationKey> = {
  age: 'filters.ageRange',
  height: 'filters.heightPlain',
  build: 'filters.bodyTypes',
  distance: 'filters.searchDistance',
  practice: 'filters.practice',
  timeline: 'filters.marriageTiming',
  children: 'filters.children',
  sect: 'filters.sect',
};

export default function DailyScreen() {
  const { t, isRTL } = useI18n();
  const queryClient = useQueryClient();
  // Testers get the reset button on the live app too, during this phase.
  const testerQuery = useQuery({ queryKey: ['sample-members'], queryFn: fetchMySampleMembers });
  const { user } = useAuth();
  const { tier } = useSession();
  const readinessQuery = useQuery({
    queryKey: queryKeys.profileReadiness,
    queryFn: fetchMyProfileReadiness,
    enabled: !USE_MOCKS,
  });
  const {
    round,
    emptyReason,
    narrowingCriterion,
    nextSetCity,
    owed,
    isLoading,
    error,
    refresh,
    live,
    activeId,
    active,
    keepLimit,
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
    reset,
    recordSoftSelect,
  } = useRound();

  const [confirmOpen, setConfirmOpen] = useState(false);
  // Someone the member tried to choose while already at their limit, and who
  // they are thinking of swapping out for them.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [swapOutId, setSwapOutId] = useState<string | null>(null);
  const [conductVisible, setConductVisible] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const reducedMotion = useReducedMotion();
  const roundId = round?.id;
  const introductionCount = round?.introductions.length;
  const conductMemberId = user?.id ?? 'mock-member';

  useEffect(() => {
    let active = true;
    void hasAcceptedConduct(conductMemberId)
      .then((accepted) => active && setConductVisible(!accepted))
      // Storage should not prevent a member from entering their daily round.
      .catch(() => active && setConductVisible(true));
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
    if (!roundId || reducedMotion || conductVisible || (introductionCount ?? 0) < 2) return;
    let cancelled = false;
    void hasSeenReveal(roundId).then((seen) => {
      if (!cancelled && !seen) setRevealing(true);
    });
    return () => { cancelled = true; };
  }, [conductVisible, introductionCount, reducedMotion, roundId]);

  const finishReveal = useCallback(() => {
    setRevealing(false);
    if (roundId) void markRevealSeen(roundId);
  }, [roundId]);

  // Tell the gate to look again; do not navigate. AuthGate owns where a member
  // belongs. When this screen navigated too, a brand-new member was caught
  // between them: the round fetched before they existed said "consent needed",
  // so this screen sent them to agree, and the gate — which knew they just had —
  // sent them straight back, forever, until React stopped the loop and their
  // first sight of the app was an error screen.
  useEffect(() => {
    if (emptyReason === 'legal_consent_required') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.legalConsent });
    }
  }, [emptyReason, queryClient]);

  // Under "resets at Fajr in London": yes, but when. Re-reads once a minute
  // until the last minute, so the phone is not woken every second for a number
  // that has not changed.
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
      setPendingId(id);
      setSwapOutId(selected[0] ?? null);
    },
    [selected, toggleSelect]
  );

  const confirmSwitch = useCallback(() => {
    if (pendingId && swapOutId) switchSelection(swapOutId, pendingId);
    setPendingId(null);
    setSwapOutId(null);
  }, [pendingId, swapOutId, switchSelection]);

  const handleSubmit = useCallback(async () => {
    setConfirmOpen(false);
    // Before the choices land, so the reading that produced it is still what
    // the round looked like. Swallows its own failures.
    await recordSoftSelect();
    try {
      const mutual = await submit(selected);
      if (mutual.length > 0 && mutual[0]) {
        router.push(`/match/${mutual[0]}`);
      }
    } catch {
      // The provider keeps the round open and exposes an actionable error.
    }
  }, [recordSoftSelect, selected, submit]);

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

  if (isLoading) {
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <LoadingState label={t('daily.loading')} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <ErrorState
          title={t('daily.loadErrorTitle')}
          message={t('daily.loadErrorBody')}
          onRetry={refresh}
        />
      </Screen>
    );
  }

  // Someone is waiting on this member. No set until they have caught up.
  if (emptyReason === 'answers_owed' && owed) {
    const picks = owed.step === 'questions';
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <View style={styles.readinessEmpty}>
          <EmptyState
            title={t(picks ? 'daily.owedPicksTitle' : 'daily.owedTitle', { name: owed.name })}
            message={t(picks ? 'daily.owedPicksBody' : 'daily.owedBody')}
          />
          <Button
            label={t(picks ? 'daily.owedPicksAction' : 'daily.owedAction', { name: owed.name })}
            onPress={() => router.push(`/connection/${owed.connectionId}/${owed.step}`)}
          />
        </View>
      </Screen>
    );
  }

  if (
    (!round || round.introductions.length === 0)
    && (emptyReason === 'profile_not_ready' || (readinessQuery.data && !readinessQuery.data.ready))
  ) {
    const missingReadinessItems = readinessQuery.data?.missing ?? [];
    const onlyPreferencesMissing = missingReadinessItems.length === 1
      && missingReadinessItems[0] === 'preferences';
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <View style={styles.readinessEmpty}>
          <EmptyState
            title={onlyPreferencesMissing ? t('daily.readinessPrefsTitle') : t('daily.readinessTitle')}
            message={onlyPreferencesMissing ? t('daily.readinessPrefsBody') : t('daily.readinessBody')}
          />
          <Button
            label={onlyPreferencesMissing ? t('daily.finishPreferences') : t('daily.finishProfile')}
            onPress={() => router.push({ pathname: '/(tabs)/you', params: { tab: onlyPreferencesMissing ? 'private' : 'profile' } })}
          />
        </View>
      </Screen>
    );
  }

  if (emptyReason === 'legal_consent_required') {
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <LoadingState label={t('legal.redirecting')} />
      </Screen>
    );
  }

  // The same screen as the moment after choosing, so a reload looks the same.
  if (emptyReason === 'set_complete' && (!round || round.introductions.length === 0)) {
    return <SetCompleteState onReset={reset} waitingForConnection={false} />;
  }

  if (!round || round.introductions.length === 0) {
    const matchingInputsUnavailable = emptyReason === 'matching_inputs_unavailable';
    const awaitingTurn = emptyReason === 'awaiting_turn';
    const atMatchCapacity = emptyReason === 'at_match_capacity';
    // Only shown when the server named a criterion. Without one the message
    // would ask a member to loosen something without saying what, which is
    // worse than the established wording.
    const filtersTooNarrow =
      emptyReason === 'filters_too_narrow' && narrowingCriterion !== null;

    // A set that is built and simply has not opened yet. Every other message
    // below describes something being wrong; this one is a member waiting for
    // their own dawn, which is the app working exactly as intended.
    if (emptyReason === 'next_set_scheduled') {
      return (
        <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
          <BrandHeader />
          <EmptyState
            title={t('daily.nextSetTitle')}
            message={
              nextSetCity
                ? t('daily.nextSetBody', { city: nextSetCity })
                : t('daily.nextSetBodyPlain')
            }
          />
        </Screen>
      );
    }

    if (filtersTooNarrow) {
      return (
        <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
          <BrandHeader />
          <EmptyState
            title={t('daily.filtersTooNarrowTitle')}
            message={t('daily.filtersTooNarrowBody', {
              criterion: t(NARROWING_CRITERION_KEYS[narrowingCriterion]),
            })}
          />
        </Screen>
      );
    }

    const emptyTitle = awaitingTurn
      ? 'daily.awaitingTurnTitle'
      : atMatchCapacity
        ? 'daily.atCapacityTitle'
        : matchingInputsUnavailable
          ? 'daily.matchingInputsUnavailableTitle'
          : 'daily.noSuitableTitle';
    const emptyBody = awaitingTurn
      ? 'daily.awaitingTurnBody'
      : atMatchCapacity
        ? 'daily.atCapacityBody'
        : matchingInputsUnavailable
          ? 'daily.matchingInputsUnavailableBody'
          : 'daily.noSuitableBody';
    return (
      <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
        <BrandHeader />
        <EmptyState
          title={t(emptyTitle)}
          message={t(emptyBody)}
        />
      </Screen>
    );
  }

  if (submitted) {
    return <SetCompleteState onReset={reset} waitingForConnection={waitingForConnection} />;
  }

  const activeChosen = !!active && selected.includes(active.id);
  const nameOf = (id: string | null) =>
    live.find((item) => item.id === id)?.profile.firstName ?? '';
  const selectedIntroductions = selected
    .map((id) => live.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item);
  const canSelectAll = tier === 'premium' && live.length > 1 && selected.length < Math.min(keepLimit, live.length);
  const activeIndex = Math.max(0, live.findIndex((item) => item.id === activeId));

  return (
    <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
      <BrandHeader />

      <View style={[styles.headline, isRTL && styles.rowReverse]}>
        <View style={styles.headlineText}>
          {/* What this is, first; when it changes, underneath and quieter. */}
          <Text variant="display" style={styles.title}>
            {t(
              round.introductions.length === 1
                ? 'daily.titleOne'
                : round.introductions.length === 2
                  ? 'daily.titleTwo'
                  : 'daily.title',
              { count: round.introductions.length }
            )}
          </Text>
          <Text variant="micro" style={styles.countdown}>
            {[
              round.city ? t('daily.resetsIn', { city: round.city }) : t('daily.resets'),
              countdownLabel,
            ].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {USE_MOCKS || testerQuery.data?.allowed ? (
          <Pressable
            testID={testIds.daily.reset}
            accessibilityRole="button"
            accessibilityLabel={t('daily.demoResetLabel')}
            onPress={reset}
            style={styles.resetButton}
          >
            <Text style={styles.resetGlyph}>↺</Text>
          </Pressable>
        ) : null}
      </View>

      {submitError ? (
        <InlineNotice message={t('daily.submitError')} />
      ) : null}

      <View style={styles.stage}>
        <Animated.View style={[styles.stageFill, revealing && styles.hidden]}>
          {active ? (
            <HeroCard
              profiles={live.map((item) => item.profile)}
              activeId={active.profile.id}
              popMode={false}
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
        <View style={[styles.captionRow, isRTL && styles.rowReverse]}>
          <Text variant="caption" tone="whisper" style={styles.captionText}>
            {selected.length > 0
              ? t('daily.chosenOf', { count: selected.length, limit: Math.min(keepLimit, live.length) })
              : t('daily.chooseUpTo', { limit: Math.min(keepLimit, live.length) })}
          </Text>
          {canSelectAll ? (
            <Pressable accessibilityRole="button" onPress={selectAll} hitSlop={8}>
              <Text variant="caption" style={styles.selectAll}>{t('daily.showInterestAll')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.actions, isRTL && styles.rowReverse]}>
          <Button
            testID={testIds.daily.pop}
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
            onPress={() => setConfirmOpen(true)}
            style={styles.primaryAction}
          />
        </View>
      </View>

      <FirstChoiceDialog
        visible={pendingId !== null}
        introductions={selectedIntroductions}
        selectedId={swapOutId}
        onSelect={setSwapOutId}
        title={t('daily.limitTitle', { limit: keepLimit })}
        body={t('daily.limitBody', { name: nameOf(pendingId) })}
        confirmLabel={t('daily.switchSelection')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmSwitch}
        onCancel={() => {
          setPendingId(null);
          setSwapOutId(null);
        }}
      />

      <ConfirmDialog
        visible={confirmOpen}
        title={
          selected.length === 1
            ? t('daily.sendToName', { name: nameOf(selected[0] ?? null) })
            : t('daily.sendToCount', { count: selected.length })
        }
        body={t('daily.mutualOnly')}
        confirmLabel={t('daily.yesSend')}
        cancelLabel={t('daily.notYet')}
        onConfirm={() => void handleSubmit()}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConductAcknowledgement visible={conductVisible} onAccept={acknowledgeConduct} />
    </Screen>
  );
}

/**
 * The end of the round. Deliberately a dead end — no refresh, no "see more".
 * The reference is explicit that the empty state should close the session.
 */
function SetCompleteState({ onReset, waitingForConnection }: { onReset: () => void; waitingForConnection: boolean }) {
  const { t, isRTL } = useI18n();
  // Counts down to this member's own next Fajr, from where they are now.
  // The member's own city is the fallback when the device will not say.
  const profileQuery = useQuery({ queryKey: queryKeys.profile('me'), queryFn: fetchMyProfile });
  const nextFajr = useNextFajr(profileQuery.data?.city);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const left = countdownTo(nextFajr?.toISOString(), now);
  const nextLabel = !left
    ? null
    : left.done
      ? t('daily.newSetArriving')
      : left.hours > 0
        ? t('daily.newSetInHours', { hours: left.hours, minutes: left.minutes })
        : left.minutes > 0
          ? t('daily.newSetInMinutes', { minutes: left.minutes })
          : t('daily.newSetInSeconds');
  return (
    <Screen withTabBar style={isRTL ? styles.rtl : undefined}>
      <BrandHeader />
      <Animated.View entering={FadeIn.duration(300)} style={styles.complete}>
        <Text variant="micro">{t('daily.completeLabel')}</Text>
        <Text variant="display" center style={styles.completeTitle}>
          {t('daily.completeTitle')}
        </Text>
        <Text variant="bodySmall" center style={styles.completeBody}>
          {t('daily.completeBody')}
        </Text>
        {nextLabel ? (
          <Text variant="micro" center style={styles.completeCountdown}>
            {nextLabel}
          </Text>
        ) : null}
        {waitingForConnection ? <InlineNotice message={t('daily.waitingConnection')} /> : null}
        {USE_MOCKS ? (
          <Button
            label={t('daily.demoAgain')}
            variant="quiet"
            onPress={onReset}
            style={styles.completeReset}
          />
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
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
  resetGlyph: { fontFamily: font.body, fontSize: 14, color: color.muted },

  // Cards may reach the window's edge but never past it: without this the
  // neighbours made the whole page scroll sideways on a narrow screen.
  stage: { flex: 1, marginTop: 14, minHeight: 0, overflow: 'hidden' },
  stageFill: { flex: 1, minHeight: 0 },
  hidden: { opacity: 0 },

  footer: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    paddingHorizontal: 26,
    paddingTop: 6,
    gap: 8,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  captionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  captionText: { flex: 1 },
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
});
