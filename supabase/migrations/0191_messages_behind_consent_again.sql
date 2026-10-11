-- Reading and marking messages ask for the current documents again.
--
-- 0047 put every member-facing RPC behind require_current_legal_consents.
-- 0147 restated mark_connection_messages_read and get_connection_messages from
-- their 0027 bodies to add read receipts, and the consent check went with the
-- old bodies. Put it back as the first statement, the way 0047 had it. Safety
-- actions (block, report, hide) stay outside the gate on purpose (0165).

do $$
declare
  v_signature text;
  v_def text;
begin
  foreach v_signature in array array[
    'public.mark_connection_messages_read(uuid)',
    'public.get_connection_messages(uuid,timestamp with time zone,uuid,integer)'
  ] loop
    v_def := pg_get_functiondef(v_signature::regprocedure);
    if position('require_current_legal_consents' in v_def) > 0 then
      continue;
    end if;
    if position(E'\nbegin\n' in v_def) = 0 then
      raise exception '%: begin anchor not found', v_signature;
    end if;
    execute regexp_replace(
      v_def,
      E'\nbegin\n',
      E'\nbegin\n  perform halal_mode_private.require_current_legal_consents(auth.uid());\n'
    );
  end loop;
end;
$$;
