import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

/** Fixed moderation notices; the app holds the wording (migration 0186). */
export type NoticeKind = 'report_actioned' | 'report_reviewed' | 'photo_removed';

export interface MemberNotice {
  id: number;
  kind: NoticeKind;
}

const KINDS: readonly NoticeKind[] = ['report_actioned', 'report_reviewed', 'photo_removed'];

export async function fetchMyNotices(): Promise<MemberNotice[]> {
  if (USE_MOCKS) return [];
  const { data, error } = await requireSupabase().rpc('get_my_notices');
  if (error) throw error;
  return ((data ?? []) as { id: number; kind: string }[])
    .filter((row) => (KINDS as readonly string[]).includes(row.kind))
    .map((row) => ({ id: Number(row.id), kind: row.kind as NoticeKind }));
}

export async function markMyNoticesSeen(ids: number[]): Promise<void> {
  if (USE_MOCKS || ids.length === 0) return;
  const { error } = await requireSupabase().rpc('mark_my_notices_seen', { p_ids: ids });
  if (error) throw error;
}
