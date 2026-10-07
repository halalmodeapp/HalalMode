import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { fetchMyReadReceipts, fetchMySampleMembers, requestAccountDeletion, setMyReadReceipts, setMySampleMembers, setMyTestPremium, setProfilePaused } from '@/api/account';
import { disableMyNotifications, enableMyNotifications, fetchMyNotificationConsent } from '@/api/notifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineNotice } from '@/components/ui/AsyncState';
import { PermissionExplainer } from '@/components/ui/PermissionExplainer';
import { Text } from '@/components/ui/Text';
import { ModerationSheet } from '@/components/safety/ModerationSheet';
import { BlockedMembersSheet } from '@/components/you/BlockedMembersSheet';
import { useI18n } from '@/i18n';
import { LanguageSheet } from '@/components/ui/LanguageSheet';
import { localeName } from '@/i18n/locales';
import { useSession } from '@/state/session';
import { PremiumLogo } from '@/components/brand/PremiumLogo';
import { SurfaceToneProvider } from '@/theme/tone';
import { useAuth } from '@/state/auth';
import { useFeatureFlags } from '@/state/featureFlags';
import { USE_MOCKS } from '@/lib/supabase';
import { testIds } from '@/lib/testIds';
import { queryKeys } from '@/lib/queryClient';
import { alpha, color, font, radius, space } from '@/theme/tokens';
import { TIER_LIMITS, type Profile } from '@/types';
import { RTL_LAYOUT } from '@/lib/rtl';
import { showNotice } from '@/lib/notice';
import { useToast } from '@/state/toast';
import { useRound } from '@/state/round';

export function SettingsTab({
  liveCount,
  openConnections,
  profilePaused,
}: {
  liveCount: number;
  openConnections: number;
  profilePaused: boolean;
}) {
  const { t, isRTL, localeTag, nativeRestartRequired } = useI18n();
  const { tier, setTier, language } = useSession();
  const [languageOpen, setLanguageOpen] = useState(false);
  const { signOut } = useAuth();
  const { pushNotifications } = useFeatureFlags();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { reset: resetRound } = useRound();
  const [paused, setPaused] = useState(profilePaused);
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const [premiumConfirm, setPremiumConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [notificationsExplainer, setNotificationsExplainer] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  /** Security and account each open as their own page within Settings. */
  const testPremium = useMutation({
    mutationFn: setMyTestPremium,
    onSuccess: (_, enabled) => {
      setTier(enabled ? 'premium' : 'free');
      void queryClient.invalidateQueries({ queryKey: queryKeys.preferences });
      toast.show(`✓ ${t('filters.saved')}`);
    },
  });
  const sampleMembersQuery = useQuery({ queryKey: ['sample-members'], queryFn: fetchMySampleMembers });
  const sampleMembers = useMutation({
    mutationFn: setMySampleMembers,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sample-members'] });
      toast.show(`✓ ${t('filters.saved')}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.round });
    },
  });
  const [page, setPage] = useState<'main' | 'security' | 'account'>('main');
  const limits = TIER_LIMITS[tier];
  const isPremium = tier === 'premium';
  const notificationsQuery = useQuery({
    queryKey: ['notification-consent'],
    queryFn: fetchMyNotificationConsent,
    enabled: pushNotifications && !USE_MOCKS,
  });
  const notifications = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) await enableMyNotifications(localeTag);
      else await disableMyNotifications();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-consent'] });
      toast.show(`✓ ${t('filters.saved')}`);
    },
    onError: (error) => {
      const code = error instanceof Error ? error.message : '';
      const key = code === 'permission_denied'
        ? 'settings.notificationPermissionBody'
        : code === 'unsupported_device'
          ? 'settings.notificationDeviceBody'
          : code === 'unsupported_runtime'
            ? 'settings.notificationBuildBody'
          : 'settings.notificationErrorBody';
      showNotice(t('settings.notificationErrorTitle'), t(key));
    },
  });
  const readReceiptsQuery = useQuery({
    queryKey: ['read-receipts'],
    queryFn: fetchMyReadReceipts,
    enabled: !USE_MOCKS,
  });
  const readReceipts = useMutation({
    mutationFn: setMyReadReceipts,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['read-receipts'] });
      toast.show(`✓ ${t('filters.saved')}`);
    },
    onError: () => showNotice(t('settings.activityErrorTitle'), t('settings.activityErrorBody')),
  });
  const premiumFeatures = [
    t('settings.premium.f1'),
    t('settings.premium.f2'),
    t('settings.premium.f4'),
    t('profile.travelMode'),
  ];

  useEffect(() => setPaused(profilePaused), [profilePaused]);

  const confirmPause = async () => {
    const next = !paused;
    try {
      await setProfilePaused(next);
      setPaused(next);
      toast.show(`✓ ${t('filters.saved')}`);
      queryClient.setQueryData<Profile>(queryKeys.profile('me'), (current) =>
        current ? { ...current, isPaused: next } : current
      );
      setPauseConfirm(false);
    } catch {
      showNotice(t('settings.pauseErrorTitle'), t('settings.pauseErrorBody'));
    }
  };

  const confirmDeletion = async () => {
    try {
      await requestAccountDeletion();
      setDeleteConfirm(false);
      await signOut();
    } catch {
      showNotice(t('settings.deleteErrorTitle'), t('settings.deleteErrorBody'));
    }
  };

  return (
    <View style={[styles.wrap, isRTL && styles.rtl]}>
      {page === 'main' ? (
        <View style={styles.stack}>
        <View style={styles.stack}>
      <Section eyebrow={t('settings.preferences')} title={t('settings.preferencesTitle')}>
        <SettingRow
          title={`🌐  ${t('settings.language')}`}
          subtitle={localeName(language)}
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.switchLanguage')}
              onPress={() => setLanguageOpen(true)}
              style={styles.languagePill}
            >
              <Text style={styles.languagePillLabel}>🌐 {t('settings.change')}</Text>
            </Pressable>
          }
        />
        <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
        {nativeRestartRequired ? (
          <Text accessibilityRole="alert" variant="caption" style={styles.restartNotice}>
            {t('settings.restartRequired')}
          </Text>
        ) : null}
        <SettingRow
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsBody')}
          value={notificationsQuery.data ?? false}
          testID={testIds.settings.notifications}
          disabled={!pushNotifications || notifications.isPending || notificationsQuery.isPending || notificationsQuery.isError}
          // Turning them on asks why first; turning them off is immediate. A
          // member switching something off has already decided, and stopping
          // them to explain would only be an obstacle.
          onValueChange={(enabled) => {
            if (enabled) setNotificationsExplainer(true);
            else notifications.mutate(false);
          }}
          badge={!pushNotifications ? t('settings.comingLater') : undefined}
        />
        <PermissionExplainer
          visible={notificationsExplainer}
          eyebrow={t('permission.notifications.eyebrow')}
          title={t('permission.notifications.title')}
          body={t('permission.notifications.body')}
          points={[
            t('permission.notifications.p1'),
            t('permission.notifications.p2'),
            t('permission.notifications.p3'),
          ]}
          reassurance={t('permission.notifications.reassurance')}
          continueLabel={t('permission.continue')}
          cancelLabel={t('permission.notNow')}
          onContinue={() => {
            setNotificationsExplainer(false);
            notifications.mutate(true);
          }}
          onCancel={() => setNotificationsExplainer(false)}
          testID={testIds.settings.notificationExplainer}
        />
        {notificationsQuery.isError ? (
          <InlineNotice
            message={t('settings.notificationLoadError')}
            actionLabel={t('common.tryAgain')}
            onAction={() => void notificationsQuery.refetch()}
          />
        ) : null}
      </Section>

      <Section
        eyebrow={t('settings.privacy')}
        title={t('settings.privacyTitle')}
      >
        <SettingRow
          title={t('settings.visibility')}
          subtitle={t('settings.visibilityBody')}
          badge={t('settings.alwaysOn')}
        />
        <SettingRow
          title={t('settings.activity')}
          subtitle={t('settings.activityBody')}
          value={readReceiptsQuery.data ?? true}
          testID={testIds.settings.readReceipts}
          disabled={readReceipts.isPending || readReceiptsQuery.isPending || readReceiptsQuery.isError}
          onValueChange={(enabled) => readReceipts.mutate(enabled)}
        />
        {readReceiptsQuery.isError ? (
          <InlineNotice
            message={t('settings.activityLoadError')}
            actionLabel={t('common.tryAgain')}
            onAction={() => void readReceiptsQuery.refetch()}
          />
        ) : null}
        <SettingRow
          title={t('settings.photos')}
          subtitle={t('settings.photosBody')}
          trailing={<Text style={styles.lockGlyph}>○</Text>}
        />
      </Section>

      </View>
      <View style={styles.stack}>
      {/* One Premium card: what it is, what it adds, and what it never does. */}
      <Card tone="dark" style={styles.premiumCard}>
        <View style={[styles.premiumDetailsHead, isRTL && styles.rowReverse]}>
          <View>
            <Text style={styles.premiumLabel}>{t('settings.membership')}</Text>
            <View style={styles.premiumTitle}>
              <SurfaceToneProvider tone="dark">
                <PremiumLogo width={170} />
              </SurfaceToneProvider>
            </View>
          </View>
          <View style={[styles.planBadge, isPremium && styles.planBadgeActive]}>
            <Text style={[styles.planBadgeLabel, isPremium && styles.planBadgeLabelActive]}>
              {isPremium ? t('settings.active') : t('settings.preview')}
            </Text>
          </View>
        </View>
        <View style={styles.featureList}>
          {premiumFeatures.map((feature) => (
            <View key={feature} style={[styles.featureRow, isRTL && styles.rowReverse]}>
              <Text style={styles.featureMark}>✦</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <Text variant="caption" style={styles.premiumUnavailable}>
          {t('settings.premiumPrivacy')}
        </Text>
        {USE_MOCKS ? (
          <Button
            label={isPremium ? t('settings.managePremium') : t('settings.explorePremium')}
            variant="onDark"
            onPress={() => setPremiumConfirm(true)}
          />
        ) : (
          <Text variant="caption" style={styles.premiumUnavailable}>
            {t('settings.purchaseUnavailable')}
          </Text>
        )}
      </Card>

      <Section eyebrow={t('settings.account')} title={t('settings.accountTitle')}>
        <SettingRow
          title={t('settings.manageAccount')}
          subtitle={t('settings.manageAccountBody')}
          trailing={<Disclosure label={t('settings.manageAccount')} onPress={() => setPage('account')} />}
        />
        <SettingRow
          title={t('settings.security')}
          subtitle={t('settings.securityBody')}
          trailing={<Disclosure label={t('settings.security')} onPress={() => setPage('security')} />}
        />
      </Section>

        </View>
        </View>
      ) : null}

      {page === 'security' ? (
        <>
          <BackRow onPress={() => setPage('main')} />
      <Section eyebrow={t('settings.safety')} title={t('settings.safetyTitle')}>
        <SettingRow
          title={t('settings.contacts')}
          subtitle={t('settings.contactsBody')}
          badge={t('settings.comingLater')}
        />
        <SettingRow
          title={t('settings.blocked')}
          subtitle={t('settings.blockedBody')}
          trailing={
            <Pressable
              testID={testIds.settings.blocked}
              accessibilityRole="button"
              accessibilityLabel={t('settings.blocked')}
              onPress={() => setBlockedOpen(true)}
              style={styles.disclosure}
            >
              <Text style={styles.arrow}>{isRTL ? '←' : '→'}</Text>
            </Pressable>
          }
        />
        <SettingRow
          title={t('settings.reporting')}
          subtitle={t('settings.reportingBody')}
          trailing={
            <Pressable
              testID={testIds.settings.moderation}
              accessibilityRole="button"
              accessibilityLabel={t('settings.reporting')}
              onPress={() => setModerationOpen(true)}
              style={styles.disclosure}
            >
              <Text style={styles.arrow}>{isRTL ? '←' : '→'}</Text>
            </Pressable>
          }
        />
        <ModerationSheet visible={moderationOpen} onClose={() => setModerationOpen(false)} />
      </Section>

        </>
      ) : null}

      {page === 'account' ? (
        <>
          <BackRow onPress={() => setPage('main')} />
      <Section eyebrow={t('settings.account')} title={t('settings.accountTitle')}>
        <SettingRow
          title={paused ? t('settings.paused') : t('settings.pause')}
          subtitle={
            paused
              ? t('settings.pausedBody')
              : t('settings.pauseBody')
          }
          value={paused}
          onValueChange={() => setPauseConfirm(true)}
        />
        <View style={styles.paceCard}>
          <Text variant="micro">{t('settings.today')}</Text>
          <Text variant="body" style={styles.paceBody}>
            {t('settings.activityCount', {
              live: liveCount,
              introLimit: limits.introductions,
              open: openConnections,
              connectionLimit: limits.openConnections,
            })}
          </Text>
        </View>
        <SettingRow
          title={t('settings.support')}
          subtitle={t('settings.supportBody')}
          trailing={
            <Button
              testID={testIds.settings.support}
              label={t('settings.supportAction')}
              variant="quiet"
              onPress={() => {
                // A real address rather than a ticketing system. The Terms and
                // the Privacy Notice both tell members to write here, and both
                // promise a person reads it — so this has to go somewhere a
                // person actually is.
                void Linking.openURL(
                  `mailto:hello@halalmo.de?subject=${encodeURIComponent(t('settings.supportSubject'))}`
                ).catch(() => showNotice(t('settings.support'), t('settings.supportFallback')));
              }}
            />
          }
        />
        {sampleMembersQuery.data?.allowed ? (
          <SettingRow
            title={t('settings.sampleMembers')}
            subtitle={t('settings.sampleMembersBody')}
            value={sampleMembers.isPending ? sampleMembers.variables : sampleMembersQuery.data.enabled}
            disabled={sampleMembers.isPending}
            onValueChange={(enabled) => sampleMembers.mutate(enabled)}
          />
        ) : null}
        {sampleMembersQuery.data?.allowed ? (
          <SettingRow
            title={t('settings.testPremium')}
            subtitle={t('settings.testPremiumBody')}
            value={testPremium.isPending ? testPremium.variables : tier === 'premium'}
            disabled={testPremium.isPending}
            onValueChange={(enabled) => testPremium.mutate(enabled)}
          />
        ) : null}
        {sampleMembersQuery.data?.allowed ? (
          <View style={styles.signOutWrap}>
            <Button
              label={`↺ ${t('daily.demoResetLabel')}`}
              variant="quiet"
              onPress={() => {
                resetRound();
                toast.show(`✓ ${t('filters.saved')}`);
              }}
            />
          </View>
        ) : null}
        <View style={styles.signOutWrap}>
          <Button label={t('settings.signOut')} variant="secondary" onPress={() => void signOut()} />
        </View>
      </Section>

      <Section eyebrow={t('settings.account')} title={t('settings.dangerZone')}>
        <SettingRow
          title={t('settings.delete')}
          subtitle={t('settings.deleteBody')}
          trailing={
            <Button
              testID={testIds.settings.delete}
              label={t('settings.deleteAction')}
              variant="quiet"
              block={false}
              onPress={() => setDeleteConfirm(true)}
            />
          }
        />
      </Section>

        </>
      ) : null}

      <Text variant="caption" center style={styles.version}>
        {t('settings.version')}
      </Text>

      <ConfirmDialog
        visible={pauseConfirm}
        title={paused ? t('settings.resumeTitle') : t('settings.pauseTitle')}
        body={
          paused
            ? t('settings.resumeBody')
            : t('settings.pauseConfirmBody')
        }
        confirmLabel={paused ? t('settings.resume') : t('settings.pauseNow')}
        cancelLabel={t('settings.notNow')}
        onConfirm={() => void confirmPause()}
        onCancel={() => setPauseConfirm(false)}
      />

      <ConfirmDialog
        testID={testIds.settings.deleteDialog}
        visible={deleteConfirm}
        title={t('settings.deleteTitle')}
        body={t('settings.deleteConfirmBody')}
        confirmLabel={t('settings.deleteAction')}
        cancelLabel={t('settings.notNow')}
        onConfirm={() => void confirmDeletion()}
        onCancel={() => setDeleteConfirm(false)}
      />

      {USE_MOCKS ? (
        <ConfirmDialog
          visible={premiumConfirm}
          title={isPremium ? t('settings.leavePremium') : t('settings.tryPremium')}
          body={isPremium ? t('settings.demoFree') : t('settings.demoPremium')}
          confirmLabel={isPremium ? t('settings.useFree') : t('settings.activatePremium')}
          cancelLabel={t('settings.notNow')}
          onConfirm={() => {
            setTier(isPremium ? 'free' : 'premium');
            setPremiumConfirm(false);
          }}
          onCancel={() => setPremiumConfirm(false)}
        />
      ) : null}
      <BlockedMembersSheet visible={blockedOpen} onClose={() => setBlockedOpen(false)} />
    </View>
  );
}


function Disclosure({ label, onPress }: { label: string; onPress: () => void }) {
  const { isRTL } = useI18n();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.disclosure}>
      <Text style={styles.arrow}>{isRTL ? '←' : '→'}</Text>
    </Pressable>
  );
}

function BackRow({ onPress }: { onPress: () => void }) {
  const { t, isRTL } = useI18n();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onPress} style={styles.backRow}>
      <Text style={styles.backLabel}>{isRTL ? '→' : '←'} {t('common.back')}</Text>
    </Pressable>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="microAccent">{eyebrow}</Text>
        <Text variant="displaySmall" style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      <Card style={styles.group}>{children}</Card>
    </View>
  );
}

function SettingRow({
  title,
  subtitle,
  value,
  disabled,
  onValueChange,
  badge,
  trailing,
  testID,
}: {
  title: string;
  subtitle: string;
  value?: boolean;
  disabled?: boolean;
  onValueChange?: (next: boolean) => void;
  badge?: string;
  trailing?: React.ReactNode;
  testID?: string;
}) {
  const { isRTL } = useI18n();
  const control =
    typeof value === 'boolean' ? (
      <Switch
        testID={testID}
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: color.sandDeep, true: color.ink }}
        thumbColor={color.white}
      />
    ) : (
      trailing
    );

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      <View style={styles.rowText}>
        <View style={[styles.rowTitleLine, isRTL && styles.rowReverse]}>
          <Text style={styles.rowTitle}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text variant="caption" style={styles.rowSubtitle}>
          {subtitle}
        </Text>
      </View>
      {control ? <View style={styles.rowControl}>{control}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowReverse: { flexDirection: 'row-reverse' },
  wrap: { gap: 22, paddingBottom: 30 },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 },
  splitRTL: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 22 },
  column: { flex: 1, gap: 22 },
  stack: { gap: 22 },
  section: { gap: 10 },
  sectionHead: { gap: 5, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 21, lineHeight: 27 },
  group: { paddingVertical: 0, paddingHorizontal: space.lg + 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: alpha.lineFaint,
  },
  rowText: { flex: 1, gap: 5 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  rowTitle: { fontFamily: font.bodyBold, fontSize: 13.5, color: color.ink },
  rowSubtitle: { lineHeight: 19, color: color.muted },
  rowControl: { alignItems: 'flex-end', justifyContent: 'center' },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(138,106,52,0.12)',
    color: color.gold,
    fontFamily: font.bodyBold,
    fontSize: 8.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  arrow: { fontFamily: font.body, fontSize: 16, color: color.faint },
  disclosure: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  lockGlyph: { fontFamily: font.body, fontSize: 20, color: color.green },
  languagePill: {
    borderWidth: 1,
    borderColor: alpha.lineStrong,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  languagePillLabel: { fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1, color: color.ink },
  restartNotice: { color: color.gold, marginTop: 8 },
  backRow: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.6, color: color.ink },
  signOutWrap: { paddingVertical: 16 },

  premiumCard: { gap: 14, borderRadius: radius.panel },
  premiumLabel: {
    fontFamily: font.bodyBold,
    fontSize: 9,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: color.goldOnDark,
  },
  premiumTitle: { marginTop: 12 },
  premiumUnavailable: { color: 'rgba(252,252,251,0.72)', lineHeight: 18 },
  featureList: { gap: 9 },
  featureRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  featureMark: { color: color.goldOnDark, fontSize: 11, marginTop: 3 },
  featureText: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(252,252,251,0.88)',
  },
  premiumDetails: { gap: 16, borderRadius: radius.panel, padding: 18 },
  premiumDetailsHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  premiumDetailsTitle: { marginTop: 6, fontSize: 20, lineHeight: 26, flexShrink: 1 },
  planBadge: {
    borderWidth: 1,
    borderColor: 'rgba(214,180,110,0.4)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  // The badge now sits on the dark Premium card.
  planBadgeActive: { borderColor: color.goldOnDark },
  planBadgeLabel: {
    color: color.goldOnDark,
    fontFamily: font.bodyBold,
    fontSize: 8.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  planBadgeLabelActive: { color: color.goldOnDark },
  benefitGrid: { gap: 9 },
  benefit: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
    padding: 13,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  benefitMark: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(138,106,52,0.12)',
  },
  benefitMarkLabel: { fontFamily: font.bodyBold, fontSize: 10, color: color.gold },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: { fontFamily: font.bodyBold, fontSize: 12.5, color: color.ink },
  benefitDetail: { lineHeight: 18, color: color.muted },
  premiumRule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 2,
  },
  premiumRuleMark: { color: color.gold, fontFamily: font.bodyBold, fontSize: 14 },
  premiumRuleText: { flex: 1, lineHeight: 18, color: color.muted },
  paceCard: { backgroundColor: color.sand, borderRadius: radius.lg, padding: 14, gap: 7 },
  paceBody: { fontSize: 11.5, lineHeight: 19 },
  version: { color: color.faint, marginTop: -4 },
});
