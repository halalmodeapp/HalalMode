begin;
set local search_path = public, extensions, halal_mode_private;
select plan(16);

select has_table('halal_mode_private', 'matching_signal_metric_config',
  'matching signal inputs have one private configuration table');
select has_table('halal_mode_private', 'matching_signal_estimates',
  'the per-member reception estimate is stored privately');
select has_table('halal_mode_private', 'matching_engagement_observations',
  'view-time observations are stored privately');
select has_table('halal_mode_private', 'matching_photo_presentations',
  'optional Luna presentation features are stored privately');
select has_column('halal_mode_private', 'matching_run_member_snapshots', 'reception_score',
  'a run freezes the private reception estimate');
select has_column('halal_mode_private', 'matching_run_member_snapshots', 'reception_confidence',
  'a run freezes how much evidence supports the estimate');
select has_column('halal_mode_private', 'matching_run_member_snapshots', 'reception_similarity_weight',
  'a run freezes the small pair-level similarity preference');

select is(
  (select count(*)::integer from halal_mode_private.matching_signal_metric_config),
  8,
  'every supported person-level and pair-level signal has one independent setting'
);
select ok(
  not (select enabled from halal_mode_private.matching_signal_metric_config where metric_key = 'luna_presentation'),
  'Luna is disabled by default and cannot create usage until enabled'
);
select ok(
  (select enabled and weight = 0.08 from halal_mode_private.matching_signal_metric_config where metric_key = 'reception_similarity'),
  'similar reception is a small enabled preference rather than a hard band'
);

select ok(
  not has_table_privilege('anon', 'halal_mode_private.matching_signal_metric_config', 'SELECT')
  and not has_table_privilege('authenticated', 'halal_mode_private.matching_signal_metric_config', 'SELECT')
  and not has_table_privilege('service_role', 'halal_mode_private.matching_signal_metric_config', 'SELECT')
  and not has_table_privilege('authenticated', 'halal_mode_private.matching_signal_estimates', 'SELECT')
  and not has_table_privilege('service_role', 'halal_mode_private.matching_signal_estimates', 'SELECT'),
  'member-level settings and scores are not directly readable through database grants'
);
select ok(
  has_function_privilege('service_role', 'public.get_matching_signal_metrics_service()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.configure_matching_signal_metric_service(text,boolean,numeric)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.queue_matching_photo_analysis_backfill_service(integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.get_matching_signal_metrics_service()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.configure_matching_signal_metric_service(text,boolean,numeric)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.queue_matching_photo_analysis_backfill_service(integer)', 'EXECUTE'),
  'only a trusted backend can inspect settings, change them, or queue existing photos'
);
select ok(
  not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_my_matching_signal_capture_flags'
  ),
  'members are never given metric switches or signal-status flags'
);
select ok(
  has_function_privilege('authenticated', 'public.submit_round_selections_ranked_with_signals(uuid,uuid[],jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.submit_round_selections_ranked_with_signals(uuid,uuid[],jsonb)', 'EXECUTE'),
  'members can submit their own bounded observations only with their round choices'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000019999","role":"service_role"}', true);
select public.configure_matching_signal_metric_service('reception_similarity', false, 0.12);
select ok(
  not (select enabled from halal_mode_private.matching_signal_metric_config where metric_key = 'reception_similarity')
  and (select weight = 0.12 from halal_mode_private.matching_signal_metric_config where metric_key = 'reception_similarity'),
  'a backend can independently disable the pair preference and adjust its weight'
);
select public.configure_matching_signal_metric_service('reception_similarity', true, 0.08);

select ok(
  (select command like '%lfuuywsmydruvqkqwvzw.supabase.co/functions/v1/moderate%'
   from cron.job where jobname = 'halal-mode-moderate'),
  'the moderation job calls the live London project'
);

select * from finish();
rollback;
