-- mutual_first_choices is a view over the choices, which the round deletes
-- already remove; 0161 tried to delete from it directly.

create or replace function public.reset_my_sample_flow()
returns jsonb
language plpgsql
security definer
set search_path = public, halal_mode_private as $$
declare
  v_me uuid := auth.uid();
  v_rounds int;
  v_connections int;
begin
  if v_me is null then
    raise exception 'You must be signed in' using errcode = '42501';
  end if;
  if not halal_mode_private.release_flag_enabled_for('tester_tools', v_me) then
    raise exception 'Reset is for testers only' using errcode = '42501';
  end if;

  delete from public.connections c
  where (c.user_a = v_me and halal_mode_private.is_demo_member(c.user_b))
     or (c.user_b = v_me and halal_mode_private.is_demo_member(c.user_a));
  get diagnostics v_connections = row_count;

  -- My sample rounds, and the sample members' mirror rounds that point at me.
  delete from public.rounds r
  where exists (select 1 from halal_mode_private.demo_rounds d where d.round_id = r.id)
    and (
      r.user_id = v_me
      or exists (
        select 1 from public.introductions i
        where i.round_id = r.id and i.subject_id = v_me
      )
    );
  get diagnostics v_rounds = row_count;

  delete from halal_mode_private.pair_exposure e
  where (e.user_low = v_me and halal_mode_private.is_demo_member(e.user_high))
     or (e.user_high = v_me and halal_mode_private.is_demo_member(e.user_low));

  return jsonb_build_object('rounds', v_rounds, 'connections', v_connections);
end;
$$;

revoke all on function public.reset_my_sample_flow() from public, anon;
grant execute on function public.reset_my_sample_flow() to authenticated;
