-- Recheck waiting mutuals even when readiness or consent changed without a
-- capacity, pause or tier transition. Use the same locked promotion path.
create function halal_mode_private.recheck_waiting_connections()
returns integer
language sql
security definer
set search_path = public, halal_mode_private as $$
  select halal_mode_private.promote_waiting_connection_candidates(
    '{}'::uuid[],
    coalesce(jsonb_agg(jsonb_build_object('a', q.user_a, 'b', q.user_b)
                      order by q.matched_at, q.user_a, q.user_b), '[]'::jsonb)
  )
  from (
    select q.user_a, q.user_b, q.matched_at
    from public.mutual_connection_queue q
    where halal_mode_private.matching_member_eligible(q.user_a)
      and halal_mode_private.matching_member_eligible(q.user_b)
      and not halal_mode_private.pair_is_hidden(q.user_a, q.user_b)
      and not exists (select 1 from public.blocks b
        where (b.blocker_id = q.user_a and b.blocked_id = q.user_b)
           or (b.blocker_id = q.user_b and b.blocked_id = q.user_a))
      and not exists (select 1 from public.connections c
        where c.user_a = q.user_a and c.user_b = q.user_b)
      and not exists (
        select 1
        from unnest(array[q.user_a, q.user_b]) as member(id)
        cross join lateral public.tier_limits(halal_mode_private.effective_membership_tier(member.id)) l
        where (select count(*) from public.connections c
               where c.closed_at is null and member.id in (c.user_a, c.user_b)) >= l.open_connections
      )
    order by q.matched_at, q.user_a, q.user_b
    limit 20
  ) q;
$$;
revoke all on function halal_mode_private.recheck_waiting_connections() from public, anon, authenticated, service_role;
select cron.schedule('halal-mode-recheck-waiting-connections', '* * * * *',
  'select halal_mode_private.recheck_waiting_connections()');

-- Count a submitted response while the member still has an account. At
-- erasure it moves to the anonymous table in the same transaction.
-- The original survey counted immediately and left a per-account mark.
-- A still-active member with that mark has already been counted.
create function halal_mode_private.exit_survey_totals(p_since date)
returns jsonb
language sql stable
set search_path = public, halal_mode_private as $$
  select coalesce(jsonb_object_agg(counts.reason, counts.total), '{}'::jsonb)
  from (
    select response.reason, count(*) as total
    from (
      select e.reason, e.week from halal_mode_private.exit_answers e
      union all
      select e.reason, date_trunc('week', e.answered_at)::date
      from halal_mode_private.pending_exit_answers e
      where not exists (select 1 from halal_mode_private.exit_answer_marks m where m.user_id = e.user_id)
    ) response
    where response.week >= date_trunc('week', p_since::timestamp)::date
    group by response.reason
  ) counts;
$$;
revoke all on function halal_mode_private.exit_survey_totals(date) from public, anon, authenticated, service_role;

-- These functions have accumulated other rules in earlier migrations. Keep
-- their complete definitions and grants, replacing each known clause once.
do $migration$
declare
  patch record;
  definition text;
begin
  for patch in
    select * from (values
      ('halal_mode_private.accepts_row(halal_mode_private.member_matching_facts,halal_mode_private.member_matching_facts,text)',
       'or b.education is null or b.education = any(a.preferred_education)',
       'or b.education is null or b.education = ''prefer_not_to_say'' or b.education = any(a.preferred_education)'),
      ('halal_mode_private.accepts_row(halal_mode_private.member_matching_facts,halal_mode_private.member_matching_facts,text)',
       'or b.occupation is null or b.occupation = any(a.preferred_occupations)',
       'or b.occupation is null or b.occupation = ''prefer_not_to_say'' or b.occupation = any(a.preferred_occupations)'),
      ('halal_mode_private.premium_filters_allow(uuid,uuid)',
       'or c.education is null',
       'or c.education is null or c.education = ''prefer_not_to_say'''),
      ('halal_mode_private.premium_filters_allow(uuid,uuid)',
       'or nullif(c.occupation, '''') is null',
       'or nullif(c.occupation, '''') is null or c.occupation = ''prefer_not_to_say'''),
      ('public.admin_match_stats(integer)',
       $old$'leaving', (
        select coalesce(jsonb_object_agg(x.reason, x.n), '{}'::jsonb)
        from (select e.reason, count(*) as n from halal_mode_private.exit_answers e
              where e.week >= v_since::date group by e.reason) x
      )$old$,
       '''leaving'', halal_mode_private.exit_survey_totals(v_since::date)'),
      ('halal_mode_private.count_exit_answer_on_erasure()',
       $old$date_trunc('week', now())::date
  from halal_mode_private.pending_exit_answers e
  where e.user_id = old.id$old$,
       $new$date_trunc('week', e.answered_at)::date
  from halal_mode_private.pending_exit_answers e
  where e.user_id = old.id
    and not exists (select 1 from halal_mode_private.exit_answer_marks m where m.user_id = old.id)$new$)
    ) as patches(signature, old_clause, new_clause)
    order by signature, old_clause
  loop
    definition := replace(pg_get_functiondef(patch.signature::regprocedure), chr(13), '');
    if length(definition) - length(replace(definition, patch.old_clause, '')) <> length(patch.old_clause) then
      raise exception 'Expected one matching clause in %', patch.signature;
    end if;
    execute replace(definition, patch.old_clause, patch.new_clause);
  end loop;
end;
$migration$;
