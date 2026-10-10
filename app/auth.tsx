import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { signInWithProvider, type AuthProvider } from '@/api/auth';
import { HalftoneHero } from '@/components/auth/HalftoneHero';
import { useI18n } from '@/i18n';
import { localeName, supportedLocales } from '@/i18n/locales';
import { testIds } from '@/lib/testIds';
import { useSession } from '@/state/session';
import { useAuth } from '@/state/auth';
import { useBreakpoint } from '@/theme/breakpoints';
import { font as appFont } from '@/theme/tokens';
import { RTL_LAYOUT } from '@/lib/rtl';
import { ShiningWordmark } from '@/components/brand/ShiningWordmark';

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
  const { t, isRTL } = useI18n();
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
            <HalftoneHero />
            <View
              pointerEvents="box-none"
              style={[styles.header, compact && styles.headerCompact, { paddingTop: insets.top + (compact ? 8 : 18) }]}
            >
              <ShiningWordmark width={176} />
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

              <PillButton
                testID={primaryProvider === 'apple' ? testIds.auth.apple : testIds.auth.google}
                label={primaryProvider === 'apple' ? t('auth.continueApple') : t('auth.continueGoogle')}
                busy={busyProvider === primaryProvider}
                disabled={busyProvider !== null}
                onPress={() => void continueWith(primaryProvider)}
                font={isRTL ? appFont.arabic : appFont.bodySemi}
                compact={compact}
                dense={dense}
              />
              {/* Keep the alternate provider on desktop; phones lead with the
                  platform's native sign-in method. */}
              {Platform.OS === 'web' ? (
                <PillButton
                  testID={testIds.auth.apple}
                  label={t('auth.continueApple')}
                  busy={busyProvider === 'apple'}
                  disabled={busyProvider !== null}
                  onPress={() => void continueWith('apple')}
                  font={isRTL ? appFont.arabic : appFont.bodySemi}
                  outline
                  compact={compact}
                  dense={dense}
                />
              ) : null}
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
  );
}

/** The landing page's button: a black pill with serif type, or its outline. */
function PillButton({
  label,
  onPress,
  busy,
  disabled,
  outline,
  font,
  testID,
  compact,
  dense,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  outline?: boolean;
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
        styles.pill,
        compact && styles.pillCompact,
        dense && styles.pillDense,
        outline && styles.pillOutline,
        (disabled || busy) && styles.pillDisabled,
        pressed && styles.pillPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? C.ink : C.surface} />
      ) : (
        <Text style={[styles.pillLabel, compact && styles.pillLabelCompact, dense && styles.pillLabelDense, { fontFamily: font }, outline && styles.pillLabelOutline]}>{label}</Text>
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
    flex: 0,
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
    flex: 0,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerCompact: { paddingHorizontal: 20 },
  globe: {
    width: 38,
    height: 38,
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
  ledeCompact: { fontSize: 12.5, lineHeight: 17, marginBottom: 8 },
  ledeDense: { fontSize: 11, lineHeight: 14, marginBottom: 4 },

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
  h2Compact: { fontSize: 17, lineHeight: 21 },
  h2Dense: { fontSize: 15, lineHeight: 18 },
  sub: { fontSize: 15, lineHeight: 22, color: C.muted, marginTop: -6, marginBottom: 8 },
  subCompact: { fontSize: 12.5, lineHeight: 17, marginTop: -4, marginBottom: 2 },
  subDense: { fontSize: 11.5, lineHeight: 15, marginTop: -3, marginBottom: 1 },

  pill: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pillCompact: { minHeight: 38 },
  pillDense: { minHeight: 33 },
  pillOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.ink },
  pillDisabled: { opacity: 0.55 },
  pillPressed: { opacity: 0.85 },
  pillLabel: { fontSize: 17, fontWeight: '600', color: C.surface },
  pillLabelCompact: { fontSize: 13.5 },
  pillLabelDense: { fontSize: 12.5 },
  pillLabelOutline: { color: C.ink },

  error: { fontFamily: SANS, fontSize: 13, lineHeight: 18, color: C.err },
  fine: { fontFamily: SANS, fontSize: 12, lineHeight: 17, color: C.label },
  fineCompact: { fontSize: 10.5, lineHeight: 14 },
  fineDense: { fontSize: 10, lineHeight: 13 },
});
