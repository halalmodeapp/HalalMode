begin;
set local search_path = public, extensions, halal_mode_private;
select plan(5);

select is(public.launch_state(), '{"launched": false}'::jsonb, 'Halal Mode starts before launch');
select ok(
  has_function_privilege('anon', 'public.launch_state()', 'EXECUTE')
  and not has_function_privilege('anon', 'halal_mode_private.set_launched(boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'halal_mode_private.set_launched(boolean)', 'EXECUTE'),
  'anyone can read the switch; nobody outside the database can flip it'
);
select is(halal_mode_private.set_launched(true)->>'launched', 'true', 'launching flips it');
select is(public.launch_state(), '{"launched": true}'::jsonb, 'and everyone reads the new value');
select ok(halal_mode_private.set_launched(false)->>'launched_at' is null, 'and it can be undone');

select * from finish();
rollback;
