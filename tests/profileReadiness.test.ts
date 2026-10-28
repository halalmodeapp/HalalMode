import assert from 'node:assert/strict';
import test from 'node:test';

import { getProfileReadiness, readinessSteps, recommendedSteps, REQUIRED_ISSUES } from '../src/lib/profileReadiness';

const bare = {
  firstName: 'Sara',
  city: 'London',
  country: 'United Kingdom',
  bio: 'x'.repeat(80),
  photoCount: 1,
};

test('a name, location, bio and photo are all that introductions need', () => {
  const result = getProfileReadiness(bare);
  assert.equal(result.ready, true);
  assert.deepEqual(result.missing, []);
});

test('every other answer is recommended, not required', () => {
  const result = getProfileReadiness(bare);
  assert.ok(result.recommended.includes('ethnicity'));
  assert.ok(result.recommended.includes('heritage'));
  assert.ok(result.recommended.includes('height'));
  assert.ok(result.recommended.includes('languages'));
  for (const issue of result.recommended) assert.ok(!REQUIRED_ISSUES.includes(issue));
});

test('a missing photo or bio still holds introductions back', () => {
  const result = getProfileReadiness({ ...bare, photoCount: 0, bio: '' });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ['bio', 'photo']);
});

test('the optional steps list only what is left, and men are not asked about dress', () => {
  const woman = recommendedSteps(getProfileReadiness({ ...bare, gender: 'female' }).recommended, 'female');
  const man = recommendedSteps(getProfileReadiness({ ...bare, gender: 'male' }).recommended, 'male');
  assert.ok(woman.some((step) => step.id === 'faith'));
  assert.ok(man.some((step) => step.id === 'background'));
  assert.ok(readinessSteps([], 'female').every((step) => step.done));
});
