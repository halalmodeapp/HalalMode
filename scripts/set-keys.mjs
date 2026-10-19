/**
 * Asks for the three secret keys one at a time, then:
 *   1. stores RESEND_API_KEY and OPENAI_API_KEY as Supabase function secrets,
 *   2. turns on sign-in emails through Resend (SMTP),
 *   3. turns on Google sign-in with the Halal Mode Web client.
 *
 * Run:  npm run set-keys
 * Press Enter on any question to skip it. Secrets are not echoed or passed as
 * command-line arguments. Temporary secret/config files are deleted straight
 * after the relevant Supabase CLI call.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const PROJECT = 'lfuuywsmydruvqkqwvzw';
const GOOGLE_CLIENT_ID = '133411707691-be2uc3gudlki9cg8l2fv6lq6odqqqj3v.apps.googleusercontent.com';

const NEWLINE = String.fromCharCode(10);

const lines = process.stdin.isTTY
  ? undefined
  : createInterface({ input: process.stdin, output: process.stdout });

async function askHidden(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return (await lines?.question(question) ?? '').trim();
  }

  process.stdout.write(question);
  const stdin = process.stdin;
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.off('error', onError);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const finish = () => {
      cleanup();
      process.stdout.write(NEWLINE);
      resolve(value.trim());
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          cleanup();
          process.stdout.write(NEWLINE);
          reject(new Error('Input cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\b' || character === '\u007f') {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
      }
    };
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
    stdin.once('error', onError);
  });
}

const ask = (question) => askHidden(question);

function removeTemporaryDirectory(dir) {
  rmSync(dir, { recursive: true, force: true });
};

function run(args, env = {}) {
  const result = spawnSync('npx', ['supabase', ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return result.status === 0;
}

console.log('Halal Mode keys. Paste each key and press Enter. Press Enter alone to skip one.');
console.log('');
const resend = await ask('1 of 3. Resend API key, starting re_: ');
const openai = await ask('2 of 3. OpenAI API key, starting sk-: ');
const google = await ask('3 of 3. Google client secret, starting GOCSPX-: ');

const secrets = [];
if (resend) secrets.push(`RESEND_API_KEY=${resend}`);
if (openai) secrets.push(`OPENAI_API_KEY=${openai}`);
if (secrets.length) {
  const dir = mkdtempSync(join(tmpdir(), 'halalmode-secrets-'));
  try {
    const secretFile = join(dir, '.env');
    writeFileSync(secretFile, `${secrets.join(NEWLINE)}${NEWLINE}`, { encoding: 'utf8', mode: 0o600 });
    console.log(run(['secrets', 'set', '--project-ref', PROJECT, '--env-file', secretFile])
      ? 'Done: function keys stored.'
      : 'Problem: the function keys were not stored. Is the Supabase CLI signed in?');
  } finally {
    removeTemporaryDirectory(dir);
  }
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
    removeTemporaryDirectory(dir);
  }
}

console.log('');
lines?.close();
console.log('All finished. You can tell Claude it is done.');
process.exit(0);
