-- The reciprocal pipeline was never switched on. It held four allocators, a snapshot of
-- everyone every day, and the slowest parts of a round. The league replaces all of it,
-- so it goes. The legacy generator stays until the league has been proven live, because
-- it is what `league_matching = false` runs. See docs/BACKEND_SIMULATION.md.

-- The round's record, for the admin screens.
alter table halal_mode_private.league_cycles
  add column eligible int,
  add column pairs int,
  add column rounds_created int,
  add column failed_jobs int,
  add column last_error text;

create or replace function halal_mode_private.league_seal(p_cycle date)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v record;
begin
  for v in
    select r.user_id, r.opens_at, count(i.id)::int as introductions
    from public.rounds r
    join public.introductions i on i.round_id = r.id
    where r.cycle_date = p_cycle and r.submitted_at is null
    group by r.id
  loop
    perform halal_mode_private.enqueue_notification(
      v.user_id, 'round_ready', jsonb_build_object('count', v.introductions),
      greatest(v.opens_at - now(), interval '0')
    );
  end loop;
  update halal_mode_private.league_cycles c
  set phase = 'sealed',
      sealed_at = now(),
      eligible = (select count(*) from public.rounds r where r.cycle_date = p_cycle),
      rounds_created = (select count(*) from public.rounds r where r.cycle_date = p_cycle
                        and exists (select 1 from public.introductions i where i.round_id = r.id)),
      pairs = (select coalesce(sum(j.edges), 0) from halal_mode_private.league_jobs j where j.cycle_date = p_cycle),
      failed_jobs = (select count(*) from halal_mode_private.league_jobs j where j.cycle_date = p_cycle and j.status = 'failed'),
      last_error = (select left(max(j.last_error), 160) from halal_mode_private.league_jobs j where j.cycle_date = p_cycle)
  where c.cycle_date = p_cycle;
  -- Who sat where is only useful until the day is done, and the record above is all that is kept.
  delete from halal_mode_private.league_jobs where cycle_date < p_cycle;
  delete from halal_mode_private.league_cycles where cycle_date < p_cycle - 180;
end;
$function$;

select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.league_advance()',
  'delete from halal_mode_private.league_cycles where cycle_date < v_cycle - 1;
',
  ''
);

-- What members see, without the old outcomes.
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.get_current_round_state_before_answer_gate()',
  'select h.active_match_count >= limits.open_connections
  into v_at_capacity
  from halal_mode_private.match_health h
  join public.profiles p on p.id = h.user_id
  cross join lateral public.tier_limits(p.tier) limits
  where h.user_id = v_member_id;',
  'select (select count(*) from public.connections c
          where c.closed_at is null and (c.user_a = v_member_id or c.user_b = v_member_id))
         >= limits.open_connections
  into v_at_capacity
  from public.profiles p
  cross join lateral public.tier_limits(p.tier) limits
  where p.id = v_member_id;'
);
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.get_current_round_state_before_answer_gate()',
  'select o.outcome into v_outcome
  from halal_mode_private.matching_member_run_outcomes o
  join halal_mode_private.matching_runs r on r.id = o.run_id
  where o.user_id = v_member_id
    and o.valid_until > now()
    and r.mode = ''live''
    and r.error is null
  order by r.started_at desc
  limit 1;

  if v_outcome = ''deferred'' then
    return jsonb_build_object(''status'', ''awaiting_turn'', ''round'', null);
  end if;

  -- Their own filters, and which one to loosen first.
  v_criterion := halal_mode_private.most_restrictive_must_have(v_member_id);
  if v_criterion is not null then',
  '-- Their own filters, and which one to loosen first.
  select m.criterion into v_criterion from halal_mode_private.member_reach(v_member_id) m;
  if v_criterion is not null then'
);
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.get_current_round_state_before_answer_gate()',
  '-- A stale outcome, a shadow-only proposal, and inconsistent served-without-
  -- round state all fail closed to the established message.
  if v_outcome is null then
    return jsonb_build_object(''status'', ''waiting_for_first_set'', ''round'', null);
  end if;
  return jsonb_build_object(''status'', ''no_suitable_introductions'', ''round'', null);',
  'return jsonb_build_object(''status'', ''waiting_for_first_set'', ''round'', null);'
);
select halal_mode_private.patch_function_any_newline(
  'halal_mode_private.get_current_round_state_before_answer_gate()',
  '  v_outcome text;
',
  ''
);

-- The admin screens keep their shape and read the league's record.
select halal_mode_private.patch_function_any_newline(
  'public.admin_overview()',
  'select r.id into v_latest_live
  from halal_mode_private.matching_runs r
  where r.mode = ''live'' and r.finished_at is not null and r.error is null
  order by r.started_at desc limit 1;

',
  ''
);
select halal_mode_private.patch_function_any_newline(
  'public.admin_overview()',
  '''started_at'', r.started_at,
          ''finished_at'', r.finished_at,
          ''mode'', r.mode,
          ''algorithm'', r.algorithm_version,
          ''eligible'', r.eligible_members,
          ''pairs'', r.pairs_created,
          ''rounds'', r.rounds_created,
          ''failed'', r.error is not null,
          ''breaches'', jsonb_array_length(r.threshold_breaches)
        ) order by r.started_at desc), ''[]''::jsonb)
        from (select * from halal_mode_private.matching_runs order by started_at desc limit 10) r',
  '''started_at'', r.started_at,
          ''finished_at'', r.sealed_at,
          ''mode'', ''live'',
          ''algorithm'', ''league'',
          ''eligible'', r.eligible,
          ''pairs'', r.pairs,
          ''rounds'', r.rounds_created,
          ''failed'', coalesce(r.failed_jobs, 0) > 0,
          ''breaches'', 0
        ) order by r.started_at desc), ''[]''::jsonb)
        from (select * from halal_mode_private.league_cycles order by started_at desc limit 10) r'
);
select halal_mode_private.patch_function_any_newline(
  'public.admin_overview()',
  '-- How evenly the latest live round spread opportunity. Long waits are
      -- the fairness rotation''s job; they should stay rare at every score.
      ''fairness'', (
        select jsonb_build_object(
          ''members'', count(*),
          ''waiting_3_plus_rounds'', count(*) filter (where s.rounds_since_last_served >= 3),
          ''avg_exposures'', round(coalesce(avg(s.exposures_in_window), 0), 2),
          ''low_score_waiting_3_plus'', count(*) filter (
            where s.rounds_since_last_served >= 3 and s.reception_score < 0.4 and s.reception_confidence >= 0.3
          ),
          ''low_score_members'', count(*) filter (where s.reception_score < 0.4 and s.reception_confidence >= 0.3)
        )
        from halal_mode_private.matching_run_member_snapshots s
        where s.run_id = v_latest_live
      )',
  '-- How evenly the last three rounds spread opportunity. Someone with nothing in all
      -- three is someone the league is failing, and that should stay rare.
      ''fairness'', (
        select jsonb_build_object(
          ''members'', count(*),
          ''waiting_3_plus_rounds'', count(*) filter (where s.introductions = 0 and s.rounds >= 3),
          ''avg_exposures'', round(coalesce(avg(s.introductions), 0), 2),
          ''low_score_waiting_3_plus'', 0,
          ''low_score_members'', 0
        )
        from (
          select r.user_id, count(distinct r.id) as rounds, count(i.id) as introductions
          from public.rounds r
          left join public.introductions i on i.round_id = r.id
          where r.cycle_date in (select c.cycle_date from halal_mode_private.league_cycles c order by c.cycle_date desc limit 3)
          group by r.user_id
        ) s
      )'
);
select halal_mode_private.patch_function_any_newline(
  'public.admin_match_stats(integer)',
  'select r.id into v_latest_live
  from halal_mode_private.matching_runs r
  where r.mode = ''live'' and r.finished_at is not null and r.error is null
  order by r.started_at desc limit 1;

',
  ''
);
select halal_mode_private.patch_function_any_newline(
  'public.admin_match_stats(integer)',
  '-- From the latest real run: how long members have gone without a match.
      ''waiting'', (
        select jsonb_build_object(
          ''members'', count(*),
          ''r0_3'', count(*) filter (where s.rounds_since_last_mutual <= 3),
          ''r4_7'', count(*) filter (where s.rounds_since_last_mutual between 4 and 7),
          ''r8_13'', count(*) filter (where s.rounds_since_last_mutual between 8 and 13),
          ''r14'', count(*) filter (where s.rounds_since_last_mutual >= 14)
        )
        from halal_mode_private.matching_run_member_snapshots s where s.run_id = v_latest_live
      ),',
  '-- Everyone in the latest round: how long they have gone without a match.
      ''waiting'', (
        select jsonb_build_object(
          ''members'', count(*),
          ''r0_3'', count(*) filter (where s.days <= 3),
          ''r4_7'', count(*) filter (where s.days between 4 and 7),
          ''r8_13'', count(*) filter (where s.days between 8 and 13),
          ''r14'', count(*) filter (where s.days >= 14)
        )
        from (
          select extract(day from now() - coalesce(
            (select max(c.created_at) from public.connections c where c.user_a = r.user_id or c.user_b = r.user_id),
            p.created_at
          ))::int as days
          from public.rounds r
          join public.profiles p on p.id = r.user_id
          where r.cycle_date = (select max(c.cycle_date) from halal_mode_private.league_cycles c)
        ) s
      ),'
);
select halal_mode_private.patch_function_any_newline(
  'public.admin_overview()',
  'v_latest_live uuid;
',
  ''
);
select halal_mode_private.patch_function_any_newline(
  'public.admin_match_stats(integer)',
  '  v_latest_live uuid;
',
  ''
);
select halal_mode_private.patch_function_any_newline(
  'public.admin_system_health()',
  '''runs_7d'', count(*),
        ''failed_7d'', count(*) filter (where r.error is not null),
        ''last_error'', (select left(x.error, 160) from halal_mode_private.matching_runs x where x.error is not null order by x.started_at desc limit 1)
      )
      from halal_mode_private.matching_runs r where r.started_at > now() - interval ''7 days''',
  '''runs_7d'', count(*),
        ''failed_7d'', count(*) filter (where coalesce(r.failed_jobs, 0) > 0),
        ''last_error'', (select x.last_error from halal_mode_private.league_cycles x where x.last_error is not null order by x.started_at desc limit 1)
      )
      from halal_mode_private.league_cycles r where r.started_at > now() - interval ''7 days'''
);

-- The pipeline itself.
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
        'matching_run_start', 'matching_run_start_service', 'matching_run_finish', 'matching_run_config',
        'matching_candidate_snapshot_prepare_service', 'matching_candidate_snapshot_prepare_unclamped',
        'matching_candidate_snapshot_score_batch_service', 'matching_candidate_edges', 'matching_candidate_edges_service',
        'matching_shortlist_batch_edges', 'matching_live_finalize_service',
        'matching_member_signals', 'matching_member_signals_service',
        'matching_shadow_open_service', 'matching_shadow_batch_service', 'matching_shadow_close_service',
        'matching_shadow_finalize_service', 'matching_shadow_round_service',
        'persist_frozen_matching_round', 'persist_matching_round', 'persist_matching_round_service',
        'persist_validated_shadow_edges', 'shadow_round_shape_service',
        'validate_frozen_matching_edges', 'validate_matching_edges', 'lock_matching_finalization_plan',
        'matching_finalize_hash', 'matching_diagnostics_are_valid', 'matching_pair_is_eligible',
        'measure_pair_cost_service', 'measure_shortlist_service', 'shortlist_size_service', 'time_batch_parts_service',
        'recent_matching_runs_service', 'tune_matching_weights', 'tune_matching_weights_service',
        'most_restrictive_must_have'
      )
  loop
    execute format('drop function %s', v.signature);
  end loop;
end;
$$;

drop view halal_mode_private.matching_pool;
drop view halal_mode_private.match_health;
drop table halal_mode_private.shadow_round_edges;
drop table halal_mode_private.matching_member_run_outcomes;
drop table halal_mode_private.matching_run_candidate_shortlists;
drop table halal_mode_private.matching_run_shortlist_progress;
drop table halal_mode_private.matching_run_rounds;
drop table halal_mode_private.matching_run_candidate_snapshots;
drop table halal_mode_private.matching_run_member_snapshots;
drop table halal_mode_private.matching_runs;
drop table halal_mode_private.matching_weight_adjustments;
delete from halal_mode_private.release_flags where key = 'reciprocal_matching_v1';

-- A worker every minute, for as long as the switch is on. It leaves at once if there is nothing to do.
select cron.schedule(
  'halal-mode-league',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://lfuuywsmydruvqkqwvzw.supabase.co/functions/v1/generate-round',
      headers := jsonb_build_object(
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'halal_mode_round_scheduler' order by created_at desc limit 1),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    )
    where coalesce((select enabled from halal_mode_private.release_flags where key = 'league_matching'), false);
  $job$
);

drop function halal_mode_private.patch_function_any_newline(text, text, text);
