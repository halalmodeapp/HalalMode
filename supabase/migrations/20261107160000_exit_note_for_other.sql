-- Founder decision (2026-11-07): someone leaving for "Something else" may say what it was in their
-- own words. Only that reason keeps words; every other reason stays a choice from the list. The
-- note waits with the account like the reason, and is counted only when the account is erased.

alter table halal_mode_private.pending_exit_answers
  add column note text check (note is null or (reason = 'other' and char_length(note) <= 500));

-- Installed apps still send a note with any reason; it is kept only with "other".
create or replace function public.record_exit_answer(p_reason text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_note text := case when p_reason = 'other' then nullif(left(btrim(coalesce(p_note, '')), 500), '') end;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into halal_mode_private.pending_exit_answers (user_id, reason, note) values (auth.uid(), p_reason, v_note)
  on conflict (user_id) do update set reason = excluded.reason, note = excluded.note, answered_at = now();
end;
$function$;

create or replace function halal_mode_private.count_exit_answer_on_erasure()
returns trigger language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  insert into halal_mode_private.exit_answers (reason, note, gender, country, stayed, ever_connected, week)
  select e.reason, e.note, old.gender::text, old.country,
         case when old.created_at > now() - interval '1 month' then 'under_a_month'
              when old.created_at > now() - interval '6 months' then 'one_to_six_months'
              else 'over_six_months' end,
         exists (select 1 from public.connections c where old.id in (c.user_a, c.user_b)),
         date_trunc('week', now())::date
  from halal_mode_private.pending_exit_answers e
  where e.user_id = old.id
    and exists (select 1 from halal_mode_private.account_deletion_requests d where d.user_id = old.id);
  return old;
end;
$$;
