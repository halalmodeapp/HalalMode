-- The daily deal as one record the server owns: one set per member dawn, its seats and picks from one
-- tier, frozen once it opens, and a waiting yes delivered only into a real seat before it runs out.
-- docs/INVARIANT_AUDIT.md, recommendation 2 (M2, M5, M7, M12, M15, M16, M18).

create function halal_mode_private.patch_once(p_signature text, p_find text, p_replace text, p_times int default 1)
returns void language plpgsql as $$
declare
  v_def text := replace(pg_get_functiondef(p_signature::regprocedure), chr(13), '');
  v_find text := replace(p_find, chr(13), '');
  v_count int := (length(v_def) - length(replace(v_def, v_find, ''))) / greatest(length(v_find), 1);
begin
  if v_count <> p_times then
    raise exception 'patch: anchor found % times in % (wanted %): %', v_count, p_signature, p_times, p_find;
  end if;
  execute replace(v_def, v_find, replace(p_replace, chr(13), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- M2 and M18. Each member dawn gets one set. The worker is told the member's last dawn so it carries
-- on from there, and the server keeps only windows that are a real Fajr-to-Fajr day after it, for
-- members who actually sit at the leased table. A dawn already given a set is never given another.
-- ---------------------------------------------------------------------------
select halal_mode_private.patch_once('public.league_next_job_service()',
  '''high_latitude_fajr_method'', p.high_latitude_fajr_method))',
  '''high_latitude_fajr_method'', p.high_latitude_fajr_method,
          ''last_dawn'', (select max(r.opens_at) from public.rounds r where r.user_id = p.id and r.cycle_date is not null)))');

create or replace function public.league_commit_rounds_service(p_job jsonb, p_windows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, halal_mode_private
set statement_timeout = '30s'
as $function$
declare
  v_count int;
  v_cycle date := (p_job ->> 'cycleDate')::date;
  v_started timestamptz;
begin
  perform halal_mode_private.league_take_lease(p_job);
  select started_at into v_started from halal_mode_private.league_cycles where cycle_date = v_cycle;
  insert into public.rounds (user_id, tier, opens_at, expires_at, cycle_date)
  select w.user_id, halal_mode_private.effective_membership_tier(p.id), w.opens_at, w.expires_at, v_cycle
  from jsonb_to_recordset(p_windows) as w(user_id uuid, opens_at timestamptz, expires_at timestamptz)
  join halal_mode_private.league_seats s
    on s.user_id = w.user_id and s.cycle_date = v_cycle and s.wave = (p_job ->> 'wave')::int
   and s.stratum = p_job ->> 'stratum' and s.table_no = (p_job ->> 'tableNo')::int
  join public.profiles p on p.id = w.user_id
  where w.opens_at > v_started
    and w.expires_at between w.opens_at + interval '12 hours' and w.opens_at + interval '36 hours'
    and not exists (select 1 from public.rounds r
                    where r.user_id = w.user_id and r.cycle_date is not null
                      and r.opens_at > w.opens_at - interval '1 hour')
  on conflict (user_id, cycle_date) where cycle_date is not null do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- Settings the matcher reads stay inside the ranges it was built for.
alter table halal_mode_private.league_config
  add constraint league_config_table_size_range check (table_size between 2 and 5000),
  add constraint league_config_base_seats_range check (base_seats between 1 and 10),
  add constraint league_config_decay_range check (fresh_decay > 0 and fresh_decay <= 1 and seat_decay > 0 and seat_decay <= 1),
  add constraint league_config_like_meets_like_range check (like_meets_like >= 0 and like_meets_like <= 10),
  add constraint league_config_return_days_range check (return_days between 1 and 30),
  add constraint league_config_dormant_range check (dormant_after_days between 1 and 365),
  add constraint league_config_start_minute_range check (start_minute_utc between 0 and 1439),
  add constraint league_config_lease_range check (lease_seconds between 30 and 3600),
  add constraint league_config_attempts_range check (max_attempts between 1 and 20);

-- ---------------------------------------------------------------------------
-- M16. Seats come from the same tier the set was prepared with, which is also the one picks use.
-- ---------------------------------------------------------------------------
select halal_mode_private.patch_once('halal_mode_private.league_advance()',
  'set seats = case when pool.tier = ''premium''',
  'set seats = case when r.tier = ''premium''');

-- ---------------------------------------------------------------------------
-- M5 and M15. A waiting yes goes only into a set with seats, while it is still within its seven
-- days at that set's dawn, and not after a pass. Otherwise it keeps waiting, or runs out.
-- The dawn is checked against the clock after the locks are held, not when the statement began.
-- ---------------------------------------------------------------------------
select halal_mode_private.patch_once('halal_mode_private.league_deliver_returns(date,uuid)',
  '    where r.submitted_at is null and r.opens_at > now()',
  '    where r.submitted_at is null and r.opens_at > clock_timestamp()
      and r.seats is not null
      and w.expires_at > r.opens_at
      and not halal_mode_private.league_pair_passed(w.recipient, w.sender)');

-- ---------------------------------------------------------------------------
-- M7. Nothing is added to a set after its dawn, judged by the clock once the locks are held.
-- ---------------------------------------------------------------------------
select halal_mode_private.patch_once('public.league_commit_edges_service(jsonb,jsonb)',
  '      and r.opens_at > now()',
  '      and r.opens_at > clock_timestamp()');
select halal_mode_private.patch_once('halal_mode_private.league_deal_topup(date,bigint,integer)',
  'r.opens_at > now() and r.submitted_at is null',
  'r.opens_at > clock_timestamp() and r.submitted_at is null', 2);

-- Once a set opens its cards are fixed. Safety and live eligibility can still take one away (a block,
-- a hide, a pause, a deletion, a lapsed consent), but a changed preference or profile detail cannot.
create function halal_mode_private.league_card_stands(p_viewer uuid, p_subject uuid)
returns boolean language sql stable security definer
set search_path = public, halal_mode_private as $$
  select halal_mode_private.matching_member_eligible(p_viewer)
     and halal_mode_private.matching_member_eligible(p_subject)
     and not exists (select 1 from public.blocks b
                     where (b.blocker_id = p_viewer and b.blocked_id = p_subject)
                        or (b.blocker_id = p_subject and b.blocked_id = p_viewer))
     and not exists (select 1 from halal_mode_private.member_hides h
                     where (h.hider_id = p_viewer and h.hidden_id = p_subject)
                        or (h.hider_id = p_subject and h.hidden_id = p_viewer));
$$;
revoke all on function halal_mode_private.league_card_stands(uuid, uuid) from public, anon, authenticated;
alter function halal_mode_private.league_card_stands(uuid, uuid) cost 1000;

select halal_mode_private.patch_once('public.get_current_round()',
  'halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id)',
  'halal_mode_private.league_card_stands(i.viewer_id, i.subject_id)');
select halal_mode_private.patch_once('halal_mode_private.can_read_current_introduction(uuid)',
  'halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id)',
  'halal_mode_private.league_card_stands(i.viewer_id, i.subject_id)');
select halal_mode_private.patch_once('halal_mode_private.can_read_profile_media(text)',
  'halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id)',
  'halal_mode_private.league_card_stands(i.viewer_id, i.subject_id)');
select halal_mode_private.patch_once('halal_mode_private.submit_round_selections_after_legal_consent(uuid,uuid[])',
  'select halal_mode_private.league_pair_stands(i.viewer_id, i.subject_id)',
  'select halal_mode_private.league_card_stands(i.viewer_id, i.subject_id)');

-- ---------------------------------------------------------------------------
-- M12. A short set is explained only by what really happened. If a table this member sat at failed,
-- the set is incomplete and nobody is blamed. A filter is blamed only against people who could
-- really be dealt: eligible, never passed, and not already connected.
-- ---------------------------------------------------------------------------
select halal_mode_private.patch_once('halal_mode_private.get_current_round_state_before_answer_gate()',
  '    select m.criterion into v_criterion from halal_mode_private.member_reach(v_member_id) m;',
  '    if exists (
      select 1 from public.rounds r
      join halal_mode_private.league_seats s on s.user_id = r.user_id and s.cycle_date = r.cycle_date
      join halal_mode_private.league_jobs j
        on (j.cycle_date, j.wave, j.stratum, j.table_no) = (s.cycle_date, s.wave, s.stratum, s.table_no)
      where r.id = (v_round ->> ''id'')::uuid and j.status = ''failed''
    ) then
      return jsonb_build_object(''status'', ''set_incomplete'', ''round'', null);
    end if;
    select m.criterion into v_criterion from halal_mode_private.member_reach(v_member_id) m;');

select halal_mode_private.patch_once('halal_mode_private.member_reach(uuid)',
  '    and public.profile_is_ready_for_matching(f.id)',
  '    and halal_mode_private.matching_member_eligible(f.id)
    and not halal_mode_private.league_pair_passed(p_user, f.id)');

drop function halal_mode_private.patch_once(text, text, text, int);
