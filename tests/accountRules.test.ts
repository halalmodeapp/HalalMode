import assert from 'node:assert/strict';
import test from 'node:test';
import { farewellWords } from '../src/lib/farewell';
import { en } from '../src/i18n/catalog';
import type { Translate } from '../src/i18n';

const translate: Translate = (key, params) => en[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params?.[name] ?? ''));

test('a legacy close has a complete kind farewell without an invented reason', () => {
  assert.equal(farewellWords('generic', null, translate), 'Sorry, I don’t think we are a good match. I wish you the best.');
});

test('a chosen farewell still uses its reason or the member’s own words', () => {
  assert.equal(farewellWords('timing', null, translate), en['farewell.words'].replace('{{reason}}', en['farewell.timing']));
  assert.equal(farewellWords('other', 'I wish you well', translate), en['farewell.words'].replace('{{reason}}', 'I wish you well'));
});
