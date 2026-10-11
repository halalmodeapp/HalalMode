-- Same tables and functions the migrations use; jobs are recorded, not run.
create schema cron;

create table cron.job (
  jobid bigserial primary key,
  schedule text not null,
  command text not null,
  nodename text not null default 'localhost',
  nodeport integer not null default 5432,
  database text not null default current_database(),
  username text not null default current_user,
  active boolean not null default true,
  jobname text,
  unique (jobname, username)
);

create table cron.job_run_details (
  jobid bigint,
  runid bigserial primary key,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
);

create function cron.schedule(job_name text, schedule text, command text)
returns bigint language plpgsql as $$
declare v_id bigint;
begin
  update cron.job set schedule = $2, command = $3, active = true
  where jobname = job_name and username = current_user
  returning jobid into v_id;
  if v_id is null then
    insert into cron.job (jobname, schedule, command) values (job_name, $2, $3)
    returning jobid into v_id;
  end if;
  return v_id;
end;
$$;

create function cron.schedule(schedule text, command text)
returns bigint language sql as $$
  insert into cron.job (schedule, command) values ($1, $2) returning jobid;
$$;

create function cron.unschedule(job_name text)
returns boolean language plpgsql as $$
begin
  delete from cron.job where jobname = job_name and username = current_user;
  if not found then
    raise exception 'could not find valid entry for job ''%''', job_name;
  end if;
  return true;
end;
$$;

create function cron.unschedule(job_id bigint)
returns boolean language plpgsql as $$
begin
  delete from cron.job where jobid = job_id;
  if not found then
    raise exception 'could not find valid entry for job %', job_id;
  end if;
  return true;
end;
$$;

create function cron.alter_job(
  job_id bigint,
  schedule text default null,
  command text default null,
  database text default null,
  username text default null,
  active boolean default null
) returns void language plpgsql as $$
begin
  update cron.job j set
    schedule = coalesce(alter_job.schedule, j.schedule),
    command = coalesce(alter_job.command, j.command),
    database = coalesce(alter_job.database, j.database),
    username = coalesce(alter_job.username, j.username),
    active = coalesce(alter_job.active, j.active)
  where j.jobid = job_id;
  if not found then
    raise exception 'could not find valid entry for job %', job_id;
  end if;
end;
$$;
