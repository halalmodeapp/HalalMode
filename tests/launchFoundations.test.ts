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

test('profile readiness separates what is required from what is recommended', () => {
  const complete = {
    firstName: 'Amina', city: 'Madinah', country: 'Saudi Arabia',
    bio: 'A considered profile with enough detail to introduce myself, my family, my faith and my hopes.',
    photoCount: 1, languages: ['en'], education: 'BSc', hasChildren: 'no', familyGoalsAnswered: true,
    religiousDress: 'hijab', gender: 'female', ethnicities: ['arab'], heritageCountries: ['LB', 'US'], ownHeightCm: 165, ownBuild: 'slim', preferencesSaved: true,
  };
  assert.deepEqual(getProfileReadiness(complete), { ready: true, missing: [], recommended: [] });
  // Everything past name, location, a bio and a photo is recommended, not required.
  // Religious dress is asked of women only.
  assert.deepEqual(getProfileReadiness({ ...complete, gender: 'female', religiousDress: undefined }), { ready: true, missing: [], recommended: ['dress'] });
  assert.deepEqual(getProfileReadiness({ ...complete, gender: 'male', religiousDress: undefined }), { ready: true, missing: [], recommended: [] });
  assert.deepEqual(getProfileReadiness({ ...complete, bio: 'Too short to say much about anyone.' }).missing, ['bio']);
  assert.deepEqual(getProfileReadiness({}), {
    ready: false,
    missing: ['name', 'location', 'bio', 'photo'],
    recommended: ['languages', 'education', 'has_children', 'children_when', 'ethnicity', 'heritage', 'height', 'body_type'],
  });
});

test('server release flags map only known, enabled capabilities', () => {
  assert.deepEqual(
    mapServerReleaseFlags({ live_calling: true, premium_purchases: false, unknown_flag: true }),
    { ...defaultFeatureFlags, liveCalling: true }
  );
});
