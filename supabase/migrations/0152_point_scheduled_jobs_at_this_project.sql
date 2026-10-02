-- The project moved to the halalmodeapp account (2026-10-02). Earlier
-- migrations scheduled their cron jobs with the old project's address written
-- in, so on the new project those jobs would have called the old project's
-- functions. Repoint every job at this project.
do $$
declare
  j record;
begin
  for j in select jobid, command from cron.job where command like '%rikqvwwhuwstanngsihs.supabase.co%' loop
    perform cron.alter_job(
      j.jobid,
      command := replace(j.command, 'rikqvwwhuwstanngsihs.supabase.co', 'ziboxxxiedcqfdgzqgjv.supabase.co')
    );
  end loop;
  assert not exists (select 1 from cron.job where command like '%rikqvwwhuwstanngsihs%'),
    'no scheduled job may still call the old project';
end $$;
