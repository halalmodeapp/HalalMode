import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

/** The ranges the server accepts. Kept in step with the check on the table. */
export const AGE_RANGES = ['18-24', '25-29', '30-34', '35-39', '40-49', '50+'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export interface WaitlistEntry {
  email: string;
  city: string;
  ageRange: AgeRange;
  locale?: string;
}

export interface WaitlistJoinResult {
  state: 'joined';
}

/**
 * Adds someone to the waitlist behind the public landing page.
 *
 * Callable before anyone has an account, which is the whole point, so the
 * server validates everything again rather than trusting this call. The result
 * is deliberately generic: an endpoint that answered "already on the list"
 * would let anyone test whether a particular person had signed up.
 */
export async function joinWaitlist(entry: WaitlistEntry): Promise<WaitlistJoinResult> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { state: 'joined' };
  }

  const client = requireSupabase();
  // The same endpoint as the website: the place is saved at once and a
  // thank-you email follows.
  const { error } = await client.rpc('join_waitlist_now', {
    p_email: entry.email.trim().toLowerCase(),
    p_city: entry.city.trim(),
    p_age_range: entry.ageRange,
    p_locale: entry.locale ?? null,
    p_referral_code: null,
  });
  if (error) throw error;
  return { state: 'joined' };
}
