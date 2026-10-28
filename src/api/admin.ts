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

/** An account that has demo mode: sample members, free test Premium, reset. */
export interface TestAccount {
  email: string;
  /** Owners always have demo mode and cannot be switched off. */
  owner: boolean;
  demo: boolean;
  premium: boolean;
}

/** Owners only: the accounts that have demo mode. */
export async function fetchTestAccounts(): Promise<TestAccount[]> {
  if (USE_MOCKS) return [];
  const { data, error } = await requireSupabase().rpc('admin_list_test_accounts');
  if (error) throw error;
  return (data ?? []) as TestAccount[];
}

/** Owners only: give or take demo mode for an account that has signed up. */
export async function setTestAccount(email: string, enabled: boolean): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('admin_set_test_account', { p_email: email, p_enabled: enabled });
  if (error) throw error;
}
