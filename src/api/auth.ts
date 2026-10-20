import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { exchangeAuthCodeOnce } from '@/lib/authCodeExchange';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';
import { withDeadline } from '@/lib/withDeadline';

/**
 * Signing in with Google or Apple.
 *
 * The auth-session result and native deep-link listener can both receive the
 * same callback. Both route its PKCE code through the shared one-time exchange
 * guard, while `onAuthStateChange` remains the single place that adopts users.
 */
export type AuthProvider = 'google' | 'apple';

export const REDIRECT_TO = 'halalmode://auth';

/**
 * The sign-in providers switched on for this Supabase project, read from its
 * public auth settings, so a provider that is off (Apple, until it is set up)
 * is never offered. Google alone if the settings cannot be read.
 */
export async function fetchEnabledProviders(): Promise<AuthProvider[]> {
  if (USE_MOCKS) return ['google', 'apple'];
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return ['google'];
  try {
    const response = await withDeadline(fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }), 8000);
    if (!response.ok) return ['google'];
    const settings = (await response.json()) as { external?: Partial<Record<AuthProvider, boolean>> };
    const enabled = (['google', 'apple'] as const).filter((provider) => settings.external?.[provider] === true);
    return enabled.length ? [...enabled] : ['google'];
  } catch {
    return ['google'];
  }
}

/**
 * Where sign-in returns to: the app's own address on the web (which lives under
 * /app on halalmo.de, beside the landing page), the app's link scheme on phones.
 */
export function authReturnAddress(): string {
  if (Platform.OS !== 'web') return REDIRECT_TO;
  const base = (Constants.expoConfig?.experiments?.baseUrl ?? '').replace(/\/$/, '');
  return `${window.location.origin}${base}`;
}

export async function signInWithProvider(provider: AuthProvider): Promise<void> {
  const client = requireSupabase();

  // On the web the browser is already the browser: let Supabase navigate the
  // page, and the code comes back as a normal query parameter.
  if (Platform.OS === 'web') {
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authReturnAddress() },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: REDIRECT_TO, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('no sign-in url');

  // An auth session rather than a plain browser tab: it closes itself on the
  // redirect and hands the URL straight back, so nobody is left staring at a
  // blank page wondering whether it worked.
  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_TO);

  if (result.type === 'success' && result.url) {
    const code = new URL(result.url).searchParams.get('code');
    if (code) {
      const exchange = await withDeadline(
        exchangeAuthCodeOnce(
          code,
          (singleUseCode) => client.auth.exchangeCodeForSession(singleUseCode)
        )
      );
      if (exchange.error) throw exchange.error;
    }
  }
}
