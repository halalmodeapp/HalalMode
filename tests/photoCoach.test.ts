import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parsePhotoAdvice, photoAdviceInstructions } from '../supabase/functions/_shared/photoCoach.ts';

test('Halal Bot accepts only well-formed advice', () => {
  const advice = parsePhotoAdvice(JSON.stringify({ verdict: 'could_be_better', summary: 'Warm, but dark.', tips: ['Face a window.'] }));
  assert.equal(advice?.verdict, 'could_be_better');
  assert.deepEqual(advice?.tips, ['Face a window.']);

  assert.equal(parsePhotoAdvice('not json'), null);
  assert.equal(parsePhotoAdvice(JSON.stringify({ verdict: 'hot', summary: 'x', tips: [] })), null);
  assert.equal(parsePhotoAdvice(JSON.stringify({ verdict: 'good', summary: '  ', tips: [] })), null);
  assert.equal(parsePhotoAdvice(JSON.stringify({ verdict: 'good', summary: 'x', tips: 'y' })), null);
});

test('Halal Bot gives at most three tips', () => {
  const advice = parsePhotoAdvice(JSON.stringify({ verdict: 'replace', summary: 'x', tips: ['a', 'b', 'c', 'd'] }));
  assert.equal(advice?.tips.length, 3);
});

test('Halal Bot answers in the member\'s language', () => {
  assert.match(photoAdviceInstructions('ar'), /\bar\b/);
});
