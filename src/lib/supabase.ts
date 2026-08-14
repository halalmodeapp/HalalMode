import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { authStorage } from './authStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * When true the app serves bundled sample content and never touches the
 * network. Set `EXPO_PUBLIC_USE_MOCKS=0` and supply credentials to go live.
 */
export const USE_MOCKS =
  process.env.EXPO_PUBLIC_USE_MOCKS === '1';

if (!USE_MOCKS && (!url || !anonKey)) {
  throw new Error(
    'Live Halal Mode builds require EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Set EXPO_PUBLIC_USE_MOCKS=1 only for intentional demo builds.'
  );
}

/**
 * Single Supabase client. Native bearer sessions persist in the OS secure
 * store; Expo web uses its browser adapter. There is no URL session detection
 * because React Native has no address bar to read back from.
 *
 * PKCE rather than the library default. The default returns a session as tokens
 * in the URL fragment, which only a browser can read — a native app is handed
 * `halalmode://auth#access_token=...` and has nothing that would pick it up.
 * PKCE returns a short code instead, in the query string, which both platforms
 * read the same way and which `state/auth` already trades for a session. It is
 * also the flow that does not put a usable token in a URL that gets logged.
 */
export const supabase: SupabaseClient | null = USE_MOCKS
  ? null
  : createClient(url!, anonKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });

/** Narrows the nullable client at call sites that genuinely need the network. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, or leave EXPO_PUBLIC_USE_MOCKS=1.'
    );
  }
  return supabase;
}
