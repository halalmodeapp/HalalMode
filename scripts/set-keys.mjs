/**
 * Asks for the three secret keys one at a time (input is hidden), then:
 *   1. stores RESEND_API_KEY and OPENAI_API_KEY as Supabase function secrets,
 *   2. turns on sign-in emails through Resend (SMTP),
 *   3. turns on Google sign-in with the Halal Mode Web client.
 *
 * Run:  npm run set-keys
 * Press Enter on any question to skip it. Keys are never written to disk:
 * the auth settings are pushed from a temporary copy of supabase/config.toml
 * that is deleted straight after.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROJECT = 'lfuuywsmydruvqkqwvzw';
const GOOGLE_CLIENT_ID = '133411707691-be2uc3gudlki9cg8l2fv6lq6odqqqj3v.apps.googleusercontent.com';

const CTRL_C = String.fromCharCode(3);
const BACKSPACE = [String.fromCharCode(8), String.fromCharCode(127)];
const NEWLINE = String.fromCharCode(10);
const RETURN = String.fromCharCode(13);

// One reader for the whole run: a pasted key may arrive together with the
// Enter that ends it, or several answers may arrive at once.
let buffered = '';
let waiting = null;
process.stdin.setEncoding('utf8');
process.stdin.setRawMode?.(true);
process.stdin.on('data', (chunk) => {
  for (const ch of chunk) {
    if (ch === CTRL_C) process.exit(1);
    if (BACKSPACE.includes(ch)) buffered = buffered.slice(0, -1);
    else buffered += ch === RETURN ? NEWLINE : ch;
  }
  waiting?.();
});

function ask(question) {
  process.stdout.write(question);
  return new Promise((resolve) => {
    const check = () => {
      const end = buffered.indexOf(NEWLINE);
      if (end === -1) return;
      const answer = buffered.slice(0, end).trim();
      buffered = buffered.slice(end + 1);
      waiting = null;
      process.stdout.write(NEWLINE);
      resolve(answer);
    };
    waiting = check;
    check();
  });
}

function run(args, env = {}) {
  const result = spawnSync('npx', ['supabase', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return result.status === 0;
}

console.log('Halal Mode keys. Paste each key and press Enter. Nothing is shown as you paste. Press Enter alone to skip.');
console.log('');
const resend = await ask('1 of 3. Resend API key, starting re_: ');
const openai = await ask('2 of 3. OpenAI API key, starting sk-: ');
const google = await ask('3 of 3. Google client secret, starting GOCSPX-: ');

const secrets = [];
if (resend) secrets.push(`RESEND_API_KEY=${resend}`);
if (openai) secrets.push(`OPENAI_API_KEY=${openai}`);
if (secrets.length) {
  console.log(run(['secrets', 'set', '--project-ref', PROJECT, ...secrets])
    ? 'Done: function keys stored.'
    : 'Problem: the function keys were not stored. Is the Supabase CLI signed in?');
}

if (resend || google) {
  // A throwaway copy of the project config with the sign-in settings added.
  const dir = mkdtempSync(join(tmpdir(), 'halalmode-keys-'));
  try {
    cpSync('supabase', join(dir, 'supabase'), { recursive: true });
    let config = readFileSync(join(dir, 'supabase', 'config.toml'), 'utf8');
    if (resend) {
      config += [
        '',
        '[auth.email.smtp]',
        'enabled = true',
        'host = "smtp.resend.com"',
        'port = 465',
        'user = "resend"',
        'pass = "env(HM_SMTP_PASS)"',
        'admin_email = "welcome@halalmo.de"',
        'sender_name = "Halal Mode"',
        '',
      ].join(NEWLINE);
    }
    if (google) {
      config += [
        '',
        '[auth.external.google]',
        'enabled = true',
        `client_id = "${GOOGLE_CLIENT_ID}"`,
        'secret = "env(HM_GOOGLE_SECRET)"',
        '',
      ].join(NEWLINE);
    }
    writeFileSync(join(dir, 'supabase', 'config.toml'), config);
    const ok = run(['config', 'push', '--project-ref', PROJECT, '--workdir', dir, '--yes'], {
      HM_SMTP_PASS: resend,
      HM_GOOGLE_SECRET: google,
    });
    const what = [resend && 'sign-in emails through Resend', google && 'Google sign-in'].filter(Boolean).join(' and ');
    console.log(ok ? `Done: ${what} switched on.` : 'Problem: the sign-in settings were not saved.');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log('');
console.log('All finished. You can tell Claude it is done.');
process.exit(0);
