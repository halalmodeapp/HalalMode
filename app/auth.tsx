import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { authReturnAddress, signInWithProvider, type AuthProvider } from '@/api/auth';
import { HalftoneHero } from '@/components/auth/HalftoneHero';
import { useI18n } from '@/i18n';
import { localeName, supportedLocales } from '@/i18n/locales';
import { requireSupabase } from '@/lib/supabase';
import { testIds } from '@/lib/testIds';
import { useSession } from '@/state/session';
import { useAuth } from '@/state/auth';
import { useBreakpoint } from '@/theme/breakpoints';
import { RTL_LAYOUT } from '@/lib/rtl';

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
const SERIF = Platform.select({ web: 'ui-serif, Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' });
const SANS = Platform.select({ web: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', default: undefined });

export default function AuthScreen() {
  const { t, isRTL } = useI18n();
  const { language, setLanguage } = useSession();
  const { authError, clearAuthError } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // From tablet width up the picture and the form sit side by side, the way
  // the landing page does, instead of a phone layout stretched sideways.
  const wide = useBreakpoint() !== 'phone';
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const [busyProvider, setBusyProvider] = useState<AuthProvider | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const timer = setInterval(() => {
      setSecondsUntilResend((remaining) => Math.max(0, remaining - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [secondsUntilResend]);

  const continueWith = async (provider: AuthProvider) => {
    if (busyProvider) return;
    clearAuthError();
    setBusyProvider(provider);
    try {
      await signInWithProvider(provider);
    } catch {
      Alert.alert(t('auth.providerFailed'), t('auth.providerFailedBody'));
    } finally {
      setBusyProvider(null);
    }
  };

  const sendLink = async () => {
    if (sending || secondsUntilResend > 0) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      Alert.alert(t('auth.invalidEmail'));
      return;
    }
    clearAuthError();
    setSending(true);
    try {
      const { error } = await requireSupabase().auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: authReturnAddress() },
      });
      if (error) throw error;
      // Supabase remains the authority for rate limits. This short local pause
      // protects people from accidentally requesting several identical links.
      setSecondsUntilResend(60);
      Alert.alert(t('auth.checkEmail'), t('auth.linkSent'));
    } catch {
      Alert.alert(t('auth.sendFailed'), t('auth.sendFailedBody'));
    } finally {
      setSending(false);
    }
  };

  // Arabic reads better in the sans face, as on the landing page.
  const body = isRTL ? SANS : SERIF;
  const align = isRTL ? styles.rtlText : undefined;
  const heroHeight = wide ? height : Math.max(260, Math.round(height * 0.42));

  return (
    <View style={[styles.page, isRTL && styles.rtl]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            { paddingBottom: wide ? 0 : insets.bottom + 40 },
            wide && styles.split,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { height: heroHeight }, wide && styles.heroWide]}>
            <HalftoneHero />
            <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top + 18 }]}>
              <Image
                source={require('../assets/branding/logo.svg')}
                style={styles.logo}
                contentFit="contain"
                accessibilityLabel="Halal Mode"
              />
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

          <View style={[styles.sheet, wide && styles.sheetWide]}>
            <Text style={[styles.h1, { fontFamily: body }, isRTL && styles.noTracking, align]}>
              {t('auth.heroTitle')}
            </Text>
            <Text style={[styles.lede, { fontFamily: body }, align]}>
              {t('auth.heroIntro')} <Text style={styles.ledeBold}>{t('auth.heroBold')}</Text>
            </Text>

            <View style={styles.card}>
              <Text style={[styles.h2, { fontFamily: body }, align]}>{t('auth.cardTitle')}</Text>
              <Text style={[styles.sub, { fontFamily: body }, align]}>{t('auth.cardSub')}</Text>

              <PillButton
                testID={testIds.auth.google}
                label={t('auth.continueGoogle')}
                busy={busyProvider === 'google'}
                disabled={busyProvider !== null}
                onPress={() => void continueWith('google')}
                font={body}
              />
              {/* Android has no Apple accounts to speak of; a button that leads
                  somewhere nobody there can finish is worse than no button. */}
              {Platform.OS === 'android' ? null : (
                <PillButton
                  testID={testIds.auth.apple}
                  label={t('auth.continueApple')}
                  busy={busyProvider === 'apple'}
                  disabled={busyProvider !== null}
                  onPress={() => void continueWith('apple')}
                  font={body}
                  outline
                />
              )}

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orEmail')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={[styles.label, align]}>{t('auth.email')}</Text>
              {authError === 'invalid_link' ? (
                <Text accessibilityRole="alert" style={[styles.error, align]}>{t('auth.linkInvalid')}</Text>
              ) : null}
              <TextInput
                testID={testIds.auth.email}
                accessibilityLabel={t('auth.email')}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={C.label}
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => void sendLink()}
                style={styles.input}
              />
              <PillButton
                testID={testIds.auth.submit}
                label={secondsUntilResend > 0 ? t('auth.waitToResend', { seconds: secondsUntilResend }) : t('auth.send')}
                busy={sending}
                disabled={secondsUntilResend > 0}
                onPress={() => void sendLink()}
                font={body}
              />
              <Text style={[styles.fine, align]}>{t('auth.privacyNote')}</Text>
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
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  outline?: boolean;
  font?: string;
  testID?: string;
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
        outline && styles.pillOutline,
        (disabled || busy) && styles.pillDisabled,
        pressed && styles.pillPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? C.ink : C.surface} />
      ) : (
        <Text style={[styles.pillLabel, { fontFamily: font }, outline && styles.pillLabelOutline]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.surface },
  flex: { flex: 1 },
  rtl: RTL_LAYOUT,
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  noTracking: { letterSpacing: 0 },

  hero: { position: 'relative', overflow: 'visible' },
  split: { flexDirection: 'row', minHeight: '100%' },
  heroWide: { flex: 1, overflow: 'hidden' },
  sheetWide: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 0,
    paddingVertical: 48,
    paddingHorizontal: 40,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  logo: { width: 176, height: 25 },
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
  h1: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -1,
    color: C.ink,
    marginBottom: 20,
  },
  lede: { fontSize: 17, lineHeight: 27, color: C.muted, marginBottom: 28 },
  ledeBold: { fontWeight: '700' },

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
  h2: { fontSize: 26, fontWeight: '600', color: C.ink },
  sub: { fontSize: 15, lineHeight: 22, color: C.muted, marginTop: -6, marginBottom: 8 },

  pill: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pillOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.ink },
  pillDisabled: { opacity: 0.55 },
  pillPressed: { opacity: 0.85 },
  pillLabel: { fontSize: 17, fontWeight: '600', color: C.surface },
  pillLabelOutline: { color: C.ink },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  dividerText: {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: C.gold,
  },
  label: { fontFamily: SANS, fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: -6 },
  error: { fontFamily: SANS, fontSize: 13, lineHeight: 18, color: C.err },
  input: {
    fontFamily: SANS,
    fontSize: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    backgroundColor: C.surface,
    color: C.ink,
    textAlign: 'left',
  },
  fine: { fontFamily: SANS, fontSize: 12, lineHeight: 17, color: C.label },
});
