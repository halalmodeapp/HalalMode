import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { fetchMyReferralProgress, type ReferralProgress } from '@/api/referrals';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import { queryKeys } from '@/lib/queryClient';
import { referralTiers, type ReferralTier } from '@/lib/referralTiers';
import { showNotice } from '@/lib/notice';
import { alpha, color, font, layout, radius, space } from '@/theme/tokens';

function rewardLabel(goal: number): TranslationKey {
  return goal === 3 ? 'referrals.reward3' : goal === 5 ? 'referrals.reward5' : 'referrals.reward10';
}

/**
 * The member's one referral link, its code, and their progress: the same
 * numbers halalmo.de/refer shows. Every signed-in member has a link here, with
 * no email step; if they joined the waitlist first, it is that same link.
 */
export default function ReferralsScreen() {
  const { t } = useI18n();
  const query = useQuery({ queryKey: queryKeys.referralProgress, queryFn: fetchMyReferralProgress });

  return (
    <Screen>
      <ScreenHeader />
      {query.isPending ? (
        <LoadingState label={t('common.loading')} />
      ) : query.isError ? (
        <ErrorState message={t('profile.connectionError')} onRetry={() => void query.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.column}>
            <Text variant="display">{t('referrals.title')}</Text>
            <Text variant="body" style={styles.intro}>{t('referrals.intro')}</Text>
            {query.data.state === 'verified' ? (
              <ShareCard progress={query.data} />
            ) : (
              <ErrorState message={t('profile.connectionError')} onRetry={() => void query.refetch()} />
            )}
            <View style={styles.tiers} accessibilityLabel={t('referrals.title')}>
              {referralTiers(query.data.state === 'verified' ? query.data.referralCount : null).map((tier) => (
                <TierCard key={tier.goal} tier={tier} known={query.data.state === 'verified'} />
              ))}
            </View>
            <Text variant="caption" style={styles.note}>{t('referrals.note')}</Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function ShareCard({ progress }: { progress: Extract<ReferralProgress, { state: 'verified' }> }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = progress.referralUrl;
  const message = t('referrals.shareMessage', { url });
  const reward =
    progress.rewardMonths === 1
      ? t('referrals.rewardMonth1')
      : progress.rewardMonths > 1
        ? t('referrals.rewardMonths', { months: progress.rewardMonths })
        : null;

  // There is no clipboard module in the native build, so on a phone this
  // opens the share sheet, which has Copy alongside every app.
  const canCopy = Platform.OS === 'web';
  const copy = async () => {
    if (!canCopy) {
      await Share.share({ message }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Older browsers and embedded views refuse the async clipboard; the
      // website falls back the same way.
      if (copyWithSelection(url)) setCopied(true);
      else showNotice(t('referrals.linkLabel'), url);
    }
  };

  return (
    <View style={styles.card}>
      <Text variant="displaySmall">{t('referrals.linkTitle')}</Text>
      {reward ? <Text variant="bodySmall" style={styles.reward}>{reward}</Text> : null}
      <Text variant="micro" style={styles.linkLabel}>{t('referrals.linkLabel')}</Text>
      <View style={styles.linkBox}>
        <Text selectable style={styles.linkText} accessibilityLabel={t('referrals.linkLabel')}>
          {url}
        </Text>
      </View>
      {/* For a friend who installs the app from the store, where the link's code is lost. */}
      <Text variant="bodySmall" style={styles.codeLine}>
        {t('referrals.codeLabel')} <Text selectable style={styles.codeText}>{progress.referralCode}</Text>
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? t('referrals.copied') : canCopy ? t('referrals.copy') : t('referrals.share')}
          onPress={() => void copy()}
          style={({ pressed }) => [styles.pill, styles.copyPill, copied && styles.copiedPill, pressed && styles.pressed]}
        >
          <Text style={styles.pillLabel}>
            {copied ? `✓ ${t('referrals.copied')}` : canCopy ? t('referrals.copy') : t('referrals.share')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('referrals.whatsapp')}
          onPress={() =>
            void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => undefined)
          }
          style={({ pressed }) => [styles.pill, styles.whatsappPill, pressed && styles.pressed]}
        >
          <Text style={styles.pillLabel}>{t('referrals.whatsapp')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function copyWithSelection(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

function TierCard({ tier, known }: { tier: ReferralTier; known: boolean }) {
  const { t } = useI18n();
  const reached = tier.state === 'reached';
  const current = tier.state === 'current';
  return (
    <View style={[styles.tier, current && styles.tierCurrent]}>
      <Text variant="label" style={styles.tierLabel}>{t(rewardLabel(tier.goal))}</Text>
      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.round(tier.fill * 100)}%` },
            current && styles.barFillCurrent,
          ]}
        />
      </View>
      {known ? (
        <Text style={[styles.tierCount, reached && styles.tierCountReached, current && styles.tierCountCurrent]}>
          {reached ? '✓ ' : ''}
          {t('referrals.tierCount', { joined: tier.joined, goal: tier.goal })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  codeLine: { marginTop: space.xs, color: color.inkSoft },
  codeText: { fontFamily: font.bodySemi, color: color.ink, letterSpacing: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: space.xxl * 2 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: space.lg },
  intro: { color: color.inkSoft },
  card: {
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.white,
  },
  reward: { color: color.muted },
  linkLabel: { marginTop: space.xs },
  linkBox: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: color.sandLight,
    borderWidth: 1,
    borderColor: alpha.lineFaint,
  },
  linkText: { fontFamily: font.bodyMedium, fontSize: 15, color: color.ink, writingDirection: 'ltr', textAlign: 'left' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    flexGrow: 1,
    minHeight: 46,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyPill: { backgroundColor: color.ink },
  copiedPill: { backgroundColor: color.green },
  whatsappPill: { backgroundColor: '#25D366' },
  pressed: { opacity: 0.85 },
  pillLabel: { fontFamily: font.bodySemi, fontSize: 15, color: color.white },
  tiers: { gap: space.sm },
  tier: {
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: alpha.line,
    backgroundColor: color.sand,
  },
  tierCurrent: {
    borderColor: 'rgba(252,60,108,0.45)',
    backgroundColor: color.white,
    shadowColor: color.halalPink,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  tierLabel: { color: color.inkSoft },
  bar: {
    height: 6,
    marginTop: space.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(184,145,79,0.16)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.gold },
  barFillCurrent: { backgroundColor: color.halalPink },
  tierCount: { marginTop: space.xs + 2, fontFamily: font.bodySemi, fontSize: 12.5, color: color.label },
  tierCountReached: { color: color.gold },
  tierCountCurrent: { color: color.halalPinkDeep },
  note: { color: color.faint, textAlign: 'center' },
});
