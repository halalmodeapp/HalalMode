import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acceptableStatuses,
  declarableStatuses,
  DEFAULT_ACCEPTED,
  isDeclarable,
  maritalStatusesAllow,
  MARITAL_TONES,
} from '../src/data/marital';

test('only a man can declare that he is currently married', () => {
  assert.deepEqual(declarableStatuses('male'), ['never_married', 'divorced', 'widowed', 'married']);
  assert.deepEqual(declarableStatuses('female'), ['never_married', 'divorced', 'widowed']);
  assert.equal(isDeclarable('female', 'married'), false);
  assert.equal(isDeclarable('male', 'married'), true);
  assert.equal(isDeclarable('male', null), false);
});

test('only a woman can be open to a man who is already married', () => {
  assert.ok(acceptableStatuses('female').includes('married'));
  assert.ok(!acceptableStatuses('male').includes('married'));
});

test('a new member is not open to a married man until she chooses it', () => {
  assert.ok(!DEFAULT_ACCEPTED.includes('married'));
});

test('an introduction needs each status to be one the other is open to', () => {
  const man = (status: 'never_married' | 'married', accepted = DEFAULT_ACCEPTED) => ({ status, accepted });
  const woman = (status: 'never_married' | 'divorced', accepted = DEFAULT_ACCEPTED) => ({ status, accepted });
  assert.equal(maritalStatusesAllow(man('never_married'), woman('divorced')), true);
  // A currently married man is only shown to a woman who opted in.
  assert.equal(maritalStatusesAllow(man('married'), woman('divorced')), false);
  assert.equal(maritalStatusesAllow(man('married'), woman('divorced', [...DEFAULT_ACCEPTED, 'married'])), true);
  // Both directions count: she accepts him, but he does not accept divorced women.
  assert.equal(maritalStatusesAllow(man('never_married', ['never_married']), woman('divorced')), false);
});

test('someone who has not declared a status is never introduced', () => {
  assert.equal(maritalStatusesAllow({ status: null, accepted: DEFAULT_ACCEPTED }, { status: 'never_married', accepted: DEFAULT_ACCEPTED }), false);
});

test('no status is shown in a warning colour', () => {
  for (const tone of Object.values(MARITAL_TONES)) {
    assert.doesNotMatch(tone.text, /^#(?:[c-f][0-9a-f])(?:[0-4][0-9a-f]){2}$/i, 'text is never red');
    assert.doesNotMatch(tone.background, /^rgba\((?:2[0-5]\d|1[89]\d),\s*[0-5]?\d,\s*[0-5]?\d/);
  }
});
