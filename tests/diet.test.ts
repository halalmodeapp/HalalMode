import assert from 'node:assert/strict';
import test from 'node:test';

import { DIETS, GREW_UP_MAX, toggleDiet } from '../src/data/diet';

test('there are five diets, and a member can grew up in up to two countries', () => {
  assert.deepEqual([...DIETS], ['halal_only', 'sometimes_non_halal', 'vegetarian', 'pescatarian', 'vegan']);
  assert.equal(GREW_UP_MAX, 2);
});

test('halal only and sometimes non-halal replace each other', () => {
  assert.deepEqual(toggleDiet(['halal_only'], 'sometimes_non_halal'), ['sometimes_non_halal']);
  assert.deepEqual(toggleDiet(['sometimes_non_halal', 'vegetarian'], 'halal_only'), ['vegetarian', 'halal_only']);
});

test('every other diet can be held together', () => {
  assert.deepEqual(toggleDiet(['halal_only'], 'vegetarian'), ['halal_only', 'vegetarian']);
  assert.deepEqual(toggleDiet(['vegetarian'], 'vegan'), ['vegetarian', 'vegan']);
  assert.deepEqual(toggleDiet(['sometimes_non_halal'], 'pescatarian'), ['sometimes_non_halal', 'pescatarian']);
});

test('choosing a chosen diet removes it', () => {
  assert.deepEqual(toggleDiet(['halal_only', 'vegan'], 'vegan'), ['halal_only']);
});
