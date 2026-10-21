import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { signInWithProvider, type AuthProvider } from '@/api/auth';
import { signInProviders } from '@/lib/signInProviders';
import { HalftoneHero } from '@/components/auth/HalftoneHero';
import { LogoLight } from '@/components/auth/LogoLight';
import { useI18n } from '@/i18n';
import { localeName, supportedLocales } from '@/i18n/locales';
import { testIds } from '@/lib/testIds';
import { useSession } from '@/state/session';
import { useAuth } from '@/state/auth';
import { useBreakpoint } from '@/theme/breakpoints';
import { font as appFont } from '@/theme/tokens';
import { LTR_LAYOUT, LTR_WEB_PROPS, RTL_LAYOUT } from '@/lib/rtl';
import { ShiningWordmark } from '@/components/brand/ShiningWordmark';
import { PublicLinks } from '@/components/brand/LinkPill';
import { SiteFooter } from '@/components/brand/SiteFooter';

const GOOGLE_SIGN_IN_ICON = require('../assets/auth/google-g-logo.png');
const APPLE_SIGN_IN_ICON = require('../assets/auth/apple-signin-logo.png');

/**
 * The sign-in screen, dressed like halalmo.de: the gold halftone photo with the
 * logo over it, a cream sheet with a large serif headline, and a frosted card
 * holding the ways in. Someone arriving from the landing page should feel they
 * never left it.
 */

// The landing page's palette and type.
const C = {
  surface: '#FCFCFB',
  ink: '#0A0A0A',
  soft: '#3B3934',
  muted: '#6C6A65',
  label: '#8B8880',
  gold: '#B8914F',
  line: 'rgba(184,145,79,0.2)',
  err: '#9b2c2c',
};
// The app's own faces rather than the browser's: Playfair for the headline
// sentences, Noto Sans for everything you read or press.
const SERIF = appFont.display;
const SANS = appFont.body;

export default function AuthScreen() {
  const { t, isRTL, brandName } = useI18n();
  const { language, setLanguage } = useSession();
  const { authError, clearAuthError } = useAuth();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const router = useRouter();
  // Side by side above 960px, where halalmo.de does the same; below that the
  // picture sits on top, as on the site's phone layout. A short landscape
  // phone keeps them side by side so the form still fits.
  const wide = useBreakpoint() !== 'phone';
  const landscape = width > height;
  const split = width > 960 || (landscape && height < 600);
  const [busyProvider, setBusyProvider] = useState<AuthProvider | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  // Apple and Google on iPhone, Google elsewhere: by platform, never by what
  // the dashboard has switched on (see signInProviders).
  const providerOrder: AuthProvider[] = signInProviders(Platform.OS);

  const continueWith = async (provider: AuthProvider) => {
    if (busyProvider) return;
    clearAuthError();
    setProviderError(null);
    setBusyProvider(provider);
    try {
      await signInWithProvider(provider);
    } catch {
      setProviderError(`${t('auth.providerFailed')}. ${t('auth.providerFailedBody')}`);
    } finally {
      setBusyProvider(null);
    }
  };

  // Headlines in Playfair; Arabic script in Beiruti, which reads better there.
  const body = isRTL ? appFont.arabic : SERIF;
  const align = isRTL ? styles.rtlText : undefined;
  // The picture fills a wide viewport, while phone layouts reserve most of the
  // height for the complete sign-in form.
  const compact = !wide || (landscape && height < 700);
  const dense = height < 560;
  // Headline and intro sized exactly as on halalmo.de (site/index.html).
  const clampTo = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));
  const titleSize = width > 960 ? clampTo(30, Math.min(width * 0.0285, height * 0.056), 62) : clampTo(28, width * 0.074, 44);
  const ledeSize = width > 960 ? clampTo(14, Math.min(width * 0.0115, height * 0.02), 19) : 15;
  const heroText = {
    title: { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.04), letterSpacing: isRTL ? 0 : -0.025 * titleSize },
    lede: { fontSize: ledeSize, lineHeight: Math.round(ledeSize * (width > 960 ? 1.6 : 1.55)) },
  };
  // On phones the gaps grow a little with the screen's height, and the footer
  // follows the card, as on halalmo.de.
  const gap = clampTo(14, height * 0.024, 28);
  const phoneSpacing = split ? null : {
    title: { marginBottom: Math.round(gap * 0.55) },
    lede: { marginBottom: Math.round(gap * 0.9) },
    links: { marginBottom: Math.round(gap * 1.25) },
    footer: { marginTop: Math.round(gap * 1.1) },
  };
  const splitPanelWidth = !split
    ? undefined
    : compact
      ? Math.min(440, width * 0.48)
      : Math.min(520, Math.max(380, width * 0.4));

  // The picture: beside the copy when wide; on phones a fixed 16:9 picture
  // above the copy, rounded at the bottom, as on halalmo.de.
  const phoneHeroHeight = Math.round(Math.min(width * 0.5625, height * 0.55)) + insets.top;
  const hero = (
    <View style={[
      styles.hero,
      split ? styles.heroWide : [styles.heroPhone, { height: phoneHeroHeight }],
      split && compact && styles.heroWideCompact,
    ]}>
      <HalftoneHero variant="couple" />
      <LogoLight
        width={compact ? '94%' : '62%'}
        maxWidth={compact ? 420 : 640}
        height={insets.top + (compact ? 132 : 200)}
        mirrored={isRTL && Platform.OS !== 'web'}
      />
      <View
        pointerEvents="box-none"
        style={[styles.header, compact && styles.headerCompact, { paddingTop: insets.top + (compact ? 8 : 18) }]}
      >
        <View style={[styles.brand, LTR_LAYOUT]} {...LTR_WEB_PROPS}>
          <ShiningWordmark width={compact ? 177 : 212} fill={C.surface} />
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.trademark, compact && styles.trademarkCompact]}
          >
            ™
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <Head>
          <title>{`${brandName} | ${t('auth.heroTitle')}`}</title>
          <meta
            name="description"
            content={t('auth.heroIntro')}
          />
        </Head>
      ) : null}
      <View style={[styles.page, isRTL && styles.rtl]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {split ? null : hero}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            split ? { minHeight: height, paddingBottom: 0 } : styles.phoneScroll,
            split && styles.split,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {split ? hero : null}

          <View
            style={[
              styles.sheet,
              compact && styles.sheetCompact,
              dense && styles.sheetDense,
              split ? styles.sheetWide : styles.sheetPortrait,
              split && compact && styles.sheetWideCompact,
              {
                paddingBottom: insets.bottom + (compact ? 8 : 24),
                ...(splitPanelWidth ? { width: splitPanelWidth } : {}),
              },
            ]}
          >
            <Text style={[styles.h1, compact && styles.h1Compact, dense && styles.h1Dense, heroText.title, phoneSpacing?.title, { fontFamily: body }, align]}>
              {t('auth.heroTitle')}
            </Text>
            <Text style={[styles.lede, compact && styles.ledeCompact, dense && styles.ledeDense, heroText.lede, phoneSpacing?.lede, { fontFamily: body }, align]}>
              {t('auth.heroIntro')}
            </Text>
            {width > 960 ? null : <PublicLinks style={[styles.inlineLinks, phoneSpacing?.links]} />}

            <View style={[styles.card, compact && styles.cardCompact, dense && styles.cardDense]}>
              <Text style={[styles.h2, compact && styles.h2Compact, dense && styles.h2Dense, { fontFamily: body }, align]}>{t('auth.cardTitle')}</Text>
              <Text style={[styles.sub, compact && styles.subCompact, dense && styles.subDense, { fontFamily: isRTL ? appFont.arabic : SANS }, align]}>{t('auth.cardSub')}</Text>

              {providerOrder.map((provider) => (
                <PillButton
                  key={provider}
                  provider={provider}
                  testID={provider === 'apple' ? testIds.auth.apple : testIds.auth.google}
                  label={provider === 'apple' ? t('auth.continueApple') : t('auth.continueGoogle')}
                  busy={busyProvider === provider}
                  disabled={busyProvider !== null}
                  onPress={() => void continueWith(provider)}
                  font={isRTL ? appFont.arabic : appFont.bodySemi}
                  compact={compact}
                  dense={dense}
                />
              ))}
              <Pressable
                testID={testIds.auth.emailContinue}
                accessibilityRole="button"
                accessibilityLabel={t('auth.orEmail')}
                onPress={() => router.push('/auth-email')}
                style={({ pressed }) => [
                  styles.pill,
                  compact && styles.pillCompact,
                  dense && styles.pillDense,
                  styles.pillOutline,
                  pressed && styles.pillPressed,
                ]}
              >
                <Text style={[styles.pillLabel, compact && styles.pillLabelCompact, dense && styles.pillLabelDense, { fontFamily: isRTL ? appFont.arabic : appFont.bodySemi }, styles.pillLabelOutline]}>
                  {t('auth.orEmail')}
                </Text>
              </Pressable>
              {providerError ? (
                <Text accessibilityRole="alert" style={[styles.error, align]}>{providerError}</Text>
              ) : null}
              {authError === 'invalid_link' ? (
                <Text accessibilityRole="alert" style={[styles.error, align]}>{t('auth.linkInvalid')}</Text>
              ) : null}
              <Text style={[styles.fine, compact && styles.fineCompact, dense && styles.fineDense, align]}>{t('auth.privacyNote')}</Text>
            </View>
            {/* The halalmo.de footer, pinned to the foot of the side panel when wide. */}
            <SiteFooter style={[styles.footer, phoneSpacing?.footer, split && styles.footerWide, split && { bottom: insets.bottom + 18 }]} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* As on halalmo.de: How it works and the language globe sit at the
          page's top right in every language, with the menu opening below. */}
      <View
        pointerEvents="box-none"
        style={[styles.actionsBar, LTR_LAYOUT, { top: insets.top + (compact ? 8 : 18), right: compact ? 14 : 24 }]}
        {...LTR_WEB_PROPS}
      >
        <View style={styles.headerActions}>
          {/* From desktop width the links sit up here; below it, under the intro. */}
          {width > 960 ? <PublicLinks /> : null}
          <Pressable
            testID={testIds.auth.language}
            accessibilityRole="button"
            accessibilityLabel={t('auth.languageLabel')}
            accessibilityState={{ expanded: languageOpen }}
            onPress={() => setLanguageOpen((open) => !open)}
            style={[styles.globe, languageOpen && styles.globeOpen]}
          >
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={languageOpen ? C.gold : C.soft} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M3 12h18M12 3c-2.5 2.4-4 5.5-4 9s1.5 6.6 4 9M12 3c2.5 2.4 4 5.5 4 9s-1.5 6.6-4 9" />
            </Svg>
          </Pressable>
        </View>
        {languageOpen ? (
          <View style={styles.languageMenu}>
            {supportedLocales.map((code) => (
              <Pressable
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: code === language }}
                onPress={() => {
                  setLanguage(code);
                  setLanguageOpen(false);
                }}
                style={[
                  styles.languageOption,
                  code === language && styles.languageOptionOn,
                ]}
              >
                <Text style={styles.languageName} numberOfLines={1}>{localeName(code)}</Text>
                {code === language ? <Text style={styles.tick}>✓</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      </View>
    </>
  );
}

/** Provider choices keep their recognized marks, clear contrast, and equal prominence. */
function PillButton({
  provider,
  label,
  onPress,
  busy,
  disabled,
  font,
  testID,
  compact,
  dense,
}: {
  provider: AuthProvider;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  font?: string;
  testID?: string;
  compact?: boolean;
  dense?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerButton,
        provider === 'google' ? styles.providerGoogleButton : styles.providerAppleButton,
        (disabled || busy) && styles.pillDisabled,
        pressed && styles.pillPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={provider === 'apple' ? C.surface : '#1F1F1F'} />
      ) : (
        <View style={styles.providerContent}>
          <Image
            accessible={false}
            source={provider === 'google' ? GOOGLE_SIGN_IN_ICON : APPLE_SIGN_IN_ICON}
            resizeMode="contain"
            style={provider === 'google' ? styles.providerGoogleIcon : styles.providerAppleIcon}
          />
          <Text style={[
            styles.providerLabel,
            provider === 'apple' ? styles.providerAppleLabel : styles.providerGoogleLabel,
            compact && styles.providerLabelCompact,
            dense && styles.providerLabelDense,
            { fontFamily: font },
          ]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.surface },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  rtl: RTL_LAYOUT,
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },

  hero: { position: 'relative', overflow: 'visible' },
  split: { flexDirection: 'row', minHeight: '100%' },
  heroPhone: {
    zIndex: 2,
    overflow: 'hidden',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.14,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  phoneScroll: { flexGrow: 1, paddingBottom: 0 },
  inlineLinks: { marginBottom: 24 },
  heroWide: { flex: 1, overflow: 'hidden' },
  heroWideCompact: { flex: 1 },
  sheetWide: {
    // React Native Web expands `flex: 0` to a zero flex-basis. That makes the
    // explicit panel width shrink down to its horizontal padding on desktop,
    // leaving the auth copy as a one-character-wide column at the edge.
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    minWidth: 0,
    justifyContent: 'center',
    marginTop: 0,
    paddingVertical: 64,
    paddingHorizontal: 44,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  sheetWideCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  header: {
    position: 'relative',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  actionsBar: { position: 'absolute', zIndex: 5, alignItems: 'flex-end' },
  headerCompact: { paddingHorizontal: 14 },
  // The wordmark is English in every language, so its trademark mark always sits to its right.
  brand: { flexDirection: 'row', alignItems: 'flex-start' },
  trademark: { marginLeft: 3, marginTop: -2, color: C.surface, fontFamily: appFont.bodySemi, fontSize: 10, lineHeight: 12 },
  trademarkCompact: { fontSize: 8, lineHeight: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, // Halal Pink, deep
  globe: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(184,145,79,0.24)',
    backgroundColor: 'rgba(252,252,251,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeOpen: { borderColor: 'rgba(184,145,79,0.55)' },
  languageMenu: {
    marginTop: 10,
    width: 360,
    maxWidth: '100%',
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 3,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    backgroundColor: 'rgba(252,252,251,0.98)',
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  languageOption: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 11,
  },
  languageOptionOn: { backgroundColor: '#F5F1E9' },
  // Two to a row, every name aligned left, as on halalmo.de.
  languageName: { flexShrink: 1, textAlign: 'left', fontFamily: SANS, fontSize: 14, fontWeight: '500', color: C.soft },
  tick: { color: C.gold, fontSize: 14 },

  sheet: {
    marginTop: -30,
    paddingHorizontal: 24,
    paddingTop: 34,
    backgroundColor: C.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: 'rgba(184,145,79,0.16)',
  },
  sheetCompact: {
    flexGrow: 0,
    marginTop: -16,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  sheetPortrait: {
    flexGrow: 1,
    marginTop: 0,
    paddingTop: 26,
    paddingHorizontal: 20,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  sheetDense: { marginTop: -12, paddingTop: 8 },
  h1: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -1,
    color: C.ink,
    marginBottom: 18,
  },
  h1Compact: { fontSize: 25, lineHeight: 29, marginBottom: 4 },
  h1Dense: { fontSize: 21, lineHeight: 24, marginBottom: 2 },
  lede: { fontSize: 17, lineHeight: 27, color: C.muted, marginBottom: 36 },
  ledeCompact: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  ledeDense: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  card: {
    backgroundColor: 'rgba(252,252,251,0.92)',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 26,
    paddingHorizontal: 26,
    paddingVertical: 28,
    gap: 14,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 6,
  },
  cardCompact: { paddingHorizontal: 16, paddingVertical: 16, gap: 10, borderRadius: 18 },
  cardDense: { padding: 8, gap: 4, borderRadius: 15 },
  h2: { fontSize: 26, fontWeight: '600', color: C.ink },
  h2Compact: { fontSize: 18, lineHeight: 24 },
  h2Dense: { fontSize: 18, lineHeight: 24 },
  sub: { fontSize: 15, lineHeight: 22, color: C.muted, marginTop: -6, marginBottom: 12 },
  subCompact: { fontSize: 14, lineHeight: 20, marginTop: -2, marginBottom: 4 },
  subDense: { fontSize: 14, lineHeight: 20, marginTop: -2, marginBottom: 4 },

  pill: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pillCompact: { minHeight: 48 },
  pillDense: { minHeight: 48 },
  pillOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.ink },
  pillDisabled: { opacity: 0.55 },
  pillPressed: { opacity: 0.85 },
  pillLabel: { fontSize: 17, fontWeight: '600', color: C.surface },
  pillLabelCompact: { fontSize: 14 },
  pillLabelDense: { fontSize: 14 },
  pillLabelOutline: { color: C.ink },

  providerButton: {
    minHeight: 52,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  providerGoogleButton: { backgroundColor: '#FFFFFF', borderColor: '#747775' },
  providerAppleButton: { backgroundColor: '#000000', borderColor: '#000000' },
  providerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  providerGoogleIcon: { width: 22, height: 22, marginRight: 12 },
  providerAppleIcon: { width: 48, height: 48, marginRight: 4 },
  providerLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  providerLabelCompact: { fontSize: 15 },
  providerLabelDense: { fontSize: 15 },
  providerGoogleLabel: { color: '#1F1F1F' },
  providerAppleLabel: { color: '#FFFFFF' },

  error: { fontFamily: SANS, fontSize: 14, lineHeight: 20, color: C.err },
  fine: { fontFamily: SANS, fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 4 },
  footer: { marginTop: 18 },
  // Pinned to the foot of the side panel.
  footerWide: { position: 'absolute', left: 24, right: 24, marginTop: 0 },
  fineCompact: { fontSize: 14, lineHeight: 20 },
  fineDense: { fontSize: 14, lineHeight: 20 },
});
