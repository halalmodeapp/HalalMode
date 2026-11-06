/**
 * The backend with no Docker: real Postgres, every migration, and a small stand-in
 * for the parts Supabase provides (supabase-shim.sql). For running the simulation
 * on a laptop. CI uses the real Supabase image instead.
 *
 *   npm install --no-save pg embedded-postgres@17.11.0-beta.19
 *   node scripts/backend-sim/local/postgres.mjs     # leave running
 *   node scripts/backend-sim/run.mts --fresh --per-side 500
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Installed by hand for this tool, so it is not an app dependency.
const { default: EmbeddedPostgres } = await import('embedded-postgres');

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const dataDir = join(repo, 'node_modules/.backend-sim-postgres');
const require = createRequire(import.meta.url);
const pg = require('pg');
const url = 'postgres://postgres:postgres@127.0.0.1:54322/postgres';

// The migrations ask for these extensions by name; the shim supplies their contents.
const native = join(repo, 'node_modules/@embedded-postgres', `${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`, 'native');
const extensions = ['share/extension', 'share/postgresql/extension'].map((path) => join(native, path)).find(existsSync);
for (const name of ['pg_cron', 'pg_net', 'supabase_vault']) {
  writeFileSync(join(extensions, `${name}.control`), "comment='shim'\ndefault_version='1.0'\nrelocatable=true\n");
  writeFileSync(join(extensions, `${name}--1.0.sql`), '-- shim\n');
}

const fresh = !existsSync(join(dataDir, 'PG_VERSION'));
mkdirSync(dataDir, { recursive: true });
const server = new EmbeddedPostgres({
  databaseDir: dataDir, user: 'postgres', password: 'postgres', port: 54322, persistent: true,
  postgresFlags: ['-c', 'max_connections=200', '-c', 'shared_buffers=1GB', '-c', 'max_wal_size=4GB'],
});
if (fresh) await server.initialise();
await server.start();

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('create table if not exists public.__applied (name text primary key)');
const applied = new Set((await client.query('select name from public.__applied')).rows.map((row) => row.name));
if (!applied.has('shim')) {
  await client.query(readFileSync(join(here, 'supabase-shim.sql'), 'utf8'));
  await client.query("insert into public.__applied values ('shim')");
}
const migrations = join(repo, 'supabase/migrations');
let count = 0;
for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue;
  await client.query('begin');
  await client.query(readFileSync(join(migrations, file), 'utf8'));
  await client.query('insert into public.__applied values ($1)', [file]);
  await client.query('commit');
  count += 1;
}
await client.end();
console.log(`ready on ${url}, ${count} migrations applied`);
setInterval(() => {}, 1 << 30);
