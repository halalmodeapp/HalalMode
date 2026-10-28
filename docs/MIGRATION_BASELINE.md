# Squashing the migrations into a clean baseline

There are more than 230 migrations. Several functions (the matcher, profile
readiness, report reasons) have been rewritten many times, and a few were
"restated" or patched by text replacement because the history had drifted from
production (see `20261020090000_restate_matching_functions.sql`). A baseline
makes the schema readable in one place and a fresh database much faster to
build.

It has to be produced from the live database, not from the migration files,
so it cannot be done on a machine without Docker and database access. Do it
once, on a machine that has both, in this order:

1. **Freeze.** Merge or park open work that touches `supabase/migrations`.
   Take a backup of production (Supabase dashboard, Database, Backups).
2. **Dump the schema from production.**
   `npx supabase db dump --linked --schema public,halal_mode_private -f supabase/baseline/schema.sql`
   Add the roles, extensions, cron jobs and storage buckets and policies the
   dump leaves out (`cron.job`, `storage.buckets`, `storage.objects` policies,
   the vault secret names the functions read).
3. **Squash.** Move the old migrations to `supabase/migrations_archive/`.
   Create `supabase/migrations/00000000000000_baseline.sql` from the dump.
   Keep any migration newer than the dump as it is.
4. **Prove it.** `supabase db reset --local && supabase test db`. All pgTAP
   tests must pass unchanged. Then compare the baseline database with
   production: `supabase db diff --linked` must be empty.
5. **Tell production the history changed**, without running anything:
   `supabase migration repair --status reverted <each old version>` and
   `supabase migration repair --status applied 00000000000000`.
6. **Never edit the baseline again.** New work is a new migration. If a function
   needs a change, restate it whole with `create or replace`, not by replacing
   text in `pg_get_functiondef`.

Why this was not done in the same pass as the other cleanups: step 4 needs the
local database stack, and a baseline that has not been compared with production
is worse than the history it replaces.
