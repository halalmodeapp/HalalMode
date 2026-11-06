-- The league is now the only matcher. The legacy generator, its daily claim and its Fajr planner go.

select cron.unschedule(j.jobid) from cron.job j
where j.jobname in ('halal-mode-madinah-fajr', 'halal-mode-madinah-fajr-planner');

do $$
declare
  v record;
begin
  for v in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'halal_mode_private')
      and p.proname in (
        'generate_round_for_pairs', 'generate_round_for_pairs_scheduled',
        'members_awaiting_round_service', 'set_madinah_fajr_cron',
        -- A second pass closes a pair for good, so nothing releases it any more.
        'expire_explicit_passes', 'expire_explicit_passes_service'
      )
  loop
    execute format('drop function %s', v.signature);
  end loop;
end;
$$;

drop table public.round_generation_runs;

-- Nobody has been seen by the league yet. Without this, anyone who joined over a fortnight ago would
-- drop out of the first day's pool until they next opened the app.
insert into halal_mode_private.league_member_activity (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- `league_matching` stays off here. It is turned on deliberately, after this and the Edge function are
-- both in place, and just after a day's cycle begins, so nobody is prepared two sets for the same dawn.
