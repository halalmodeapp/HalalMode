-- Pre-launch boundary fixes from the red-team review (2026-10-03).
--
-- Each function below is edited in place from its live definition rather than
-- restated: several have been restated before and lost guards that way. Every
-- replacement asserts that its anchor text was found, so a definition that has
-- drifted fails this migration loudly instead of being half-patched.

create or replace function halal_mode_private.patch_function(
  p_signature text,
  p_find text,
  p_replace text
) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_signature::regprocedure);
begin
  if position(p_find in v_def) = 0 then
    raise exception 'patch_function: anchor not found in %: %', p_signature, p_find;
  end if;
  execute replace(v_def, p_find, p_replace);
end;
$$;

-- ---------------------------------------------------------------------------
-- C1. Location is kept to about a kilometre.
--
-- Two decimal places of latitude is about 1.1 km, which is all distance
-- matching needs. A trigger rounds every write, whichever path makes it, and
-- existing rows are rounded once here. The precise reading never persists.
-- ---------------------------------------------------------------------------

create or replace function halal_mode_private.round_profile_location()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null then new.latitude := round(new.latitude::numeric, 2)::double precision; end if;
  if new.longitude is not null then new.longitude := round(new.longitude::numeric, 2)::double precision; end if;
  return new;
end;
$$;

drop trigger if exists profiles_round_location on public.profiles;
create trigger profiles_round_location
  before insert or update of latitude, longitude on public.profiles
  for each row execute function halal_mode_private.round_profile_location();

do $$
begin
  -- The location guard only lets the device-location path change these
  -- columns; this one-off rounding is that path's own rule applied to old rows.
  perform set_config('app.location_rpc', 'true', true);
  update public.profiles
  set latitude = round(latitude::numeric, 2)::double precision,
      longitude = round(longitude::numeric, 2)::double precision
  where latitude is not null
    and (latitude <> round(latitude::numeric, 2)::double precision
      or longitude <> round(longitude::numeric, 2)::double precision);
end;
$$;

-- ---------------------------------------------------------------------------
-- H1. Nothing in a set is readable or actionable before that member's dawn.
-- ---------------------------------------------------------------------------

select halal_mode_private.patch_function(
  'halal_mode_private.can_read_current_introduction(uuid)',
  'and r.expires_at > now()',
  'and r.expires_at > now()
      and r.opens_at <= now()'
);

select halal_mode_private.patch_function(
  'halal_mode_private.current_introduction_subject(uuid)',
  'and r.expires_at > now()',
  'and r.expires_at > now()
    and r.opens_at <= now()'
);

select halal_mode_private.patch_function(
  'halal_mode_private.can_read_profile_media(text)',
  'and r.expires_at > now()',
  'and r.expires_at > now()
      and r.opens_at <= now()'
);

-- ---------------------------------------------------------------------------
-- H1 + H2. Both selection entry points enforce the same rules: the set must
-- be open, and a member who owes answers cannot submit. The ranked route calls
-- this one, so the rules sit below both.
-- ---------------------------------------------------------------------------

create or replace function public.submit_round_selections(p_round_id uuid, p_introduction_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private
as $$
begin
  perform halal_mode_private.require_current_legal_consents(auth.uid());
  if exists (select 1 from halal_mode_private.owed_connection(auth.uid())) then
    raise exception 'Answer the questions you owe before continuing' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.rounds r
    where r.id = p_round_id and r.user_id = auth.uid() and r.opens_at <= now()
  ) then
    raise exception 'This set is not open yet' using errcode = '42501';
  end if;
  return halal_mode_private.submit_round_selections_after_legal_consent(p_round_id, p_introduction_ids);
end;
$$;

-- ---------------------------------------------------------------------------
-- H3. Two people finishing their answers at the same moment both see the
-- other's last answer: each answer takes the connection's row lock first, so
-- the second transaction always evaluates the stage after the first commits.
-- ---------------------------------------------------------------------------

select halal_mode_private.patch_function(
  'halal_mode_private.submit_answer_after_legal_consent(uuid,text,text)',
  'and (user_a = auth.uid() or user_b = auth.uid());
  if v_other_id is null then',
  'and (user_a = auth.uid() or user_b = auth.uid())
  for update;
  if v_other_id is null then'
);

-- M6. Answers are for the questions, not for moving off the app: the same
-- contact detection the chat uses keeps phone numbers, emails and handles out.
select halal_mode_private.patch_function(
  'halal_mode_private.submit_answer_after_legal_consent(uuid,text,text)',
  'raise exception ''Answer must be between 10 and 2000 characters'' using errcode = ''22023'';
  end if;',
  'raise exception ''Answer must be between 10 and 2000 characters'' using errcode = ''22023'';
  end if;
  if halal_mode_private.message_contains_contact(p_answer) then
    raise exception ''Answers cannot include contact details'' using errcode = ''22023'';
  end if;'
);

-- Repair any pair that a past race left waiting with every answer in.
do $$
declare
  v_id uuid;
begin
  for v_id in select id from public.connections where stage = 'answering' and closed_at is null loop
    perform public.refresh_connection_stage_after_answer(v_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- H6. Blocking, reporting and hiding never wait on accepting new terms.
-- Someone returning to stop harassment must be able to do it first.
-- ---------------------------------------------------------------------------

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.block_introduction_member(uuid)',
    'public.report_introduction_member(uuid,text)',
    'public.hide_introduction_member(uuid)',
    'public.hide_connection_member(uuid)'
  ] loop
    perform halal_mode_private.patch_function(
      v_signature,
      'perform halal_mode_private.require_current_legal_consents(v_viewer);',
      '-- Safety actions are not gated on accepting updated terms.'
    );
  end loop;
  -- These two are thin wrappers that checked terms with auth.uid().
  foreach v_signature in array array[
    'public.block_connection_member(uuid)',
    'public.report_connection_member(uuid,text)'
  ] loop
    perform halal_mode_private.patch_function(
      v_signature,
      'perform halal_mode_private.require_current_legal_consents(auth.uid());',
      'if auth.uid() is null then
    raise exception ''Authentication required'' using errcode = ''42501'';
  end if;
  -- Safety actions are not gated on accepting updated terms.'
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- H7. Reports only through the contextual RPCs, bounded, and kept.
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.reports from authenticated, anon;

-- A report outlives either account, so deleting an account cannot erase a
-- report made about it (or by it). The ids stay as the evidence; the rows are
-- readable only by the service role.
do $$
declare
  v_name text;
begin
  for v_name in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'f'
  loop
    execute format('alter table public.reports drop constraint %I', v_name);
  end loop;
end;
$$;

comment on table public.reports is
  'Safety reports. Retained after either account is deleted, for moderation; service-role access only.';

-- Mass reporting from one account is bounded; the reporter is not told the
-- limit's details, only that it was reached.
create or replace function halal_mode_private.limit_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Too many reports today; contact support if this is urgent' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.reports
    where reporter_id = new.reporter_id and subject_id = new.subject_id
      and created_at > now() - interval '24 hours'
  ) then
    -- Already reported today: one record is enough.
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_limit on public.reports;
create trigger reports_limit
  before insert on public.reports
  for each row execute function halal_mode_private.limit_reports();

drop function halal_mode_private.patch_function(text, text, text);
