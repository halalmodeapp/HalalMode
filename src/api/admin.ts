import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

/** The operator panel. One panel for every platform: the app opens it in the in-app browser. */
export const ADMIN_PANEL_URL = 'https://halalmo.de/admin';

/**
 * Whether this account is on the admin list. Only decides whether the app
 * shows a link to the panel; the panel itself re-checks the admin list and
 * two-factor sign-in on the server for every read and change.
 */
export async function fetchIsAdmin(): Promise<boolean> {
  if (USE_MOCKS) return false;
  const { data, error } = await requireSupabase().rpc('admin_session');
  if (error) return false;
  return (data as { admin?: boolean } | null)?.admin === true;
}
