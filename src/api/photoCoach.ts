import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

export interface PhotoCoachState {
  reviews: {
    photo: string;
    position: number;
    advice: { verdict: string; summary: string; tips: string[] };
  }[];
  unreviewed: number;
  firstLookFree: boolean;
  freeLooksLeft: number;
  premium: boolean;
}

const MOCK_STATE: PhotoCoachState = { reviews: [], unreviewed: 2, firstLookFree: true, freeLooksLeft: 3, premium: false };

export async function fetchPhotoCoach(): Promise<PhotoCoachState> {
  if (USE_MOCKS) return MOCK_STATE;
  const { data, error } = await requireSupabase().rpc('get_my_photo_coach');
  if (error) throw error;
  return data as PhotoCoachState;
}

/** Asks Halal Bot to look at the member's photos it has not seen yet. */
export async function askPhotoCoach(language: string): Promise<void> {
  if (USE_MOCKS) return;
  const { data, error } = await requireSupabase().functions.invoke('photo-coach', { body: { language } });
  if (error) throw error;
  if (!data || data.looked < 1) throw new Error('No photo advice was saved.');
}
