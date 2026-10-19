import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = process.cwd();
const fontFiles = [
  'Beiruti_400Regular.ttf',
  'Beiruti_500Medium.ttf',
  'Beiruti_600SemiBold.ttf',
  'Beiruti_700Bold.ttf',
  'NotoSans_400Regular.ttf',
  'NotoSans_500Medium.ttf',
  'NotoSans_600SemiBold.ttf',
  'NotoSans_700Bold.ttf',
  'PlayfairDisplay_400Regular.ttf',
  'PlayfairDisplay_400Regular_Italic.ttf',
];

test('Expo web font assets are exported from the app asset tree, not node_modules', () => {
  const layout = readFileSync(`${root}/app/_layout.tsx`, 'utf8');
  const packageJson = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')) as {
    dependencies: Record<string, string>;
  };

  assert.doesNotMatch(layout, /@expo-google-fonts/);
  for (const fontFile of fontFiles) {
    assert.ok(layout.includes(`../assets/fonts/${fontFile}`), `${fontFile} is loaded by the app`);
    assert.ok(existsSync(`${root}/assets/fonts/${fontFile}`), `${fontFile} exists in the app asset tree`);
  }
  assert.equal(
    Object.keys(packageJson.dependencies).some((name) => name.startsWith('@expo-google-fonts/')),
    false,
    'unused package copies are not kept under node_modules',
  );
  for (const license of ['Beiruti-OFL.txt', 'Noto-Sans-OFL.txt', 'Playfair-Display-OFL.txt']) {
    assert.ok(existsSync(`${root}/assets/fonts/${license}`), `${license} accompanies the font assets`);
  }
});
