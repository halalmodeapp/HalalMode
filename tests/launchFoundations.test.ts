import assert from 'node:assert/strict';
import test from 'node:test';

import { trackProductEvent } from '../src/lib/analytics';
import { defaultFeatureFlags, resolveFeatureFlags } from '../src/lib/featureFlags';
import { mapServerReleaseFlags } from '../src/lib/releaseFlagMapping';
import { getProfileReadiness } from '../src/lib/profileReadiness';

test('feature flags fail closed and ignore unknown values', () => {
  assert.deepEqual(resolveFeatureFlags(null), defaultFeatureFlags);
  assert.deepEqual(resolveFeatureFlags({ liveCalling: true, unknown: true, premiumPurchases: 'yes' }), {
    ...defaultFeatureFlags,
    liveCalling: true,
  });
});

test('analytics strips non-primitive and unsafe properties', () => {
  const unsafePayload = {
    round_size: 5,
    resumed: false,
    message: { private: true },
    'bad-key': 'discard',
  } as unknown as Record<string, string | number | boolean>;
  const event = trackProductEvent('daily_round_viewed', unsafePayload);
  assert.deepEqual(event.properties, { round_size: 5, resumed: false });
});

test('profile readiness names exactly what is missing', () => {
  const complete = {
    firstName: 'Amina', city: 'Madinah', country: 'Saudi Arabia',
    bio: 'A considered profile with enough detail to introduce myself, my family, my faith and my hopes.',
    photoCount: 1, languages: ['en'], education: 'BSc', hasChildren: 'no', familyGoalsAnswered: true,
    religiousDress: 'hijab', ethnicity: 'arab', ownHeightCm: 165, ownBuild: 'slim', preferencesSaved: true,
  };
  assert.deepEqual(getProfileReadiness(complete), { ready: true, missing: [] });
  assert.deepEqual(getProfileReadiness({ ...complete, bio: 'Forty characters is no longer enough here.' }).missing, ['bio']);
  assert.deepEqual(getProfileReadiness({}), {
    ready: false,
    missing: ['name', 'location', 'bio', 'photo', 'languages', 'education', 'has_children', 'children_when', 'dress', 'ethnicity', 'height', 'body_type'],
  });
});

test('server release flags map only known, enabled capabilities', () => {
  assert.deepEqual(
    mapServerReleaseFlags({ live_calling: true, premium_purchases: false, unknown_flag: true }),
    { ...defaultFeatureFlags, liveCalling: true }
  );
});
