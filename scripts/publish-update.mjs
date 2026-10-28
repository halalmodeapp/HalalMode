/**
 * Sends the app's code to the phones that already have the preview APK, over
 * the air. One command:
 *
 *   npm run update:phone -- "what changed"
 *
 * The installed APK only accepts updates made for its own runtime version, which
 * is written in .eas/installed-runtime.txt. When a new APK is installed, put
 * its runtime version there (`eas build:view <id>` shows it).
 *
 * Native changes (icon, splash, new native libraries) cannot go this way: they
 * need a new APK.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// Quoted, because on Windows the command goes through a shell that splits words.
const message = `"${(process.argv.slice(2).join(' ').replace(/["%^&|<>]/g, '').trim() || 'Update')}"`;
const runtime = readFileSync('.eas/installed-runtime.txt', 'utf8').trim();
if (!/^[0-9a-f]{40}$/.test(runtime)) throw new Error('.eas/installed-runtime.txt must hold the 40-character runtime version');

// The same settings the preview-arm64 build used, so the app talks to the same backend.
const eas = JSON.parse(readFileSync('eas.json', 'utf8')).build;
Object.assign(process.env, eas.preview.env, eas['preview-arm64'].env);

const original = readFileSync('app.json', 'utf8');
const pinned = original.replace(/"runtimeVersion":\s*\{[^}]*\}/, `"runtimeVersion": "${runtime}"`);
if (pinned === original) throw new Error('Could not set the runtime version in app.json');
writeFileSync('app.json', pinned);
try {
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['eas-cli', 'update', '--channel', 'preview', '--environment', 'preview', '--platform', 'android', '--message', message, '--non-interactive'],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
} finally {
  writeFileSync('app.json', original);
}
console.log(`\nPublished for runtime ${runtime}. On the phone: close the app fully and open it twice.`);
