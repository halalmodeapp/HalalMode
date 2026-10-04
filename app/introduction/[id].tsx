import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AudioGreeting } from '@/components/introductions/AudioGreeting';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { SafetyControl } from '@/components/safety/SafetyControl';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/catalog';
import { useRound } from '@/state/round';
import { alpha, color, radius, space } from '@/theme/tokens';
import { RTL_LAYOUT } from '@/lib/rtl';
import { occupationLabel } from '@/data/occupations';
import { profileDetailLines } from '@/lib/profileDetails';

export default function IntroductionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { localeTag, isRTL, language, t } = useI18n();
  const { round, refresh, selected, toggleSelect, keepLimit, profileOpened, profileClosed } =
    useRound();
  const [limitOpen, setLimitOpen] = useState(false);

  // Before the early return below, because hooks cannot be conditional. Reading
  // a profile is timed on the device so that at most one question can be asked
  // at submission; the timings themselves are never sent anywhere.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      profileOpened(id);
      return () => profileClosed(id);
    }, [id, profileClosed, profileOpened])
  );

  const introduction =
    round?.introductions.find((item) => item.id === id) ?? null;

  if (!introduction) {
    return (
      <Screen style={isRTL ? styles.rtl : undefined}>
        <View style={styles.missing}>
          <Text variant="bodySmall">{t('intro.missing')}</Text>
          <Button label={t('common.back')} variant="quiet" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const { profile, agreements } = introduction;
  const chosen = selected.includes(introduction.id);
  const position = (round?.introductions.indexOf(introduction) ?? 0) + 1;
  const total = round?.introductions.length ?? 0;
  const number = (value: number) => new Intl.NumberFormat(localeTag).format(value);

  return (
    <Screen style={isRTL ? styles.rtl : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          action="back"
          trailingLabel={t('intro.position', { current: number(position), total: number(total) })}
          trailing={(
            <SafetyControl
              scope={{ kind: 'introduction', id: introduction.id }}
              memberName={profile.firstName}
              onBlocked={() => void refresh()}
            />
          )}
        />

        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={t('intro.photosA11y', { name: profile.firstName })}
          onPress={() => router.push(`/gallery/${introduction.id}`)}
          style={styles.hero}
        >
          <Image
            source={profile.photos[0]}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={220}
            accessibilityIgnoresInvertColors
          />
          <View style={[styles.photoBadge, isRTL && styles.rowRTL]}>
            <View style={styles.photoBadgeIcon} />
            <Text style={styles.photoBadgeLabel}>
              {t('intro.photoCount', { count: number(profile.photos.length) })}
            </Text>
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.72)']}
            style={styles.heroGradient}
          >
            <Text style={styles.heroName}>{profile.name}</Text>
            <Text style={styles.heroLine}>
              {number(profile.age)} · {profile.city} · {occupationLabel(profile.occupation, language)}
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={[styles.chips, isRTL && styles.rowRTL]}>
          {profile.chips.map((chip) => (
            <Chip key={chip} label={chip} />
          ))}
        </View>

        <Text style={styles.bio}>{profile.bio}</Text>

        {profile.audioDurationSeconds ? (
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionHeading}>
              {t('intro.audio')}
            </Text>
            <AudioGreeting
              durationSeconds={profile.audioDurationSeconds}
              url={profile.audioGreetingUrl}
            />
          </View>
        ) : null}

        {/* What they said about themselves: the same answers the Premium
            filters use, shown to everyone they are introduced to. */}
        {profileDetailLines(profile, t, language).length > 0 ? (
          <View style={styles.agreementBlock}>
            <Text variant="micro">{t('intro.about', { name: profile.firstName })}</Text>
            <View style={styles.agreementList}>
              {profileDetailLines(profile, t, language).map((line) => (
                <View key={line.label} style={[styles.agreementRow, isRTL && styles.rowRTL]}>
                  <Text variant="bodySmall">{line.label}</Text>
                  <Text variant="label" style={styles.agreementValue}>{line.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.agreementBlock}>
          <Text variant="micro">{t('intro.agreements')}</Text>
          <View style={styles.agreementList}>
            {agreements.map((item) => (
              <View key={item.key ?? item.label} style={[styles.agreementRow, isRTL && styles.rowRTL]}>
                <Text variant="bodySmall">{item.key ? t(agreementLabelKey[item.key]) : item.label}</Text>
                <Text variant="label" style={styles.agreementValue}>
                  {item.key ? t(agreementValueKey[item.key]) : item.value}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="caption" style={styles.privacyNote}>
            {t('intro.privacy')}
          </Text>
        </View>

        <View style={[styles.actions, isRTL && styles.rowRTL]}>
          {/* Choosing happens here as on the deck; sending happens back on the
              deck, where the whole selection can be seen at once. */}
          <Button
            label={chosen ? `✓ ${t('daily.interested')}` : t('daily.select')}
            variant={chosen ? 'gold' : 'primary'}
            onPress={() => {
              if (toggleSelect(introduction.id)) {
                if (!chosen) router.back();
              } else {
                setLimitOpen(true);
              }
            }}
            style={styles.sendInterest}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={limitOpen}
        title={t('daily.limitTitle', { limit: keepLimit })}
        body={t('daily.limitBody', { name: profile.firstName })}
        confirmLabel={t('daily.switchSelection')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          // The picker of who to swap out lives on the deck.
          setLimitOpen(false);
          router.back();
        }}
        onCancel={() => setLimitOpen(false)}
      />
    </Screen>
  );
}

const agreementLabelKey = {
  marriage_timing: 'intro.agreementTiming',
  family_plans: 'intro.agreementFamily',
  same_city: 'intro.agreementLocation',
  relocation: 'intro.agreementLocation',
} as const satisfies Record<string, TranslationKey>;

const agreementValueKey = {
  marriage_timing: 'intro.agreementTimingValue',
  family_plans: 'intro.agreementFamilyValue',
  same_city: 'intro.agreementSameCityValue',
  relocation: 'intro.agreementRelocationValue',
} as const satisfies Record<string, TranslationKey>;

const styles = StyleSheet.create({
  rtl: RTL_LAYOUT,
  rowRTL: { flexDirection: 'row-reverse' },
  content: { paddingBottom: 40 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  hero: {
    marginHorizontal: space.gutter,
    marginTop: 12,
    // Square, and scaled with the width rather than a fixed height: a fixed
    // 330 became a wide letterbox on anything larger than a phone, cropping a
    // face to a strip.
    aspectRatio: 1,
    borderRadius: radius.hero,
    overflow: 'hidden',
    backgroundColor: color.clay,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 22,
  },
  heroName: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 26,
    color: color.white,
  },
  heroLine: {
    fontFamily: 'Beiruti_400Regular',
    fontSize: 12,
    color: 'rgba(252,252,251,0.85)',
    marginTop: 5,
  },
  photoBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  photoBadgeIcon: {
    width: 11,
    height: 9,
    borderWidth: 1.5,
    borderColor: color.white,
    borderRadius: 2,
  },
  photoBadgeLabel: {
    fontFamily: 'Beiruti_600SemiBold',
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: color.white,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingHorizontal: space.gutter,
    marginTop: 16,
  },
  bio: {
    fontFamily: 'Beiruti_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: color.inkSoft,
    paddingHorizontal: space.gutter,
    marginTop: 18,
  },

  section: { paddingHorizontal: space.gutter, marginTop: 20, gap: 8 },
  sectionHeading: { fontSize: 11 },

  agreementBlock: {
    marginHorizontal: space.gutter,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: alpha.line,
  },
  agreementList: { marginTop: 12, gap: 10 },
  agreementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  agreementValue: { flexShrink: 1, textAlign: 'right', fontSize: 14 },
  privacyNote: { marginTop: 14, color: color.faintest },

  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: space.gutter,
    marginTop: 26,
  },
  letGo: { flex: 1, paddingHorizontal: 8 },
  sendInterest: { flex: 1.3, paddingHorizontal: 8 },
});
