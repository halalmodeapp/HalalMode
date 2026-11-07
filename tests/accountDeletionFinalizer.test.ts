import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { transpileModule } from 'typescript';

const source = readFileSync('supabase/functions/finalize-account-deletions/index.ts', 'utf8')
  .replace(/import \{ createClient \} from '[^']+';/, '');
const script = transpileModule(source, {}).outputText;
const member = '00000000-0000-0000-0000-000000022301';

async function finalize(failBucket?: string, failOperation?: 'list' | 'remove', claimExpired = false) {
  const calls: string[] = [];
  const files = new Map(['profile-photos', 'profile-photos-blurred', 'verification-selfies', 'voice-introductions'].map((bucket) => [
    bucket, Array.from({ length: 1001 }, (_, n) => `${n}.jpg`),
  ]));
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const client = {
    rpc: async (name: string) => {
      calls.push(name);
      return { error: null, data: name === 'verify_deletion_worker_secret' ? true
        : name === 'renew_account_deletion_claim_service' ? !claimExpired
        : name === 'claim_account_deletion_requests_fenced' ? [{ user_id: member, claim_token: 'test-claim', photo_paths: [`${member}/attached.jpg`], voice_path: `${member}/attached.m4a` }] : null };
    },
    storage: { from: (bucket: string) => ({
      list: async (folder: string, options: { limit: number; offset?: number }) => {
        assert.equal(folder, member);
        assert.equal(options.offset ?? 0, 0);
        calls.push(`list:${bucket}`);
        if (bucket === failBucket && failOperation === 'list') return { error: new Error('list failed'), data: null };
        return { error: null, data: (files.get(bucket) ?? []).slice(0, options.limit).map((name) => ({ name })) };
      },
      remove: async (paths: string[]) => {
        calls.push(`remove:${bucket}:${paths.length}`);
        if (bucket === failBucket && failOperation === 'remove') return { error: new Error('remove failed') };
        if (files.has(bucket)) {
          assert.ok(paths.every((path) => path.startsWith(`${member}/`)));
          const removed = new Set(paths);
          files.set(bucket, files.get(bucket)!.filter((name) => !removed.has(`${member}/${name}`)));
        }
        return { error: null };
      },
    }) },
    auth: { admin: { deleteUser: async (id: string) => {
      assert.equal(id, member);
      calls.push('deleteUser');
      return { error: null };
    } } },
  };
  runInNewContext(script, {
    createClient: () => client, Response, Error,
    Deno: { env: { get: () => 'test-placeholder' }, serve: (callback: typeof handler) => { handler = callback; } },
  });
  assert.ok(handler);
  const response = await handler(new Request('http://localhost/finalize', { method: 'POST' }));
  return { body: await response.json(), calls, files };
}

// The abandoned-upload sweep runs after every account, so it is left out when checking what came last.
const withoutSweep = (calls: string[]) => calls.filter((call) => call !== 'list_abandoned_profile_media_service');

test('finalization drains attached and orphan media from every bucket before deleting Auth', async () => {
  const { body, calls, files } = await finalize();
  assert.deepEqual(body, { claimed: 1, deleted: 1, failed: 0, abandoned: 0 });
  for (const bucket of ['profile-photos', 'profile-photos-blurred', 'verification-selfies', 'voice-introductions']) {
    assert.equal(files.get(bucket)!.length, 0);
    assert.ok(calls.includes(`remove:${bucket}:1000`));
    assert.ok(calls.includes(`remove:${bucket}:1`));
    assert.equal(calls.filter((call) => call === `list:${bucket}`).length, 3);
  }
  assert.equal(withoutSweep(calls).at(-1), 'deleteUser');
});

for (const bucket of ['profile-photos', 'profile-photos-blurred', 'verification-selfies', 'voice-introductions']) {
  for (const operation of ['list', 'remove'] as const) {
    test(`a ${bucket} ${operation} failure leaves deletion retryable`, async () => {
      const { body, calls } = await finalize(bucket, operation);
      assert.deepEqual(body, { claimed: 1, deleted: 0, failed: 1, abandoned: 0 });
      assert.ok(!calls.includes('deleteUser'));
      assert.equal(withoutSweep(calls).at(-1), 'record_account_deletion_failure_fenced');
    });
  }
}

test('a worker that lost its deletion claim performs no media or Auth deletion', async () => {
  const { body, calls } = await finalize(undefined, undefined, true);
  assert.deepEqual(body, { claimed: 1, deleted: 0, failed: 1, abandoned: 0 });
  assert.ok(!calls.some(call => call.startsWith('remove:')));
  assert.ok(!calls.includes('deleteUser'));
});
