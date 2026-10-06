-- A bio needs 50 characters, not 80. Eighty asked for a paragraph before
-- someone could start; fifty is two honest sentences. The profile screen
-- prompts for more, and says so only when a save is refused.
do $$
declare
  v_def text;
  f text;
begin
  foreach f in array array['public.profile_is_ready_for_matching(uuid)', 'public.get_my_profile_readiness()'] loop
    select pg_get_functiondef(f::regprocedure) into v_def;
    if position('length(trim(p.bio)) >= 80' in v_def) = 0 and position('length(trim(p.bio)) < 80' in v_def) = 0 then
      raise exception '%: bio rule not found', f;
    end if;
    v_def := replace(replace(v_def, 'length(trim(p.bio)) >= 80', 'length(trim(p.bio)) >= 50'),
                     'length(trim(p.bio)) < 80', 'length(trim(p.bio)) < 50');
    execute v_def;
  end loop;
end;
$$;
