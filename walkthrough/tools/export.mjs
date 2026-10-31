#!/usr/bin/env node
/*
 * Exports the walkthrough films to MP4, frame by frame, at an exact size.
 *
 *   node export.mjs --film a --size 1080x1920
 *   node export.mjs --film all --size all
 *
 * Options
 *   --film   a | b | c | all (or several, comma separated)   (default all)
 *   --size   one or more of the sizes below, comma separated, or "all"
 *            (default 1080x1920)
 *   --fps    frames per second                      (default 30)
 *   --no-music, --no-sfx                            leave either out of the mix
 *   --crf    x264 quality, lower is better          (default 18)
 *   --out    folder for the files                   (default ../exports)
 *
 * Every frame is rendered by the page itself (render(t) is a pure function of
 * time) and the soundtrack is mixed offline by the same code that plays it
 * live, so the file matches what you see and hear in the browser. Needs
 * Google Chrome (or Playwright's Chromium) and ffmpeg on the PATH; three.js
 * loads from its CDN, so it also needs a connection.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// width x height: vertical sizes use the 9:16 layout, wide ones the 16:9 layout.
const SIZES = {
  '1080x1920': 'TikTok, Reels, Shorts',
  '720x1280': 'vertical, smaller file',
  '2160x3840': 'vertical 4K',
  '1920x1080': 'website, YouTube',
  '1280x720': 'wide, smaller file',
  '3840x2160': 'wide 4K',
};

// ---------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (name, d) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = (name) => argv.includes('--' + name);
if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
  console.log('Sizes:\n' + Object.entries(SIZES).map(([k, v]) => `  ${k.padEnd(10)} ${v}`).join('\n'));
  process.exit(0);
}
const filmArg = opt('film', 'all').toLowerCase();
const films = filmArg === 'all' || filmArg === 'both' ? ['a', 'b', 'c'] : filmArg.split(',').map((f) => f.trim());
const sizeArg = opt('size', '1080x1920');
const sizes = sizeArg === 'all' ? Object.keys(SIZES) : sizeArg.split(',').map((s) => s.trim().toLowerCase());
const fps = Number(opt('fps', 30));
const crf = String(opt('crf', 18));
const music = !flag('no-music'), sfx = !flag('no-sfx');
const outDir = path.resolve(HERE, opt('out', '../exports'));
for (const f of films) if (!['a', 'b', 'c'].includes(f)) fail(`Unknown film "${f}". Use a, b, c or all.`);
for (const s of sizes) if (!/^\d+x\d+$/.test(s)) fail(`Size "${s}" should look like 1080x1920. Try --help for the list.`);

function fail(msg) { console.error(msg); process.exit(1); }

// ---------------------------------------------------------------- a small static server for the walkthrough folder
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.json': 'application/json' };
function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// ---------------------------------------------------------------- browser
function findChrome() {
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(local, 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const pw = path.join(local, 'ms-playwright');
  if (fs.existsSync(pw)) for (const d of fs.readdirSync(pw).filter((n) => n.startsWith('chromium-')).sort().reverse()) candidates.push(path.join(pw, d, 'chrome-win', 'chrome.exe'));
  return candidates.find((p) => fs.existsSync(p));
}

// ---------------------------------------------------------------- one film at one size
async function exportOne(browser, base, film, size) {
  const [w, h] = size.split('x').map(Number);
  const big = Math.max(w, h) > 1920 ? 2 : 1;               // 4K renders at 2x
  const format = h > w ? 'tiktok' : 'wide';
  const ctx = await browser.newContext({ viewport: { width: Math.round(w / big), height: Math.round(h / big) }, deviceScaleFactor: big });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('  page error:', e.message));
  await page.goto(`${base}/index.html?v=${film}&format=${format}&export=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.HM.ready);
  const dur = await page.evaluate(() => window.HM.duration);
  const mix = [music && 'music', sfx && 'sound effects'].filter(Boolean).join(' + ') || 'no sound';
  console.log(`Film ${film.toUpperCase()} at ${size} (${format === 'tiktok' ? '9:16' : '16:9'}), ${dur.toFixed(1)} s, ${fps} fps, ${mix}`);

  fs.mkdirSync(outDir, { recursive: true });
  const tag = music && sfx ? '' : music ? '-music-only' : sfx ? '-sfx-only' : '-silent';
  const out = path.join(outDir, `halal-mode-${film}-${size}${tag}.mp4`);
  let wav = null;
  if (music || sfx) {
    process.stdout.write('  mixing the soundtrack… ');
    const b64 = await page.evaluate((o) => window.HM.renderAudio(o), { music, sfx });
    wav = path.join(os.tmpdir(), `hm-${film}-${process.pid}.wav`);
    fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    console.log('done');
  }

  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (wav) args.push('-i', wav);
  args.push('-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps));
  if (wav) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited with ' + c)))); });

  const frames = Math.round(dur * fps), t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.HM.seek(t), i / fps);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 15 === 0 || i === frames - 1) {
      const pct = (i + 1) / frames, left = ((Date.now() - t0) / (i + 1)) * (frames - i - 1) / 1000;
      process.stdout.write(`\r  frames ${String(i + 1).padStart(5)} / ${frames}  ${(pct * 100).toFixed(0).padStart(3)}%  about ${Math.ceil(left)} s left   `);
    }
  }
  ff.stdin.end();
  await done;
  if (wav) fs.rmSync(wav, { force: true });
  await ctx.close();
  console.log(`\n  saved ${path.relative(process.cwd(), out)}`);
}

// ---------------------------------------------------------------- run
const chrome = findChrome();
if (!chrome) fail('Could not find Google Chrome. Install it, or set CHROME_PATH to a Chrome or Chromium executable.');
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars'] });
try {
  for (const film of films) for (const size of sizes) await exportOne(browser, base, film, size);
} catch (e) {
  console.error('\n' + (e && e.message ? e.message : e));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
