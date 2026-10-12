-- Keep the existing job and watchdog; only shorten the primary dispatch
-- interval after overlap protection and resource usage were verified.
do $$
declare target_job bigint;
begin
  select jobid into target_job
  from cron.job
  where jobname='wasel-subscription-sync-hourly';

  if target_job is null then
    raise exception 'wasel_subscription_sync_job_missing';
  end if;

  perform cron.alter_job(
    job_id => target_job,
    schedule => '*/5 * * * *',
    command => 'SELECT wasel_sync.dispatch();',
    active => true
  );
end;
$$;
