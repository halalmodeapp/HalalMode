-- Hold a message notification for one minute, not two.

create or replace function halal_mode_private.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_recipient uuid;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
  into v_recipient
  from public.connections c
  where c.id = new.connection_id;

  if v_recipient is null then return new; end if;

  -- Long enough that a few quick replies are one interruption, short enough
  -- that a reply still feels like a reply.
  perform halal_mode_private.enqueue_notification(
    v_recipient, 'new_message', '{}'::jsonb, interval '1 minute'
  );
  return new;
end;
$$;
