import { TIER_LIMITS, type MembershipTier } from '../types';

export function roundPickRules(roundTier: MembershipTier | undefined, memberTier: MembershipTier) {
  const tier = roundTier ?? memberTier;
  return { keepLimit: TIER_LIMITS[tier].keeps, allowsSelectAll: tier === 'premium' };
}

/** Keeps the active card valid after a release without introducing a flash. */
export function resolveActiveId<T extends { id: string }>(
  live: readonly T[],
  requestedId: string | null
): string | null {
  if (requestedId && live.some((item) => item.id === requestedId)) {
    return requestedId;
  }
  return live[0]?.id ?? null;
}

/** Maps platform adjustable-control actions to the circular deck direction. */
export function deckDirectionForAccessibilityAction(
  action: 'increment' | 'decrement'
): 'next' | 'previous' {
  return action === 'increment' ? 'next' : 'previous';
}
