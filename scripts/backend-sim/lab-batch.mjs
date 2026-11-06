/**
 * Runs a grid of lab experiments across processes and prints the averages.
 *
 *   node scripts/backend-sim/lab-batch.mjs out.jsonl members=2000 days=30 cohort=london men=0.5 \
 *     seeds=1,2,3 tastes=appeal,chemistry methods=all+slot,tables500+slot
 */
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { cpus } from 'node:os';

const [out, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.map((pair) => pair.split('=')));
const list = (name, fallback) => (args[name] ?? fallback).split(',');
const methods = list('methods', 'league1000x5+slot@elastic,league1000x5+random@elastic');
const tastes = list('tastes', 'appeal,chemistry,statedUseless,superstars');
const seeds = list('seeds', '1,2,3');
const members = args.members ?? '2000';
const days = args.days ?? '30';
const cohort = args.cohort ?? 'city';
const men = args.men ?? '0.5';

const label = (m, t, s) => `${m}|${t}|${s}|${members}|${days}|${cohort}|${men}`;
const done = new Set(existsSync(out) ? readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((line) => {
  const r = JSON.parse(line);
  return `${r.method}|${r.taste}|${r.seed}|${r.members}|${r.days}|${r.cohort}|${r.menShare}`;
}) : []);

const jobs = [];
for (const m of methods) for (const t of tastes) for (const s of seeds) if (!done.has(label(m, t, s))) jobs.push([m, t, s]);

let running = 0;
const width = Math.max(1, Math.min(cpus().length - 2, Number(args.parallel ?? 8)));
await new Promise((resolve) => {
  const next = () => {
    if (!jobs.length && !running) return resolve();
    while (running < width && jobs.length) {
      const [m, t, s] = jobs.shift();
      running += 1;
      const child = spawn(process.execPath, ['scripts/backend-sim/lab.mts', '--method', m, '--taste', t, '--seed', s, '--members', members, '--days', days, '--cohort', cohort, '--men', men], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_NO_WARNINGS: '1' } });
      let text = '';
      let errors = '';
      child.stdout.on('data', (d) => { text += d; });
      child.stderr.on('data', (d) => { errors += d; });
      child.on('close', () => {
        running -= 1;
        if (text.trim()) appendFileSync(out, text.trim() + '\n');
        else console.error(`failed ${m} ${t} ${s}: ${errors.slice(0, 400)}`);
        next();
      });
    }
  };
  next();
});
