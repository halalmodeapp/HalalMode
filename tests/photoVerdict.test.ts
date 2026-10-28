import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decidePhoto,
  decideSelfie,
  parsePhotoReading,
  parseSelfieReading,
  type PhotoReading,
  type SelfieReading,
} from '../supabase/functions/_shared/photoVerdict.ts';

const selfie = (over: Partial<SelfieReading> = {}): SelfieReading => ({
  face_count: 1,
  face_clearly_visible: true,
  shows_screen_or_print: false,
  not_a_camera_photo: false,
  confidence: 0.9,
  ...over,
});

const photo = (over: Partial<PhotoReading> = {}): PhotoReading => ({
  shows_screen_or_print: false,
  not_a_camera_photo: false,
  face_visible: true,
  same_person_as_selfie: 'yes',
  confidence: 0.9,
  ...over,
});

test('a clear single-face selfie is verified', () => {
  assert.equal(decideSelfie(selfie()).decision, 'allow');
});

test('a selfie of a screen or a print is rejected', () => {
  assert.equal(decideSelfie(selfie({ shows_screen_or_print: true })).decision, 'remove');
  assert.equal(decideSelfie(selfie({ not_a_camera_photo: true })).decision, 'remove');
});

test('a selfie needs exactly one clear face', () => {
  assert.equal(decideSelfie(selfie({ face_count: 0 })).decision, 'remove');
  assert.equal(decideSelfie(selfie({ face_clearly_visible: false })).decision, 'remove');
  assert.equal(decideSelfie(selfie({ face_count: 2 })).decision, 'remove');
});

test('a doubtful or missing reading of a selfie goes to a person, not to rejection', () => {
  assert.equal(decideSelfie(selfie({ confidence: 0.3 })).decision, 'review');
  assert.equal(decideSelfie(null).decision, 'review');
});

test('a photo of a screen or a print comes off the profile', () => {
  assert.equal(decidePhoto(photo({ shows_screen_or_print: true })).decision, 'remove');
  assert.equal(decidePhoto(photo({ not_a_camera_photo: true })).decision, 'remove');
});

test('an unsure model never removes a photo', () => {
  assert.equal(decidePhoto(photo({ shows_screen_or_print: true, confidence: 0.3 })).decision, 'allow');
  assert.equal(decidePhoto(null).decision, 'allow');
});

test('a confident mismatch with the selfie goes to review, never straight to removal', () => {
  assert.equal(decidePhoto(photo({ same_person_as_selfie: 'no' })).decision, 'review');
  assert.equal(decidePhoto(photo({ same_person_as_selfie: 'no', confidence: 0.6 })).decision, 'allow');
  assert.equal(decidePhoto(photo({ same_person_as_selfie: 'unsure' })).decision, 'allow');
});

test('a photo with no face is allowed', () => {
  assert.equal(
    decidePhoto(photo({ face_visible: false, same_person_as_selfie: 'not_compared' })).decision,
    'allow',
  );
});

test('readings that are not the schema are ignored', () => {
  assert.equal(parseSelfieReading(''), null);
  assert.equal(parseSelfieReading('I cannot help with that.'), null);
  assert.equal(parseSelfieReading(JSON.stringify({ ...selfie(), confidence: 2 })), null);
  assert.equal(parsePhotoReading(JSON.stringify({ ...photo(), same_person_as_selfie: 'maybe' })), null);
  assert.deepEqual(parseSelfieReading(JSON.stringify(selfie())), selfie());
  assert.deepEqual(parsePhotoReading(JSON.stringify(photo())), photo());
});
