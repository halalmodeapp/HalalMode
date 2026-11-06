import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

function storageHarness() {
  const stored = new Map<string, string>();
  const exported = {} as {
    rememberReferralCode(code: string): Promise<void>;
    pendingReferralCode(member?: string, bind?: boolean): Promise<string | null>;
    forgetReferralCode(member?: string): Promise<void>;
    rememberMemberReferralCode(member: string, code: string): Promise<void>;
  };
  const source = readFileSync('src/lib/referralCode.ts', 'utf8').replace(/^import .*;\r?$/gm, '');
  const script = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(script, {
    exports: exported, window: {},
    AsyncStorage: {
      getItem: async (key: string) => stored.get(key) ?? null,
      setItem: async (key: string, value: string) => { stored.set(key, value); },
      removeItem: async (key: string) => { stored.delete(key); },
    },
  });
  return exported;
}

test('a pending invitation binds to its first account and cannot spill into another account', async () => {
  const storage = storageHarness();
  await storage.rememberReferralCode('HM12345678');
  assert.equal(await storage.pendingReferralCode('alice'), 'HM12345678');
  assert.equal(await storage.pendingReferralCode('bob'), null);
  assert.equal(await storage.pendingReferralCode(), null);
  assert.equal(await storage.pendingReferralCode('alice', false), 'HM12345678');
});

test('retry lookup never consumes an unscoped invitation for a returning account', async () => {
  const storage = storageHarness();
  await storage.rememberReferralCode('HM12345678');
  assert.equal(await storage.pendingReferralCode('returning', false), null);
  assert.equal(await storage.pendingReferralCode(), 'HM12345678');
});

test('clearing one account after a terminal claim preserves another account retry', async () => {
  const storage = storageHarness();
  await storage.rememberMemberReferralCode('alice', 'HM12345678');
  await storage.rememberMemberReferralCode('bob', 'HMABCDEFGH');
  await storage.forgetReferralCode('alice');
  assert.equal(await storage.pendingReferralCode('alice', false), null);
  assert.equal(await storage.pendingReferralCode('bob', false), 'HMABCDEFGH');
});
