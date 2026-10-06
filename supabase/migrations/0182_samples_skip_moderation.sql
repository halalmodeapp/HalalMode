-- Sample members are the operator's own test content, not uploads from real
-- people, so moderation never checks them (their stock and placeholder images
-- would otherwise be removed, correctly but uselessly). Linked https images,
-- which only samples use, are skipped too.
create or replace function halal_mode_private.queue_profile_moderation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if exists (select 1 from halal_mode_private.demo_members d where d.user_id = new.id) then
    return new;
  end if;

  insert into halal_mode_private.moderation_queue (user_id, kind, ref)
  select new.id, 'photo', p
  from unnest(coalesce(new.photos, '{}')) as p
  where (tg_op = 'INSERT' or not (p = any(coalesce(old.photos, '{}'))))
    and p not like 'https://%';

  if length(trim(coalesce(new.bio, ''))) > 0
     and (tg_op = 'INSERT' or new.bio is distinct from old.bio) then
    insert into halal_mode_private.moderation_queue (user_id, kind, ref) values (new.id, 'bio', new.bio);
  end if;
  return new;
end;
$function$;

delete from halal_mode_private.mail_outbox o
using halal_mode_private.moderation_queue q
where o.kind = 'moderation' and o.sent_at is null and o.ref_id = q.id::text
  and exists (select 1 from halal_mode_private.demo_members d where d.user_id = q.user_id);

delete from halal_mode_private.moderation_queue q
where exists (select 1 from halal_mode_private.demo_members d where d.user_id = q.user_id);
