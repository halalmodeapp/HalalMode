-- Just enough of the Supabase platform for the repo's migrations to apply on bare Postgres.
do $$ declare r text; begin
  foreach r in array array['anon','authenticated','service_role','authenticator','supabase_auth_admin','supabase_storage_admin','supabase_admin','dashboard_user','pgbouncer','supabase_functions_admin'] loop
    if not exists (select 1 from pg_roles where rolname=r) then execute format('create role %I nologin',r); end if;
  end loop;
end $$;
alter role service_role bypassrls;
grant anon, authenticated, service_role to postgres;
create schema if not exists extensions; create schema if not exists auth; create schema if not exists storage;
create schema if not exists cron; create schema if not exists net; create schema if not exists vault;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
alter database postgres set search_path = "$user", public, extensions;
set search_path = public, extensions;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
create table auth.users(
  id uuid primary key default extensions.gen_random_uuid(), instance_id uuid, aud text, role text,
  email text unique, encrypted_password text, email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token text, confirmation_sent_at timestamptz, recovery_token text, recovery_sent_at timestamptz,
  email_change text, new_email text, email_change_token_new text, email_change_sent_at timestamptz, last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', is_super_admin boolean,
  phone text, phone_confirmed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
  banned_until timestamptz, deleted_at timestamptz, is_sso_user boolean default false, is_anonymous boolean default false);
create table auth.mfa_factors(id uuid primary key, user_id uuid references auth.users(id) on delete cascade, status text, factor_type text);
create table auth.identities(id uuid primary key default extensions.gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, provider text, provider_id text, identity_data jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
create table auth.sessions(id uuid primary key default extensions.gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now());
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
create function auth.email() returns text language sql stable as $$ select auth.jwt()->>'email' $$;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create table storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[], owner uuid, created_at timestamptz default now(), updated_at timestamptz default now());
create table storage.objects(id uuid primary key default extensions.gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, owner_id text, metadata jsonb, path_tokens text[], version text, created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz);
alter table storage.objects enable row level security; alter table storage.buckets enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
create function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name,'/'))[array_length(string_to_array(name,'/'),1)] $$;
create function storage.extension(name text) returns text language sql immutable as $$ select reverse(split_part(reverse(name),'.',1)) $$;
create table cron.job(jobid bigserial primary key, jobname text unique, schedule text, command text, active boolean default true, nodename text default 'x', nodeport int default 0, database text default 'postgres', username text default 'postgres');
create table cron.job_run_details(runid bigserial primary key, jobid bigint, job_pid int, database text, username text, command text, status text, return_message text, start_time timestamptz, end_time timestamptz);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values(n,s,c) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning jobid $$;
create function cron.unschedule(n text) returns boolean language sql as $$ with d as (delete from cron.job where jobname=n returning 1) select exists(select 1 from d) $$;
create function cron.unschedule(i bigint) returns boolean language sql as $$ with d as (delete from cron.job where jobid=i returning 1) select exists(select 1 from d) $$;
create function cron.alter_job(job_id bigint, schedule text default null, command text default null, database text default null, username text default null, active boolean default null) returns void language sql as $$ update cron.job j set schedule=coalesce($2,j.schedule),command=coalesce($3,j.command) where j.jobid=$1 $$;
create table net._http_response(id bigint primary key, status_code int, content text, created timestamptz default now(), timed_out boolean, error_msg text, headers jsonb, content_type text);
create sequence net.req;
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ select nextval('net.req') $$;
create function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ select nextval('net.req') $$;
create table vault.secrets(id uuid primary key default extensions.gen_random_uuid(), name text unique, description text, secret text, key_id uuid, nonce bytea, created_at timestamptz default now(), updated_at timestamptz default now());
create view vault.decrypted_secrets as select id,name,description,secret,secret as decrypted_secret,key_id,nonce,created_at,updated_at from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null) returns uuid language sql as $$ insert into vault.secrets(secret,name,description) values($1,$2,$3) returning id $$;
create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null) returns void language sql as $$ update vault.secrets set secret=coalesce($2,secret),name=coalesce($3,name),description=coalesce($4,description) where id=$1 $$;
create publication supabase_realtime;
