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

/** Testers only: whether sample members appear in this member's daily set. */
export async function fetchMySampleMembers(): Promise<{ allowed: boolean; enabled: boolean }> {
  if (USE_MOCKS) return { allowed: true, enabled: true };
  const { data, error } = await requireSupabase().rpc('get_my_sample_members');
  if (error) throw error;
  const row = (data ?? {}) as { allowed?: boolean; enabled?: boolean };
  return { allowed: Boolean(row.allowed), enabled: Boolean(row.enabled) };
}

export async function setMySampleMembers(enabled: boolean): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('set_my_sample_members', { p_enabled: enabled });
  if (error) throw error;
}

/** Testers only: clears sample rounds and connections so the flow can be walked again. */
export async function resetMySampleFlow(): Promise<void> {
  if (USE_MOCKS) return;
  const { error } = await requireSupabase().rpc('reset_my_sample_flow');
  if (error) throw error;
}
