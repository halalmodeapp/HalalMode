import { requireSupabase, USE_MOCKS } from '@/lib/supabase';

export type ReferralProgress =
  | {
      state: 'verified';
      eligible: boolean;
      referralCode: string;
      referralUrl: string;
      referralCount: number;
      rewardMonths: number;
    }
  /** The account's email, or its waitlist place, is not confirmed yet. */
  | { state: 'unconfirmed' }
  | { state: 'not_on_waitlist' };

/**
 * The member's waitlist referral link and how many friends have counted, found
 * by the confirmed email on their account. The same numbers halalmo.de/refer
 * shows; the server never sends back the address itself.
 */
export async function fetchMyReferralProgress(): Promise<ReferralProgress> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      state: 'verified',
      eligible: true,
      referralCode: 'HMDEMO1234',
      referralUrl: 'https://halalmo.de/?ref=HMDEMO1234',
      referralCount: 4,
      rewardMonths: 3,
    };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('my_referral_progress');
  if (error) throw error;
  return parseReferralProgress(data);
}

export function parseReferralProgress(data: unknown): ReferralProgress {
  const row = (data ?? {}) as Record<string, unknown>;
  if (row.state === 'verified' && typeof row.referral_url === 'string' && row.referral_url) {
    return {
      state: 'verified',
      eligible: row.eligible === true,
      referralCode: String(row.referral_code ?? ''),
      referralUrl: row.referral_url,
      referralCount: Math.max(0, Number(row.referral_count) || 0),
      rewardMonths: Math.max(0, Number(row.reward_months) || 0),
    };
  }
  return { state: row.state === 'not_on_waitlist' ? 'not_on_waitlist' : 'unconfirmed' };
}
