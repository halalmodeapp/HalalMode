import assert from 'node:assert/strict';
import test from 'node:test';

import { namesFromIdentity } from '../src/lib/identityNames';

test('a Google sign-in fills both names', () => {
  assert.deepEqual(
    namesFromIdentity({ full_name: 'Maryam Khan', given_name: 'Maryam', email: 'm@x.com' }),
    { fullName: 'Maryam Khan', firstName: 'Maryam' },
  );
});

test('without a given name, the first word of the full name is used', () => {
  assert.deepEqual(namesFromIdentity({ name: 'Yusuf Ali' }), { fullName: 'Yusuf Ali', firstName: 'Yusuf' });
});

test('an email address is never mistaken for a name', () => {
  // Apple sometimes sends nothing but an email.
  assert.deepEqual(namesFromIdentity({ full_name: 'hidden@privaterelay.appleid.com' }), {});
});

test('no provider data leaves both boxes empty rather than guessing', () => {
  assert.deepEqual(namesFromIdentity(undefined), {});
  assert.deepEqual(namesFromIdentity({}), {});
  assert.deepEqual(namesFromIdentity({ full_name: 42 }), {});
});
