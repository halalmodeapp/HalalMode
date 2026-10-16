begin;
set local search_path = public, extensions;
select plan(2);

select ok(
  not has_table_privilege('anon', 'public.rounds', 'SELECT')
  and not has_table_privilege('anon', 'public.introductions', 'SELECT')
  and not has_table_privilege('anon', 'public.connections', 'SELECT')
  and not has_table_privilege('anon', 'public.question_picks', 'SELECT')
  and not has_table_privilege('authenticated', 'public.rounds', 'SELECT')
  and not has_table_privilege('authenticated', 'public.introductions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.connections', 'SELECT')
  and not has_table_privilege('authenticated', 'public.question_picks', 'SELECT'),
  'member roles cannot read relationship tables directly'
);

select ok(
  has_table_privilege('service_role', 'public.rounds', 'SELECT')
  and has_table_privilege('service_role', 'public.introductions', 'SELECT')
  and has_table_privilege('service_role', 'public.connections', 'SELECT')
  and has_table_privilege('service_role', 'public.question_picks', 'SELECT'),
  'service role retains trusted relationship-table reads'
);

select * from finish();
rollback;
