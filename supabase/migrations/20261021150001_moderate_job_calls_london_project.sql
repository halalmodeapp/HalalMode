-- 20261021102527 rescheduled halal-mode-moderate with the old Seoul project
-- address written in (ziboxxxiedcqfdgzqgjv), undoing 0179. Without this,
-- photo and text moderation (and Luna, when enabled) would call a project
-- that is no longer the live one. Repoint every job, as 0179 does.
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
