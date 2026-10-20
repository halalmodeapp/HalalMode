import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type AppConfig = {
  expo?: {
    runtimeVersion?: { policy?: string };
    scheme?: string;
  };
};

// An over-the-air update only reaches installed apps whose native code it was
// built against, so .eas/workflows can publish on every push without crashing
// an older APK.
test('native updates are tied to the native code fingerprint', () => {
  const config = JSON.parse(readFileSync(resolve(process.cwd(), 'app.json'), 'utf8')) as AppConfig;
  assert.equal(config.expo?.runtimeVersion?.policy, 'fingerprint');
  assert.equal(config.expo?.scheme, 'halalmode');
});
