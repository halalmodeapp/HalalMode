-- Privacy and safety rules held at the server boundary, so old endpoints and retries keep them too.
-- docs/INVARIANT_AUDIT.md, recommendation 1 (M1, C1, A1, A3, A4).

-- Replaces text inside a live function. Each anchor must occur exactly once, so a patch never lands
-- somewhere it was not meant to. Line endings are ignored.
create function halal_mode_private.patch_once(p_signature text, p_find text, p_replace text)
returns void language plpgsql as $$
declare
  v_def text := replace(pg_get_functiondef(p_signature::regprocedure), chr(13), '');
  v_find text := replace(p_find, chr(13), '');
  v_count int := (length(v_def) - length(replace(v_def, v_find, ''))) / greatest(length(v_find), 1);
begin
  if v_count <> 1 then
    raise exception 'patch: anchor found % times in %: %', v_count, p_signature, p_find;
  end if;
  execute replace(v_def, v_find, replace(p_replace, chr(13), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- M1. Owing answers keeps today's set closed on every path, not only the state call.
-- The member stays in the matcher: the debt is paid in minutes and the set is then theirs.
-- ---------------------------------------------------------------------------
create function halal_mode_private.member_owes_answers(p_member uuid)
returns boolean language sql stable security definer
set search_path = public, halal_mode_private as $$
  select exists (select 1 from halal_mode_private.owed_connections(p_member));
$$;
revoke all on function halal_mode_private.member_owes_answers(uuid) from public, anon, authenticated;

select halal_mode_private.patch_once('public.get_current_round()',
  '     or not profile_is_ready_for_matching(auth.uid()) then',
  '     or not profile_is_ready_for_matching(auth.uid())
     or halal_mode_private.member_owes_answers(auth.uid()) then');

select halal_mode_private.patch_once('halal_mode_private.can_read_current_introduction(uuid)',
  '      and (r.cycle_date is null or halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id))',
  '      and (r.cycle_date is null or halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id))
      and not halal_mode_private.member_owes_answers(auth.uid())');

-- Only the set's photos. An open connection's photos stay readable, since that is where the answers are owed.
select halal_mode_private.patch_once('halal_mode_private.can_read_profile_media(text)',
  '      and (r.cycle_date is null or halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id))
  ) or exists (',
  '      and (r.cycle_date is null or halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id))
      and not halal_mode_private.member_owes_answers(v_viewer)
  ) or exists (');

-- ---------------------------------------------------------------------------
-- C1. Someone who keeps their own receipts private sees nobody's, including on a retried send.
-- ---------------------------------------------------------------------------
create or replace function public.send_message(p_connection_id uuid, p_body text, p_client_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
declare
  v_message jsonb;
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  v_message := halal_mode_private.send_message_after_legal_consent(p_connection_id, p_body, p_client_request_id);
  -- A replay returns the stored row, which may have been read since.
  if not halal_mode_private.sends_read_receipts(auth.uid()) then
    v_message := v_message || jsonb_build_object('read_at', null);
  end if;
  return v_message;
end;
$function$;

-- Reading is remembered privately for the unread dot, whether or not a receipt is sent.
create table halal_mode_private.member_read_marks (
  connection_id uuid not null references public.connections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_until timestamptz not null,
  primary key (connection_id, user_id)
);
revoke all on halal_mode_private.member_read_marks from public, anon, authenticated;

select halal_mode_private.patch_once('public.mark_connection_messages_read(uuid)',
  '  if not halal_mode_private.sends_read_receipts(auth.uid()) then',
  '  insert into halal_mode_private.member_read_marks (connection_id, user_id, read_until)
  values (p_connection_id, auth.uid(), now())
  on conflict (connection_id, user_id) do update set read_until = excluded.read_until;

  if not halal_mode_private.sends_read_receipts(auth.uid()) then');

select halal_mode_private.patch_once('halal_mode_private.get_connection_after_legal_consent(uuid)',
  '        and m.sender_id <> auth.uid()
        and m.read_at is null
    )',
  '        and m.sender_id <> auth.uid()
        and m.read_at is null
        and m.created_at > coalesce((select k.read_until from halal_mode_private.member_read_marks k
                                     where k.connection_id = c.id and k.user_id = auth.uid()), ''-infinity'')
    )');

-- ---------------------------------------------------------------------------
-- A1. The people someone can block or report, readable before accepting new terms.
-- ---------------------------------------------------------------------------
create function public.get_my_safety_contacts()
returns jsonb
language sql
stable
security definer
set search_path = public, halal_mode_private
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('connectionId', c.id, 'name', p.first_name)
                            order by c.created_at desc), '[]'::jsonb)
  from public.connections c
  join public.profiles p on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  where auth.uid() in (c.user_a, c.user_b)
    and c.closed_at is null
    and not exists (select 1 from public.blocks b
                    where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
                       or (b.blocker_id = p.id and b.blocked_id = auth.uid()));
$function$;
revoke all on function public.get_my_safety_contacts() from public, anon;
grant execute on function public.get_my_safety_contacts() to authenticated;

-- A2 is left as it is on purpose. New apps send the versions they showed and a mismatch is refused.
-- The installed no-argument call stays, because those apps show the documents the server lists at
-- that moment and the rule is that installed apps keep working. Remove it once they have updated.

-- ---------------------------------------------------------------------------
-- A3. Religion and ethnicity are written only after explicit consent, whichever call writes them.
-- Server jobs and seeds act without a member session and are not affected. A new profile only ever
-- carries the column defaults, and "prefer not to say" is no answer, so neither needs consent.
-- ---------------------------------------------------------------------------
create function halal_mode_private.require_sensitive_consent_on_profile()
returns trigger language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null or new.sensitive_consent_at is not null then return new; end if;
  if (new.ethnicity is not null and new.ethnicity is distinct from old.ethnicity)
     or (coalesce(cardinality(new.ethnicities), 0) > 0 and new.ethnicities is distinct from old.ethnicities)
     or (coalesce(cardinality(new.heritage_countries), 0) > 0 and new.heritage_countries is distinct from old.heritage_countries)
     or (new.religious_dress is not null and new.religious_dress is distinct from old.religious_dress)
     or (new.religious_practice is not null and new.religious_practice is distinct from old.religious_practice)
     or (new.sect is not null and new.sect <> 'prefer_not_to_say' and new.sect is distinct from old.sect)
     or (new.sect_detail is not null and new.sect_detail is distinct from old.sect_detail) then
    raise exception 'Consent to use religion and ethnicity is required first' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_require_sensitive_consent
before update of ethnicity, ethnicities, heritage_countries, religious_dress, religious_practice, sect, sect_detail
on public.profiles for each row execute function halal_mode_private.require_sensitive_consent_on_profile();

create function halal_mode_private.require_sensitive_consent_on_preferences()
returns trigger language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  if auth.uid() is null
     or exists (select 1 from public.profiles p where p.id = new.user_id and p.sensitive_consent_at is not null) then
    return new;
  end if;
  if (coalesce(cardinality(new.preferred_ethnicities), 0) > 0 and new.preferred_ethnicities is distinct from (case when tg_op = 'UPDATE' then old.preferred_ethnicities end))
     or (coalesce(cardinality(new.preferred_heritage_countries), 0) > 0 and new.preferred_heritage_countries is distinct from (case when tg_op = 'UPDATE' then old.preferred_heritage_countries end))
     or (coalesce(cardinality(new.preferred_dress), 0) > 0 and new.preferred_dress is distinct from (case when tg_op = 'UPDATE' then old.preferred_dress end))
     or (coalesce(cardinality(new.preferred_practice), 0) > 0 and new.preferred_practice is distinct from (case when tg_op = 'UPDATE' then old.preferred_practice end))
     or (coalesce(cardinality(new.preferred_sects), 0) > 0 and new.preferred_sects is distinct from (case when tg_op = 'UPDATE' then old.preferred_sects end))
     or (coalesce(cardinality(new.preferred_sect_details), 0) > 0 and new.preferred_sect_details is distinct from (case when tg_op = 'UPDATE' then old.preferred_sect_details end)) then
    raise exception 'Consent to use religion and ethnicity is required first' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger private_preferences_require_sensitive_consent
before insert or update of preferred_ethnicities, preferred_heritage_countries, preferred_dress, preferred_practice, preferred_sects, preferred_sect_details
on public.private_preferences for each row execute function halal_mode_private.require_sensitive_consent_on_preferences();

-- ---------------------------------------------------------------------------
-- A4. A leaving answer is a reason from the list, nothing typed, and it is counted only when the
-- account is actually erased. Until then it waits with the account and goes if the member stays.
-- ---------------------------------------------------------------------------
create table halal_mode_private.pending_exit_answers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('married', 'engaged', 'met_here', 'met_elsewhere', 'no_matches', 'not_right', 'break', 'privacy', 'other')),
  answered_at timestamptz not null default now()
);
revoke all on halal_mode_private.pending_exit_answers from public, anon, authenticated;

-- The note argument stays for installed apps, and is ignored.
create or replace function public.record_exit_answer(p_reason text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, halal_mode_private
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into halal_mode_private.pending_exit_answers (user_id, reason) values (auth.uid(), p_reason)
  on conflict (user_id) do update set reason = excluded.reason, answered_at = now();
end;
$function$;

-- Keeping the account withdraws the answer.
select halal_mode_private.patch_once('public.cancel_my_account_deletion()',
  '  delete from account_deletion_requests where user_id = auth.uid();',
  '  delete from account_deletion_requests where user_id = auth.uid();
  delete from halal_mode_private.pending_exit_answers where user_id = auth.uid();');

-- Runs before the erasure cascades away the profile, its connections and the answer itself.
create function halal_mode_private.count_exit_answer_on_erasure()
returns trigger language plpgsql security definer
set search_path = public, halal_mode_private as $$
begin
  insert into halal_mode_private.exit_answers (reason, note, gender, country, stayed, ever_connected, week)
  select e.reason, null, old.gender::text, old.country,
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
create trigger profiles_count_exit_answer
before delete on public.profiles
for each row execute function halal_mode_private.count_exit_answer_on_erasure();

drop function halal_mode_private.patch_once(text, text, text);
