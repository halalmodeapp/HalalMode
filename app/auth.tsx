import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { HalftoneHero } from '@/components/auth/HalftoneHero';
import { LogoLight } from '@/components/auth/LogoLight';
import { useI18n } from '@/i18n';
import { localeName, supportedLocales } from '@/i18n/locales';
import { testIds } from '@/lib/testIds';
import { useSession } from '@/state/session';
import { useAuth } from '@/state/auth';
import { useBreakpoint } from '@/theme/breakpoints';
import { font as appFont } from '@/theme/tokens';
import { RTL_LAYOUT } from '@/lib/rtl';
import { ShiningWordmark } from '@/components/brand/ShiningWordmark';
import { howItWorksUrl } from '@/lib/publicLinks';

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
  gold: '#8A6A34',
  line: 'rgba(138,106,52,0.2)',
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
  // From tablet width up the picture and the form sit side by side, the way
  // the landing page does, instead of a phone layout stretched sideways.
  const wide = useBreakpoint() !== 'phone';
  const landscape = width > height;
  const split = wide || landscape;
  const [busyProvider, setBusyProvider] = useState<AuthProvider | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const primaryProvider: AuthProvider = Platform.OS === 'ios' ? 'apple' : 'google';
  const providerOrder: AuthProvider[] = primaryProvider === 'apple' ? ['apple', 'google'] : ['google', 'apple'];

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
  const usableHeight = Math.max(1, height - insets.top - insets.bottom);
  const splitPanelWidth = !split
    ? undefined
    : compact
      ? Math.min(440, width * 0.48)
      : Math.min(520, Math.max(380, width * 0.4));
  // Keep the sign-in controls together in a compact bottom sheet in portrait;
  // landscape uses a side-by-side composition so the form has enough height.
  const phoneSheetHeight = Math.max(234, Math.min(292, Math.round(usableHeight * 0.32)));

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
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: height, paddingBottom: 0 },
            split && styles.split,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[
            styles.hero,
            split ? styles.heroWide : styles.heroPortrait,
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
              <ShiningWordmark width={compact ? 132 : 176} fill={C.surface} />
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={t('marketing.howItWorks')}
                  onPress={() => void Linking.openURL(howItWorksUrl(language))}
                  style={({ pressed }) => [styles.howButton, pressed && styles.howButtonPressed]}
                >
                  <Text numberOfLines={1} style={styles.howButtonLabel}>{t('marketing.howItWorks')}</Text>
                </Pressable>
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
                    <Path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
                  </Svg>
                </Pressable>
              </View>
            </View>
            {languageOpen ? (
              <View style={[styles.languageMenu, { top: insets.top + 66 }, isRTL ? styles.menuStart : styles.menuEnd]}>
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
                      ['en', 'ar', 'ur', 'fa'].includes(code) ? styles.languageWide : styles.languageHalf,
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
                ...(!split ? { minHeight: phoneSheetHeight } : {}),
              },
            ]}
          >
            <Text style={[styles.h1, compact && styles.h1Compact, dense && styles.h1Dense, { fontFamily: body }, isRTL && styles.noTracking, align]}>
              {t('auth.heroTitle')}
            </Text>
            <Text style={[styles.lede, compact && styles.ledeCompact, dense && styles.ledeDense, { fontFamily: isRTL ? appFont.arabic : SANS }, align]}>
              {t('auth.heroIntro')}
            </Text>

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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  noTracking: { letterSpacing: 0 },

  hero: { position: 'relative', overflow: 'visible' },
  split: { flexDirection: 'row', minHeight: '100%' },
  heroPortrait: { flex: 1, minHeight: 170 },
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
    paddingVertical: 48,
    paddingHorizontal: 40,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerCompact: { paddingHorizontal: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  howButton: {
    minHeight: 36,
    maxWidth: 138,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    backgroundColor: 'rgba(252,252,251,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howButtonPressed: { backgroundColor: '#F5F1E9', borderColor: 'rgba(138,106,52,0.42)' },
  howButtonLabel: { color: C.soft, fontFamily: appFont.bodySemi, fontSize: 12, lineHeight: 16 },
  globe: {
    width: 44,
    height: 44,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(138,106,52,0.24)',
    backgroundColor: 'rgba(252,252,251,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeOpen: { borderColor: 'rgba(138,106,52,0.55)' },
  languageMenu: {
    position: 'absolute',
    width: 300,
    maxWidth: '86%',
    padding: 8,
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
  // Opens under the globe, which sits on the left in Arabic.
  menuEnd: { right: 24 },
  menuStart: { left: 24 },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 11,
  },
  languageOptionOn: { backgroundColor: '#F5F1E9' },
  languageWide: { width: '100%' },
  languageHalf: { width: '50%' },
  languageName: { flexShrink: 1, fontFamily: SANS, fontSize: 14, fontWeight: '500', color: C.soft },
  tick: { color: C.gold, fontSize: 14 },

  sheet: {
    marginTop: -30,
    paddingHorizontal: 24,
    paddingTop: 34,
    backgroundColor: C.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: 'rgba(138,106,52,0.16)',
  },
  sheetCompact: {
    flexGrow: 0,
    marginTop: -16,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  sheetPortrait: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: -16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  sheetDense: { marginTop: -12, paddingTop: 8 },
  h1: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -1,
    color: C.ink,
    marginBottom: 20,
  },
  h1Compact: { fontSize: 25, lineHeight: 29, marginBottom: 4 },
  h1Dense: { fontSize: 21, lineHeight: 24, marginBottom: 2 },
  lede: { fontSize: 17, lineHeight: 27, color: C.muted, marginBottom: 28 },
  ledeCompact: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  ledeDense: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  card: {
    backgroundColor: 'rgba(252,252,251,0.92)',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 26,
    padding: 22,
    gap: 12,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 6,
  },
  cardCompact: { padding: 10, gap: 5, borderRadius: 17 },
  cardDense: { padding: 8, gap: 4, borderRadius: 15 },
  h2: { fontSize: 26, fontWeight: '600', color: C.ink },
  h2Compact: { fontSize: 18, lineHeight: 24 },
  h2Dense: { fontSize: 18, lineHeight: 24 },
  sub: { fontSize: 15, lineHeight: 22, color: C.muted, marginTop: -6, marginBottom: 8 },
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
  fine: { fontFamily: SANS, fontSize: 14, lineHeight: 20, color: C.muted },
  fineCompact: { fontSize: 14, lineHeight: 20 },
  fineDense: { fontSize: 14, lineHeight: 20 },
});
