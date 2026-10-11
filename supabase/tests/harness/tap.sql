-- The part of pgTAP the contracts use, with pgTAP's names, arguments and TAP
-- output, so the same .test.sql files also run under `supabase test db`.
--
-- Every line is returned, as pgTAP does, and also raised as a NOTICE starting
-- "tap: ", which is how the harness reads results even from a file that stops
-- on an error part-way.
--
-- Supported: plan, finish, ok, is, isnt, lives_ok, throws_ok (four arguments),
-- results_eq (two queries), has_table and col_is_null. A test that needs more
-- of pgTAP adds it here with pgTAP's semantics.

create function extensions._tap_emit(p_line text) returns text
language plpgsql as $$
begin
  raise notice 'tap: %', p_line;
  return p_line;
end;
$$;

create function extensions._tap_state() returns void
language plpgsql as $$
begin
  create temp table if not exists _tap_state (planned integer, ran integer not null default 0, failed integer not null default 0);
  if not exists (select 1 from _tap_state) then
    insert into _tap_state (planned) values (null);
  end if;
end;
$$;

create function extensions.plan(p_count integer) returns text
language plpgsql as $$
begin
  perform extensions._tap_state();
  update _tap_state set planned = p_count;
  return extensions._tap_emit('1..' || p_count);
end;
$$;

create function extensions._tap_diag(p_text text) returns text
language sql as $$
  select string_agg('# ' || line, E'\n') from regexp_split_to_table(p_text, E'\n') as line
$$;

-- Records one result and returns its TAP line(s).
create function extensions._tap_result(p_ok boolean, p_description text, p_diag text default null)
returns text language plpgsql as $$
declare
  v_number integer;
  v_line text;
  v_name text := coalesce(p_description, '');
begin
  perform extensions._tap_state();
  update _tap_state set ran = ran + 1, failed = failed + case when p_ok then 0 else 1 end
  returning ran into v_number;
  v_line := case when p_ok then 'ok ' else 'not ok ' end || v_number
    || case when v_name = '' then '' else ' - ' || v_name end;
  if not p_ok then
    v_line := v_line || E'\n' || extensions._tap_diag(
      'Failed test ' || v_number || case when v_name = '' then '' else ': "' || v_name || '"' end
      || coalesce(E'\n' || p_diag, '')
    );
  end if;
  return extensions._tap_emit(v_line);
end;
$$;

create function extensions.ok(p_ok boolean, p_description text default null) returns text
language sql as $$
  select extensions._tap_result(
    coalesce(p_ok, false), p_description,
    case when p_ok is null then '    (test result was NULL)' end
  )
$$;

create function extensions."is"(p_have anyelement, p_want anyelement, p_description text default null)
returns text language sql as $$
  select extensions._tap_result(
    p_have is not distinct from p_want, p_description,
    '        have: ' || coalesce(p_have::text, 'NULL') || E'\n'
      || '        want: ' || coalesce(p_want::text, 'NULL')
  )
$$;

create function extensions.isnt(p_have anyelement, p_want anyelement, p_description text default null)
returns text language sql as $$
  select extensions._tap_result(
    p_have is distinct from p_want, p_description,
    '        have: ' || coalesce(p_have::text, 'NULL') || E'\n'
      || '        want: anything else'
  )
$$;

create function extensions.lives_ok(p_sql text, p_description text default null)
returns text language plpgsql as $$
declare
  v_state text;
  v_message text;
begin
  execute p_sql;
  return extensions._tap_result(true, p_description);
exception when others then
  get stacked diagnostics v_state = returned_sqlstate, v_message = message_text;
  return extensions._tap_result(false, p_description, '    died: ' || v_state || ': ' || v_message);
end;
$$;

-- pgTAP's throws_ok(sql, errcode, errmsg, description); a null errcode or
-- errmsg matches any.
create function extensions.throws_ok(p_sql text, p_errcode text, p_errmsg text, p_description text)
returns text language plpgsql as $$
declare
  v_state text;
  v_message text;
begin
  execute p_sql;
  return extensions._tap_result(false, p_description,
    '      caught: no exception' || E'\n' || '      wanted: ' || coalesce(p_errcode, p_errmsg, 'an exception'));
exception when others then
  get stacked diagnostics v_state = returned_sqlstate, v_message = message_text;
  if (p_errcode is null or v_state = p_errcode) and (p_errmsg is null or v_message = p_errmsg) then
    return extensions._tap_result(true, p_description);
  end if;
  return extensions._tap_result(false, p_description,
    '      caught: ' || v_state || ': ' || v_message || E'\n'
      || '      wanted: ' || coalesce(p_errcode, '') || case when p_errmsg is null then '' else ': ' || p_errmsg end);
end;
$$;

-- Both queries' rows, in order, must match.
create function extensions.results_eq(p_have_sql text, p_want_sql text, p_description text default null)
returns text language plpgsql as $$
declare
  v_have text[];
  v_want text[];
begin
  execute format('select coalesce(array_agg(t::text order by n), ''{}'') from (select row_number() over () as n, q.* from (%s) q) t', p_have_sql)
    into v_have;
  execute format('select coalesce(array_agg(t::text order by n), ''{}'') from (select row_number() over () as n, q.* from (%s) q) t', p_want_sql)
    into v_want;
  -- The row number is part of each row's text on both sides, so order counts.
  return extensions._tap_result(v_have = v_want, p_description,
    '        have: ' || v_have::text || E'\n' || '        want: ' || v_want::text);
end;
$$;

create function extensions.has_table(p_schema name, p_table name, p_description text default null)
returns text language sql as $$
  select extensions.ok(
    exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = p_schema and c.relname = p_table and c.relkind in ('r', 'p')
    ),
    coalesce(p_description, 'Table ' || quote_ident(p_schema) || '.' || quote_ident(p_table) || ' should exist')
  )
$$;

create function extensions.col_is_null(p_schema name, p_table name, p_column name, p_description text default null)
returns text language sql as $$
  select extensions.ok(
    exists (
      select 1 from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = p_schema and c.relname = p_table and a.attname = p_column
        and a.attnum > 0 and not a.attisdropped and not a.attnotnull
    ),
    coalesce(p_description, 'Column ' || p_table || '.' || p_column || ' should allow NULL')
  )
$$;

create function extensions.finish() returns setof text
language plpgsql as $$
declare
  v_planned integer;
  v_ran integer;
  v_failed integer;
begin
  perform extensions._tap_state();
  select planned, ran, failed into v_planned, v_ran, v_failed from _tap_state;
  if v_planned is not null and v_planned <> v_ran then
    return next extensions._tap_emit('# Looks like you planned ' || v_planned || ' tests but ran ' || v_ran);
  end if;
  if v_failed > 0 then
    return next extensions._tap_emit('# Looks like you failed ' || v_failed || ' test' || case when v_failed > 1 then 's' else '' end || ' of ' || v_ran);
  end if;
  return;
end;
$$;
