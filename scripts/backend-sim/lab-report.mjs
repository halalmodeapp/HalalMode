/**
 * Averages lab results across tastes and seeds, one table per cohort, and each method as a share of
 * the first method named: node scripts/backend-sim/lab-report.mjs out.jsonl [baseline-method]
 */
import { readFileSync } from 'node:fs';

const [file, baselineName] = process.argv.slice(2);
const rows = readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const mean = (items, key) => {
  const values = items.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
};
const fmt = (v, digits = 1) => (v === null || Number.isNaN(v) ? '-' : v.toFixed(digits));
const cohortKey = (r) => `${r.members} ${r.cohort}, men ${r.menShare}, ${r.days} days`;
const cohorts = [...new Set(rows.map(cohortKey))];

for (const cohort of cohorts) {
  const group = rows.filter((r) => cohortKey(r) === cohort);
  const methods = [...new Set(group.map((r) => r.method))];
  const baseline = baselineName && methods.includes(baselineName) ? baselineName : methods[0];
  const tastes = [...new Set(group.map((r) => r.taste))];
  console.log(`\n### ${cohort}. Matches as % of ${baseline}\n`);
  console.log('| Method | Matches % | Worst taste % | No match | Lowest tenth | Under 5 days % | Men | Women | Wide reach | Zero days % | Wide reach | 7-day empty, wide reach | Mean set | Repeats % | Abroad by answer | Age gap | ms/day | Worst table ms |');
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const method of methods) {
    const own = group.filter((r) => r.method === method);
    const ratios = tastes.map((t) => {
      const a = mean(own.filter((r) => r.taste === t), 'matches');
      const b = mean(group.filter((r) => r.method === baseline && r.taste === t), 'matches');
      return a !== null && b ? (100 * a) / b : null;
    }).filter((v) => v !== null);
    const abroad = [0, 1, 2].map((i) => fmt(mean(own.map((r) => ({ v: r.abroadByAnswer?.[i] ?? 0 })), 'v'), 0)).join('/');
    console.log(`| ${method} | ${fmt(ratios.reduce((s, v) => s + v, 0) / ratios.length)} | ${fmt(Math.min(...ratios), 0)} | ${fmt(mean(own, 'noMatch'))} | ${fmt(mean(own, 'noMatchBottomAppeal'))} | ${fmt(mean(own, 'under5'))} | ${fmt(mean(own, 'under5Men'))} | ${fmt(mean(own, 'under5Women'))} | ${fmt(mean(own, 'under5WideReach'))} | ${fmt(mean(own, 'zeroDays'))} | ${fmt(mean(own, 'zeroDaysWideReach'))} | ${fmt(mean(own, 'spell7WideReach'))} | ${fmt(mean(own, 'meanIntros'), 2)} | ${fmt(mean(own, 'repeatShare'))} | ${abroad} | ${fmt(mean(own, 'ageGap'), 2)} | ${fmt(mean(own, 'computeMsPerDay'), 0)} | ${fmt(mean(own, 'worstTableMs'), 0)} |`);
  }
  console.log(`\nNarrow reach (fewer than 35 people possible): ${fmt(mean(group, 'narrowReachShare'))}% of members.`);
}
