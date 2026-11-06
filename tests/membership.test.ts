import test from 'node:test';
import assert from 'node:assert/strict';

import { membershipTierAt, normalizeMembershipTier } from '../src/lib/membership';

test('membership normalizer upgrades the retired legacy local value', () => {
  assert.equal(normalizeMembershipTier('plus'), 'premium');
  assert.equal(normalizeMembershipTier('premium'), 'premium');
  assert.equal(normalizeMembershipTier('free'), 'free');
});

test('membership normalizer rejects unknown persisted values', () => {
  assert.equal(normalizeMembershipTier('gold'), null);
  assert.equal(normalizeMembershipTier(null), null);
});

test('the entitlement mirror expires every provider at the exact deadline', () => {
  const deadline = Date.parse('2026-11-06T12:00:00Z');
  for (const provider of ['comp', 'launch_reward', 'app_store', 'play_store', 'tester', 'future_provider']) {
    for (const state of ['active', 'grace']) {
      const entitlement = { tier: 'premium', provider, state, expiresAt: new Date(deadline).toISOString() };
      assert.equal(membershipTierAt(entitlement, deadline - 1), 'premium');
      assert.equal(membershipTierAt(entitlement, deadline), 'free');
      assert.equal(membershipTierAt(entitlement, deadline + 1), 'free');
    }
  }
});

test('revoked, malformed and indefinite entitlement responses stay distinct', () => {
  assert.equal(membershipTierAt({ tier: 'premium', state: 'revoked' }), 'free');
  assert.equal(membershipTierAt({ tier: 'premium', state: 'expired' }), 'free');
  assert.equal(membershipTierAt({ tier: 'premium', expiresAt: null }), 'premium');
  assert.equal(membershipTierAt({ tier: 'premium', expiresAt: 'broken' }), null);
  assert.equal(membershipTierAt({ tier: 'premium', expiresAt: 123 }), null);
  assert.equal(membershipTierAt(null), null);
});
