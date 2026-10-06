-- The project moved from Seoul to London (2026-10-06) so members in the UK and
-- Europe are a short hop from their data. Earlier migrations scheduled their
-- cron jobs with older project addresses written in; repoint every job here.
do $$
declare
  j record;
begin
  for j in select jobid, command from cron.job
    where command like '%ziboxxxiedcqfdgzqgjv.supabase.co%' or command like '%rikqvwwhuwstanngsihs.supabase.co%'
  loop
    perform cron.alter_job(
      j.jobid,
      command := replace(replace(j.command,
        'ziboxxxiedcqfdgzqgjv.supabase.co', 'lfuuywsmydruvqkqwvzw.supabase.co'),
        'rikqvwwhuwstanngsihs.supabase.co', 'lfuuywsmydruvqkqwvzw.supabase.co')
    );
  end loop;
  assert not exists (select 1 from cron.job where command like '%ziboxxxiedcqfdgzqgjv%' or command like '%rikqvwwhuwstanngsihs%'),
    'no scheduled job may still call an old project';
end $$;
