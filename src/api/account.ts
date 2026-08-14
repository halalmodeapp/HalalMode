import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

/** Changes matching eligibility through a constrained server RPC. */
export async function setProfilePaused(paused: boolean): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('set_my_profile_paused', {
    p_paused: paused,
  });
  if (error) throw error;
}

/** Immediately removes the member from matching while a server-side purge is processed. */
export async function requestAccountDeletion(): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('request_my_account_deletion');
  if (error) throw error;
}

/**
 * Whether this member sends read receipts — and so whether they see anybody
 * else's. The server enforces both halves; this only reads and writes the
 * setting.
 */
export async function fetchMyReadReceipts(): Promise<boolean> {
  if (USE_MOCKS) return true;
  const { data, error } = await requireSupabase().rpc('get_my_privacy_preferences');
  if (error) throw error;
  return (data as { readReceipts?: boolean } | null)?.readReceipts !== false;
}

export async function setMyReadReceipts(enabled: boolean): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('set_my_read_receipts', {
    p_enabled: enabled,
  });
  if (error) throw error;
}
