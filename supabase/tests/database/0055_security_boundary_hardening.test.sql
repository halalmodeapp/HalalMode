begin;
set local search_path = public, extensions, halal_mode_private;
select plan(15);

select ok(
  not has_table_privilege('authenticated', 'public.blocks', 'SELECT')
  and not has_table_privilege('authenticated', 'public.blocks', 'INSERT')
  and not has_table_privilege('authenticated', 'public.blocks', 'DELETE'),
  'blocks have no direct member table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.messages', 'SELECT')
  and not has_table_privilege('authenticated', 'public.messages', 'INSERT')
  and not has_table_privilege('authenticated', 'public.messages', 'UPDATE'),
  'messages have no direct member table privileges'
);
select ok(
  not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ),
  'raw message rows are not in the realtime publication'
);
select ok(
  not has_function_privilege('authenticated', 'public.can_generate_connection_summary_service(uuid,uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.can_generate_connection_summary_service(uuid,uuid)', 'EXECUTE'),
  'connection-summary consent gate is service-only'
);
select ok(
  not has_function_privilege('authenticated', 'public.get_connection_summary_data_service(uuid,uuid,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.get_connection_summary_data_service(uuid,uuid,text)', 'EXECUTE'),
  'connection-summary data snapshot is service-only'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_report_action_service(uuid,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.claim_report_action_service(uuid,text)', 'EXECUTE'),
  'report action claims are service-only'
);
select ok(
  not has_function_privilege('authenticated', 'public.record_profile_media_validation_service(text,text,text,text,bigint)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.record_profile_media_validation_service(text,text,text,text,bigint)', 'EXECUTE'),
  'only the media validator can record byte validation'
);
select ok(
  not has_table_privilege('authenticated', 'halal_mode_private.profile_media_validations', 'SELECT'),
  'media validation records remain private'
);
select ok(
  position('resolved_at is null' in pg_get_functiondef(
    'public.apply_report_action_service(uuid,text)'::regprocedure
  )) > 0,
  'report actions reject resolved rows before applying an action'
);
select ok(
  position('member_has_current_legal_consents' in pg_get_functiondef(
    'halal_mode_private.can_read_profile_media(text)'::regprocedure
  )) > 0
  and position('opens_at <= now()' in pg_get_functiondef(
    'halal_mode_private.can_read_profile_media(text)'::regprocedure
  )) > 0,
  'profile media reads preserve both consent and dawn gates'
);
select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef(
    'public.register_my_notification_device(text,text,text)'::regprocedure
  )) > 0,
  'notification registration serializes quota and token ownership'
);
select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef(
    'halal_mode_private.can_store_more_profile_media(text)'::regprocedure
  )) > 0,
  'profile media quota checks serialize concurrent uploads'
);
select ok(
  position('member_has_current_legal_consents' in pg_get_functiondef(
    'public.get_current_round_state()'::regprocedure
  )) > 0,
  'round metadata is gated before owed relationship details'
);
select ok(
  position('halal_mode_mail_worker' in pg_get_functiondef(
    'public.verify_mail_worker_secret(text)'::regprocedure
  )) > 0,
  'mail worker authentication keeps its own vault secret'
);
select ok(
  position('halal_mode_report_links' in pg_get_functiondef(
    'public.mail_link_secret_service()'::regprocedure
  )) > 0,
  'moderation link signing uses a separate vault secret'
);

select * from finish();
rollback;
