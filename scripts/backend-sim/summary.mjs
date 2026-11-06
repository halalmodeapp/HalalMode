/**
 * Turns a simulation report into something a person can read, and fails when the
 * backend broke a promise: a broken invariant, an unexplained error, a lost round.
 *
 *   node scripts/backend-sim/summary.mjs sim-results/report.json
 */

import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { meta, days } = report;
const lines = [];
const out = (text = '') => lines.push(text);
const sum = (pick) => days.reduce((total, day) => total + (pick(day) ?? 0), 0);
const last = days[days.length - 1];
const members = meta.perSide * 2;
const pct = (part, whole) => (whole ? `${((100 * part) / whole).toFixed(1)}%` : '-');

out(`# ${meta.matcher} matcher, ${meta.perSide} v ${meta.perSide}, ${days.length} of ${meta.days} days, ${meta.scenario} behaviour`);
out();
out(`A simulated day took ${meta.dayMinutes} minutes (${meta.compression}x real time) over ${meta.pool} connections.`);
out();

out('## Each day');
out();
out('| Day | Round | Pairs | Pool | Wall s | Edge CPU s | Edge MB | Visits | Sets seen | Submitted | Matches | Blocked by owed | Messages | Worst lag s |');
out('|---:|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const { day, generation: g, played: p } of days) {
  out(`| ${day} | ${g.ok ? 'ok' : 'FAILED'} | ${g.pairs} | ${g.pool ?? '-'} | ${(g.wallMs / 1000).toFixed(1)} | ${g.edgeCpuMs === undefined ? '-' : (g.edgeCpuMs / 1000).toFixed(1)} | ${g.edgeHeapMb ?? '-'} | ${p.sessions} | ${p.setsSeen} | ${p.submitted} | ${p.mutualsLive} | ${p.blockedByOwed} | ${p.messages} | ${(p.worstLagMs / 1000).toFixed(1)} |`);
}
out();

const matches = sum((d) => d.played.mutualsLive) + sum((d) => d.played.mutualsQueued);
const f = last?.facts ?? {};
out('## Do they actually connect?');
out();
out(`- ${matches} matches among ${members} members (${(matches * 2 / members / Math.max(1, days.length)).toFixed(3)} per member per day).`);
out(`- Connections now: ${f.stage_choosing} choosing questions, ${f.stage_answering} answering, ${f.stage_recap} at recap, ${f.stage_open} open, ${f.queued_mutuals} waiting for a free slot.`);
out(`- Both people have written in ${f.both_wrote} of ${f.connections_total} connections (${pct(f.both_wrote, f.connections_total)}).`);
out(`- ${f.members_at_capacity} members are at their open-connection limit, so get no new sets.`);
out();

out('## Slowest calls (ms)');
out();
out('| Function | Calls | p50 | p95 | p99 | Max |');
out('|:--|---:|---:|---:|---:|---:|');
const ranked = Object.entries(report.latencyMs ?? {}).sort((a, b) => b[1].p95 - a[1].p95).slice(0, 12);
for (const [fn, l] of ranked) out(`| ${fn} | ${l.calls} | ${l.p50} | ${l.p95} | ${l.p99} | ${l.max} |`);
out();
out(`Waiting for a free connection: p95 ${report.poolWaitMs?.p95} ms, max ${report.poolWaitMs?.max} ms.`);
out();

out('## How full the sets were');
out();
out('| Day | Members in the round | Fewer than 5 | None |');
out('|---:|---:|---:|---:|');
for (const { day, facts } of days) {
  const sets = facts.set_sizes_today ?? [];
  const total = sets.reduce((sum, row) => sum + Number(row.members), 0);
  const under = sets.filter((row) => Number(row.size) < 5).reduce((sum, row) => sum + Number(row.members), 0);
  const none = sets.filter((row) => Number(row.size) === 0).reduce((sum, row) => sum + Number(row.members), 0);
  out(`| ${day} | ${total} | ${pct(under, total)} | ${pct(none, total)} |`);
}
out();

if (report.fairness) {
  out('## Who gets matched');
  out();
  out(`${pct(report.fairness.everMatchedShare, 1)} of members matched at least once. By hidden appeal, lowest tenth first:`);
  out();
  out('| Decile | Mean matches | No match |');
  out('|---:|---:|---:|');
  for (const d of report.fairness.byAppealDecile) out(`| ${d.decile} | ${d.meanMatches} | ${pct(d.noMatchShare, 1)} |`);
  out();
}

const problems = [];
for (const d of days) {
  if (!d.generation.ok) problems.push(`Day ${d.day}: the round failed: ${d.generation.error}`);
  for (const [name, count] of Object.entries(d.invariants)) {
    if (count > 0) problems.push(`Day ${d.day}: invariant ${name} broken ${count} times`);
  }
}
// The chat rate limit works in real seconds, so compressing a day trips it by design.
for (const [what, count] of Object.entries(report.errors ?? {})) {
  if (!what.includes('Please wait before sending')) problems.push(`${count} x ${what}`);
}
if (days.length < meta.days) problems.push(`Only ${days.length} of ${meta.days} days finished`);

const limits = [...new Set(days.flatMap((d) => d.generation.breaches ?? []).map((b) => b.replace(/\d+(ms|MB)/, 'N$1')))];
const over = Object.entries(report.overStatementLimit ?? {});
out('## Over a production limit');
out();
if (!limits.length && !over.length) out('Nothing.');
for (const limit of limits) out(`- ${limit}`);
for (const [fn, o] of over) out(`- ${fn}: ${o.calls} calls over its ${o.limitMs} ms statement limit, worst ${o.worstMs} ms`);
out();

out('## What went wrong');
out();
out(problems.length ? problems.map((p) => `- ${p}`).join('\n') : 'Nothing: every invariant held and no call failed.');

console.log(lines.join('\n'));
process.exitCode = problems.length ? 1 : 0;
