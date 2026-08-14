import assert from 'node:assert/strict';
import test from 'node:test';

import { flattenGroups, searchGroups, storedLabel } from '../src/data/catalogOption';
import { EDUCATION_GROUPS } from '../src/data/educationLevels';
import { OCCUPATION_GROUPS } from '../src/data/occupations';

const labels = (groups: readonly { options: readonly { en: string }[] }[]) =>
  groups.flatMap((group) => group.options.map((option) => option.en));

test('every option id is unique, because the id is what gets stored', () => {
  const ids = flattenGroups(OCCUPATION_GROUPS).map((option) => option.id);
  const inEducation = flattenGroups(EDUCATION_GROUPS).map((option) => option.id);
  assert.equal(new Set(ids).size, ids.length);
  // Education ids only have to be unique among themselves — the two lists are
  // never mixed, and both legitimately offer "prefer not to say".
  assert.equal(new Set(inEducation).size, inEducation.length);
});

test('searching finds an option wherever it sits', () => {
  assert.deepEqual(labels(searchGroups(OCCUPATION_GROUPS, 'midwife')), ['Midwife']);
  assert.ok(labels(searchGroups(OCCUPATION_GROUPS, 'teacher')).includes('Qur’an teacher'));
});

test('searching a group name keeps everything in that group', () => {
  const found = labels(searchGroups(OCCUPATION_GROUPS, 'healthcare'));
  assert.ok(found.includes('Nurse'));
  assert.ok(found.includes('Pharmacist'));
});

test('either language finds the same option', () => {
  assert.deepEqual(labels(searchGroups(OCCUPATION_GROUPS, 'ممرّض')), ['Nurse']);
  assert.deepEqual(labels(searchGroups(EDUCATION_GROUPS, 'دكتوراه')), ['Doctorate / PhD']);
});

test('case and punctuation do not have to match', () => {
  assert.ok(labels(searchGroups(EDUCATION_GROUPS, 'PHD')).includes('Doctorate / PhD'));
  assert.ok(labels(searchGroups(EDUCATION_GROUPS, 'bachelors')).includes('Bachelor’s degree'));
});

test('an empty query returns everything rather than nothing', () => {
  assert.equal(searchGroups(OCCUPATION_GROUPS, '   ').length, OCCUPATION_GROUPS.length);
});

test('a stored id reads in the viewer language, and free text survives', () => {
  assert.equal(storedLabel(OCCUPATION_GROUPS, 'nurse', 'en'), 'Nurse');
  assert.equal(storedLabel(OCCUPATION_GROUPS, 'nurse', 'ar'), 'ممرّض');
  // Written before the list existed. Showing it unchanged beats blanking it.
  assert.equal(storedLabel(OCCUPATION_GROUPS, 'Falconer', 'en'), 'Falconer');
  assert.equal(storedLabel(OCCUPATION_GROUPS, '', 'en'), '');
});
