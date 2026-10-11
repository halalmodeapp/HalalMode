/**
 * Database contracts without Docker.
 *
 * Starts a throwaway Postgres 17 from the embedded-postgres package, lays down
 * what a fresh Supabase database provides (baseline.sql, plus stand-ins for
 * pg_cron, pg_net and supabase_vault), replays supabase/migrations in filename
 * order exactly as `supabase db reset` does, then runs every
 * supabase/tests/database/*.test.sql file and reads its TAP output.
 *
 * Run:   npm run db:test
 *        npm run db:test -- 0190 0047      only files whose names contain these
 *        npm run db:test -- --verbose      also print Postgres' own log
 *
 * Nothing is written outside a temporary directory, and nothing ever connects
 * to a Supabase project.
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const supabaseDir = resolve(here, '..', '..');
const migrationsDir = join(supabaseDir, 'migrations');
const testsDir = join(supabaseDir, 'tests', 'database');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const filters = args.filter((arg) => !arg.startsWith('--'));

const PASSWORD = 'postgres';

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

// Where this platform's binaries keep extension files: share/extension on
// Windows, share/postgresql/extension on Linux and macOS.
function findExtensionDir(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    if (entry.name === 'extension' && existsSync(join(dir, 'plpgsql.control'))) return dir;
    const found = findExtensionDir(dir);
    if (found) return found;
  }
  return null;
}

// The stand-in extensions go where Postgres looks for extension files, inside
// the platform's binary package.
async function installStandInExtensions() {
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const binaries = await import(`@embedded-postgres/${platform}-${process.arch}`);
  const extensionDir = findExtensionDir(resolve(dirname(binaries.postgres), '..', 'share'));
  if (!extensionDir) throw new Error('Could not find the Postgres extension directory');
  const source = join(here, 'extensions');
  for (const file of readdirSync(source)) {
    copyFileSync(join(source, file), join(extensionDir, file));
  }
}

function lineOf(text, position) {
  if (!position) return null;
  return text.slice(0, Number(position) - 1).split('\n').length;
}

function describeError(error, text) {
  const line = lineOf(text, error.position);
  return [
    `${error.severity ?? 'ERROR'}: ${error.message}${error.code ? ` (${error.code})` : ''}`,
    line ? `  at line ${line}` : null,
    error.detail ? `  DETAIL: ${error.detail}` : null,
    error.hint ? `  HINT: ${error.hint}` : null,
    error.where ? `  CONTEXT: ${error.where.split('\n').join('\n           ')}` : null,
  ].filter(Boolean).join('\n');
}

async function connect(port) {
  const client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password: PASSWORD, database: 'postgres' });
  await client.connect();
  return client;
}

async function applyMigrations(port) {
  const client = await connect(port);
  try {
    await client.query(readFileSync(join(here, 'baseline.sql'), 'utf8'));
    await client.query(`alter database postgres set search_path to "$user", public, extensions`);

    const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const text = readFileSync(join(migrationsDir, file), 'utf8');
      try {
        // One simple-protocol query: the file runs as one implicit transaction
        // unless it manages its own, as with the Supabase CLI.
        await client.query(text);
      } catch (error) {
        console.error(`\nMigration ${file} failed.\n${describeError(error, text)}`);
        return false;
      }
      const [, version, name] = file.match(/^([^_]+)_(.*)\.sql$/) ?? [null, file, ''];
      await client.query(
        'insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)',
        [version, name]
      );
    }
    await client.query(readFileSync(join(here, 'tap.sql'), 'utf8'));
    console.log(`Applied ${files.length} migrations.`);
    return true;
  } finally {
    await client.end();
  }
}

function summarise(lines) {
  let planned = null;
  let ran = 0;
  const failures = [];
  for (const line of lines) {
    const plan = line.match(/^1\.\.(\d+)/);
    if (plan) planned = Number(plan[1]);
    if (/^ok \d+/.test(line)) ran += 1;
    if (/^not ok \d+/.test(line)) {
      ran += 1;
      failures.push(line);
    }
  }
  return { planned, ran, failures };
}

async function runTest(port, file) {
  const text = readFileSync(join(testsDir, file), 'utf8');
  // A fresh session per file, as pg_prove gives each file its own psql.
  const client = await connect(port);
  const lines = [];
  client.on('notice', (notice) => {
    if (notice.message?.startsWith('tap: ')) lines.push(...notice.message.slice(5).split('\n'));
  });
  let died = null;
  try {
    await client.query(text);
  } catch (error) {
    died = describeError(error, text);
  } finally {
    await client.end().catch(() => {});
  }
  const { planned, ran, failures } = summarise(lines);
  const ok = !died && failures.length === 0 && planned !== null && planned === ran;
  return { file, ok, planned, ran, failures, died, lines };
}

async function main() {
  const testFiles = readdirSync(testsDir)
    .filter((file) => file.endsWith('.test.sql'))
    .filter((file) => filters.length === 0 || filters.some((filter) => file.includes(filter)))
    .sort();
  if (testFiles.length === 0) {
    console.error(`No test files match: ${filters.join(', ')}`);
    process.exit(1);
  }

  await installStandInExtensions();
  const databaseDir = mkdtempSync(join(tmpdir(), 'halal-mode-db-'));
  const port = await freePort();
  const postgres = new EmbeddedPostgres({
    databaseDir,
    port,
    user: 'postgres',
    password: PASSWORD,
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: verbose ? (message) => process.stdout.write(String(message)) : () => {},
    onError: (message) => process.stderr.write(String(message)),
  });

  let exitCode = 1;
  try {
    await postgres.initialise();
    await postgres.start();
    if (await applyMigrations(port)) {
      let passedFiles = 0;
      let assertions = 0;
      const failed = [];
      for (const file of testFiles) {
        const result = await runTest(port, file);
        assertions += result.ran;
        if (result.ok) {
          passedFiles += 1;
          console.log(`${file.padEnd(62, ' .')} ok`);
          continue;
        }
        failed.push(result);
        console.log(`${file.padEnd(62, ' .')} FAILED`);
        for (const line of result.lines.filter((line) => line.startsWith('not ok') || line.startsWith('#'))) {
          console.log(`    ${line}`);
        }
        if (result.died) console.log(`    died: ${result.died.split('\n').join('\n          ')}`);
        if (result.planned !== result.ran) {
          console.log(`    planned ${result.planned ?? 'no'} tests, ran ${result.ran}`);
        }
      }
      console.log(`\nFiles=${testFiles.length}, Passed=${passedFiles}, Assertions=${assertions}`);
      console.log(failed.length === 0 ? 'Result: PASS' : `Result: FAIL (${failed.map((r) => r.file).join(', ')})`);
      exitCode = failed.length === 0 ? 0 : 1;
    }
  } finally {
    await postgres.stop().catch(() => {});
    rmSync(databaseDir, { recursive: true, force: true });
  }
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
