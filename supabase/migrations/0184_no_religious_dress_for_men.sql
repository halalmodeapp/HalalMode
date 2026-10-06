-- Religious dress is asked of women only. Men are not asked, it is not
-- required of them, nobody filters men by it, and any answers or filters
-- already saved about men's dress are cleared.
do $$
declare
  v_def text;
  f text;
begin
  foreach f in array array['public.profile_is_ready_for_matching(uuid)', 'public.get_my_profile_readiness()'] loop
    select pg_get_functiondef(f::regprocedure) into v_def;
    if position('and p.religious_dress is not null' in v_def) > 0 then
      v_def := replace(v_def, 'and p.religious_dress is not null',
        'and (p.gender::text <> ''female'' or p.religious_dress is not null)');
    elsif position('case when p.religious_dress is null then ''dress'' end' in v_def) > 0 then
      v_def := replace(v_def, 'case when p.religious_dress is null then ''dress'' end',
        'case when p.gender::text = ''female'' and p.religious_dress is null then ''dress'' end');
    else
      raise exception '%: dress rule not found', f;
    end if;
    execute v_def;
  end loop;

  select pg_get_functiondef('public.set_my_profile_details(text, text, text[], text[])'::regprocedure) into v_def;
  if position('or (v_gender = ''male'' and p_religious_dress in (''full_beard'', ''trimmed_beard'', ''traditional_dress''))' in v_def) = 0 then
    raise exception 'set_my_profile_details: dress check not found';
  end if;
  v_def := replace(v_def,
    'or (v_gender = ''male'' and p_religious_dress in (''full_beard'', ''trimmed_beard'', ''traditional_dress''))', '');
  v_def := replace(v_def, 'if p_religious_dress is not null and p_religious_dress <> ''no_religious_dress'' and not (',
    'if v_gender = ''male'' then p_religious_dress := null; end if;' || E'\n  ' ||
    'if p_religious_dress is not null and p_religious_dress <> ''no_religious_dress'' and not (');
  execute v_def;
end;
$$;

update public.profiles set religious_dress = null where gender::text = 'male' and religious_dress is not null;

update public.private_preferences pp
set preferred_dress = '{}', premium_must_have = coalesce(premium_must_have, '{}'::jsonb) - 'dress'
from public.profiles p
where p.id = pp.user_id and p.gender::text = 'female'
  and (cardinality(pp.preferred_dress) > 0 or pp.premium_must_have ? 'dress');
