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

const mockReviewed = new Set<string>();
let mockFreeLooksLeft = 3;

export async function fetchPhotoCoach(photoPaths: string[], demoPremium = false): Promise<PhotoCoachState> {
  if (USE_MOCKS) {
    return {
      firstLookFree: mockReviewed.size === 0,
      freeLooksLeft: mockFreeLooksLeft,
      premium: demoPremium,
      unreviewed: photoPaths.filter(photo => !mockReviewed.has(photo)).length,
      reviews: photoPaths.flatMap((photo, index) => mockReviewed.has(photo) ? [{
        photo, position: index + 1,
        advice: { verdict: 'good', summary: 'Try facing a window for softer light.', tips: [] },
      }] : []),
    };
  }
  const { data, error } = await requireSupabase().rpc('get_my_photo_coach');
  if (error) throw error;
  return data as PhotoCoachState;
}

/** Asks Halal Bot to look at the member's photos it has not seen yet. */
export async function askPhotoCoach(language: string, photoPaths: string[], demoPremium = false): Promise<void> {
  if (USE_MOCKS) {
    const pending = photoPaths.filter(photo => !mockReviewed.has(photo));
    if (pending.length === 0 || (!demoPremium && mockFreeLooksLeft === 0)) return;
    pending.forEach(photo => mockReviewed.add(photo));
    if (!demoPremium) mockFreeLooksLeft -= 1;
    return;
  }
  const { data, error } = await requireSupabase().functions.invoke('photo-coach', { body: { language } });
  if (error) throw error;
  if (data?.reason === 'up_to_date') return;
  if (!data || data.looked < 1) throw new Error(data?.reason ?? 'No photo advice was saved.');
}
