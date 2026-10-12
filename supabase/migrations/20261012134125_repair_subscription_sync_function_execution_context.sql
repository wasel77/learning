-- The sync bridge already runs as postgres behind the existing 64-character
-- secret gate. Keep the data-writing helper private to that bridge so it can
-- update the matched profile, audit row, and expiry snapshot atomically.
alter function wasel_sync.apply_profiles(bigint,jsonb) owner to postgres;

revoke all on function wasel_sync.apply_profiles(bigint,jsonb)
  from public, anon, authenticated, service_role, wasel_subscription_writer;
