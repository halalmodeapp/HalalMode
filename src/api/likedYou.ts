import { hydrateProfileMedia } from '@/api/profileMedia';
import { requireSupabase, USE_MOCKS } from '@/lib/supabase';
import type { MaritalStatus, Profile } from '@/types';

/**
 * Someone who chose this member and was not chosen back. Without Premium only
 * the bio and plain facts arrive, with a tiny blurred photo and no name; with
 * Premium the whole profile does (see get_my_liked_you).
 */
export interface LikedYou {
  id: string;
  age: number;
  city: string;
  country: string;
  occupation: string;
  bio: string;
  maritalStatus?: MaritalStatus;
  chips: string[];
  /** Path in the blurred bucket; absent while the copy is still being made. */
  blurredPhoto?: string | null;
  likedAt: string;
  expiresAt: string;
  unlocked: boolean;
  /** Present only when unlocked. */
  profile?: Profile;
}

type RawLikedYou = Omit<LikedYou, 'profile'> & Partial<Profile>;

export async function fetchLikedYou(premium: boolean): Promise<LikedYou[]> {
  if (USE_MOCKS) return mockLikedYou(premium);

  const { data, error } = await requireSupabase().rpc('get_my_liked_you');
  if (error) throw error;
  return Promise.all(((data ?? []) as RawLikedYou[]).map(async (raw) => {
    if (!raw.unlocked) return raw;
    // Premium rows are full profiles with the like's dates alongside.
    const profile = await hydrateProfileMedia(raw as unknown as Profile);
    return { ...raw, profile };
  }));
}

/** Premium only. "waiting" means a place opens as soon as either side has room. */
export async function likeBack(likerId: string): Promise<'matched' | 'waiting'> {
  if (USE_MOCKS) return 'matched';

  const { data, error } = await requireSupabase().rpc('like_back', { p_liker_id: likerId });
  if (error) throw error;
  return (data as { status?: string } | null)?.status === 'waiting' ? 'waiting' : 'matched';
}

function mockLikedYou(premium: boolean): LikedYou[] {
  const base = {
    id: 'mock-liked-1',
    age: 29,
    city: 'Leicester',
    country: 'United Kingdom',
    occupation: 'Teacher',
    bio: 'I teach primary school and spend my weekends hiking or trying a new recipe. Looking for someone steady, kind and a little silly.',
    maritalStatus: 'never_married' as MaritalStatus,
    chips: ['Hiking', 'Cooking', 'Books'],
    likedAt: new Date(Date.now() - 86400_000).toISOString(),
    expiresAt: new Date(Date.now() + 6 * 86400_000).toISOString(),
  };
  return [{ ...base, blurredPhoto: null, unlocked: premium }];
}
