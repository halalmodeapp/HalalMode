import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authReturnAddress } from '@/api/auth';
import { useI18n } from '@/i18n';
import { testIds } from '@/lib/testIds';
import { requireSupabase } from '@/lib/supabase';
import { trackProductEvent } from '@/lib/analytics';
import { useAuth } from '@/state/auth';
import { useBreakpoint } from '@/theme/breakpoints';
import { font as appFont } from '@/theme/tokens';
import { RTL_LAYOUT } from '@/lib/rtl';

const C = {
  surface: '#FCFCFB',
  ink: '#0A0A0A',
  muted: '#6C6A65',
  label: '#8B8880',
  gold: '#8A6A34',
  line: 'rgba(138,106,52,0.2)',
  error: '#9b2c2c',
};

export default function AuthEmailScreen() {
  const { t, isRTL } = useI18n();
  const { authError, clearAuthError } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const wide = useBreakpoint() !== 'phone';
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const timer = setInterval(() => {
      setSecondsUntilResend((remaining) => Math.max(0, remaining - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [secondsUntilResend]);

  const sendLink = async () => {
    if (sending || secondsUntilResend > 0) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setNotice({ tone: 'error', text: t('auth.invalidEmail') });
      return;
    }
    clearAuthError();
    setNotice(null);
    setSending(true);
    try {
      const { error } = await requireSupabase().auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: authReturnAddress() },
      });
      if (error) throw error;
      trackProductEvent('auth_link_requested');
      setSecondsUntilResend(60);
      setNotice({ tone: 'ok', text: `${t('auth.checkEmail')}. ${t('auth.linkSent')}` });
    } catch {
      setNotice({ tone: 'error', text: `${t('auth.sendFailed')}. ${t('auth.sendFailedBody')}` });
    } finally {
      setSending(false);
    }
  };

  const textAlign = isRTL ? styles.rtlText : undefined;
  const font = isRTL ? appFont.arabic : appFont.body;
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/auth');
  };

  return (
    <View style={[styles.page, isRTL && styles.rtl]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, wide && styles.cardWide]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={goBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Text style={[styles.backLabel, { fontFamily: font }]}>{`‹  ${t('common.back')}`}</Text>
            </Pressable>

            <Text style={[styles.title, { fontFamily: isRTL ? appFont.arabic : appFont.display }, textAlign]}>
              {t('auth.cardTitle')}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: font }, textAlign]}>{t('auth.cardSub')}</Text>

            <Text style={[styles.label, { fontFamily: font }, textAlign]}>{t('auth.email')}</Text>
            <TextInput
              testID={testIds.auth.email}
              accessibilityLabel={t('auth.email')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="send"
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={C.label}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setNotice(null);
                if (authError) clearAuthError();
              }}
              onSubmitEditing={() => void sendLink()}
              style={styles.input}
            />

            {authError === 'invalid_link' ? (
              <Text accessibilityRole="alert" style={[styles.error, textAlign]}>{t('auth.linkInvalid')}</Text>
            ) : null}
            {notice ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[notice.tone === 'ok' ? styles.success : styles.error, textAlign]}
              >
                {notice.tone === 'ok' ? '✓ ' : ''}{notice.text}
              </Text>
            ) : null}

            <Pressable
              testID={testIds.auth.submit}
              accessibilityRole="button"
              accessibilityLabel={secondsUntilResend > 0 ? t('auth.waitToResend', { seconds: secondsUntilResend }) : t('auth.send')}
              accessibilityState={{ disabled: sending || secondsUntilResend > 0, busy: sending }}
              disabled={sending || secondsUntilResend > 0}
              onPress={() => void sendLink()}
              style={({ pressed }) => [styles.submit, (sending || secondsUntilResend > 0) && styles.disabled, pressed && styles.pressed]}
            >
              {sending ? (
                <ActivityIndicator color={C.surface} />
              ) : (
                <Text style={[styles.submitLabel, { fontFamily: isRTL ? appFont.arabic : appFont.bodySemi }]}>
                  {secondsUntilResend > 0 ? t('auth.waitToResend', { seconds: secondsUntilResend }) : t('auth.send')}
                </Text>
              )}
            </Pressable>

            <Text style={[styles.fine, { fontFamily: font }, textAlign]}>{t('auth.privacyNote')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.surface },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  rtl: RTL_LAYOUT,
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  card: {
    width: '100%',
    maxWidth: 520,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 26,
    backgroundColor: C.surface,
    shadowColor: C.ink,
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 5,
  },
  cardWide: { padding: 32 },
  back: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 2 },
  backLabel: { color: C.gold, fontSize: 15, fontWeight: '600' },
  title: { color: C.ink, fontSize: 32, lineHeight: 38, fontWeight: '600' },
  subtitle: { color: C.muted, fontSize: 15, lineHeight: 22, marginTop: -12 },
  label: { color: C.ink, fontSize: 14, fontWeight: '600', marginBottom: -10 },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    color: C.ink,
    fontFamily: appFont.body,
    fontSize: 16,
    textAlign: 'left',
  },
  error: { color: C.error, fontSize: 13, lineHeight: 18 },
  success: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  submit: { minHeight: 52, paddingHorizontal: 18, borderRadius: 999, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  submitLabel: { color: C.surface, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.84 },
  fine: { color: C.label, fontSize: 12, lineHeight: 18 },
});
