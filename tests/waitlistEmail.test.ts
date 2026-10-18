import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

type Checker = { check: (email: string) => { ok: boolean; suggestion: string } };

// The same script the landing page loads, run as a browser would run it.
const sandbox: { HalalWaitlistEmail?: Checker } = {};
runInNewContext(readFileSync('site/waitlist-email.js', 'utf8'), sandbox);
const { check } = sandbox.HalalWaitlistEmail!;
const migration = readFileSync('supabase/migrations/20261018120000_instant_waitlist_join.sql', 'utf8');

test('real addresses are accepted', () => {
  for (const email of [
    'ahmed.khan@gmail.com', 'Fatima.Ali@Outlook.co.uk', 'sara+halal@icloud.com', 'yusuf@company.io',
    'm.ibrahim@university.edu', 'aisha@mail.com', 'omar_88@yahoo.fr', 'x@x.com', 'nur@studio.design',
  ]) {
    assert.equal(check(email).ok, true, email);
  }
});

test('obviously made-up addresses are refused', () => {
  for (const email of [
    'blah@blah.blah', 'blahblahblah@blahblahblah.blahblahblah', 'asdf@asdf.com', 'test@test.com',
    'john@example.com', 'someone@mailinator.com', 'hi@yopmail.com', 'sdfgh@hjklm.com', 'aaaa@aaaa.com',
    'name@domain', 'a@b.c', 'no-at-sign.com', 'two@@signs.com', 'dots..here@gmail.com', 'me@site.invalid',
    'qwerty@qwerty.com', 'fake@fake.com',
  ]) {
    assert.equal(check(email).ok, false, email);
  }
});

test('common provider typos get a suggestion instead of a silent failure', () => {
  const typos: [string, string][] = [['ali@gmial.com', 'ali@gmail.com'], ['sara@hotmail.con', 'sara@hotmail.com'], ['omar@yahoo.con', 'omar@yahoo.com']];
  for (const [typed, meant] of typos) {
    const result = check(typed);
    assert.equal(result.ok, false, typed);
    assert.equal(result.suggestion, meant, typed);
  }
});

test('the browser and database lists stay in step', () => {
  const source = readFileSync('site/waitlist-email.js', 'utf8');
  for (const domain of ['mailinator.com', 'yopmail.com', 'example.com', 'gmial.com', 'hotmail.con']) {
    assert.ok(source.includes(`'${domain}'`), `browser list has ${domain}`);
    assert.ok(migration.includes(`'${domain}'`), `database list has ${domain}`);
  }
  for (const tld of ['academy', 'online', 'email', 'shop']) {
    assert.ok(source.includes(`'${tld}'`) && migration.includes(`'${tld}'`), tld);
  }
});
