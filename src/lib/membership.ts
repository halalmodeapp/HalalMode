import type { MembershipTier } from '@/types';

/**
 * Converts the retired local tier value from pre-Premium builds. Database rows
 * are renamed by migration 0024; this only protects persisted app state while
 * members update the client.
 */
export function normalizeMembershipTier(value: unknown): MembershipTier | null {
  if (value === 'free') return 'free';
  if (value === 'premium' || value === 'plus') return 'premium';
  return null;
}

/** The local mirror must expire even while the app cannot reach the server. */
export function membershipTierAt(value: unknown, now = Date.now()): MembershipTier | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as { tier?: unknown; state?: unknown; expiresAt?: unknown };
  const tier = normalizeMembershipTier(payload.tier);
  if (tier !== 'premium') return tier;
  if (payload.state === 'revoked' || payload.state === 'expired') return 'free';
  if (payload.expiresAt == null) return tier;
  if (typeof payload.expiresAt !== 'string') return null;
  const expires = Date.parse(payload.expiresAt);
  return Number.isFinite(expires) ? (expires > now ? tier : 'free') : null;
}
