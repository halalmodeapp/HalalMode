-- 0147 restated the read-receipt RPCs after the legal-consent wrappers were
-- added, replacing those wrappers. Keep its receipt behavior, but restore the
-- consent check before either RPC inspects a connection or message.
do $$
declare
  v_def text;
  v_find text;
  v_replace text;
begin
  v_def := pg_get_functiondef(
    'public.mark_connection_messages_read(uuid)'::regprocedure
  );
  if position(
    'halal_mode_private.require_current_legal_consents(auth.uid())' in v_def
  ) = 0 then
    v_find := E'begin\n  select case when c.user_a = auth.uid() then c.user_b else c.user_a end';
    v_replace := E'begin\n  perform halal_mode_private.require_current_legal_consents(auth.uid());\n  select case when c.user_a = auth.uid() then c.user_b else c.user_a end';
    if position(v_find in v_def) = 0 then
      raise exception 'mark_connection_messages_read: consent insertion point not found';
    end if;
    execute replace(v_def, v_find, v_replace);
  end if;

  v_def := pg_get_functiondef(
    'public.get_connection_messages(uuid,timestamptz,uuid,integer)'::regprocedure
  );
  if position(
    'halal_mode_private.require_current_legal_consents(auth.uid())' in v_def
  ) = 0 then
    v_find := E'if auth.uid() is null then\n    raise exception ''Authentication required'' using errcode = ''42501'';\n  end if;';
    v_replace := v_find || E'\n  perform halal_mode_private.require_current_legal_consents(auth.uid());';
    if position(v_find in v_def) = 0 then
      raise exception 'get_connection_messages: consent insertion point not found';
    end if;
    execute replace(v_def, v_find, v_replace);
  end if;
end;
$$;
