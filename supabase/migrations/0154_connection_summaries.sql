-- A short written summary of how two members' answers compare (2026-10-02).
--
-- Written once per connection and language by the connection-summary function,
-- after both members have answered every question, and shown to both of them.
-- Only that function (service role) reads or writes it; members get it through
-- the function, which checks they belong to the connection.
create table if not exists public.connection_summaries (
  connection_id uuid not null references public.connections(id) on delete cascade,
  language text not null check (language in ('en', 'ar')),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  primary key (connection_id, language)
);

alter table public.connection_summaries enable row level security;
revoke all on public.connection_summaries from public, anon, authenticated;
grant select, insert on public.connection_summaries to service_role;
