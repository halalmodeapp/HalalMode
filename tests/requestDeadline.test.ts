import assert from 'node:assert/strict';
import test from 'node:test';
import { withDeadline } from '../src/lib/withDeadline';

test('a never-settling request releases its caller at the deadline', async () => {
  await assert.rejects(withDeadline(new Promise(() => {}), 5), /timed out/);
});

test('a late response cannot continue profile state updates after timeout', async () => {
  let resolve!: (value: string) => void;
  let applied = false;
  const work = new Promise<string>(done => { resolve = done; });
  const caller = async () => {
    await withDeadline(work, 5);
    applied = true;
  };
  await assert.rejects(caller(), /timed out/);
  resolve('late profile');
  await Promise.resolve();
  assert.equal(applied, false);
});

test('completed and failed requests preserve their outcomes', async () => {
  assert.equal(await withDeadline(Promise.resolve('ready'), 1000), 'ready');
  await assert.rejects(withDeadline(Promise.reject(new Error('offline')), 1000), /offline/);
});
