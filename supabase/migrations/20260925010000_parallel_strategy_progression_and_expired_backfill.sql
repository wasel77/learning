-- Keep the visible level order unchanged while allowing the strategies branch
-- to start in parallel once the account has reached advanced access.
create or replace function public.can_access_level(
  requested_level public.user_level
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.is_active = true
      and profile.level is not null
      and case profile.subscription_package
        when 'bronze' then case profile.level
          when 'strategies' then requested_level in ('beginner', 'advanced', 'expert', 'strategies')
          when 'expert' then requested_level in ('beginner', 'advanced', 'expert', 'strategies')
          when 'advanced' then requested_level in ('beginner', 'advanced', 'strategies')
          else requested_level = 'beginner'
        end
        when 'diamond' then case profile.level
          when 'strategies' then true
          when 'professional' then requested_level in ('beginner', 'advanced', 'expert', 'professional', 'strategies')
          when 'expert' then requested_level in ('beginner', 'advanced', 'expert', 'strategies')
          when 'advanced' then requested_level in ('beginner', 'advanced', 'strategies')
          else requested_level = 'beginner'
        end
      end
  );
$$;

revoke execute on function public.can_access_level(public.user_level)
  from public, anon;
grant execute on function public.can_access_level(public.user_level)
  to authenticated;

-- The expiry snapshot was introduced after earlier sync runs. Seed only missing
-- rows from the latest expiry already recorded by those runs; never overwrite a
-- newer subscription_cycles value and never change profile state or package.
insert into private.subscription_cycles(user_id, expires_on, source_synced_at)
select distinct on (change.profile_id)
  change.profile_id,
  change.expiry,
  now()
from wasel_sync.changes change
where change.expiry is not null
order by change.profile_id, change.run_id desc
on conflict (user_id) do nothing;

-- Queue the historical expired-cycle message with the same idempotency key as
-- the recurring reminder. The outbox record is the durable backfill ledger.
create or replace function private.enqueue_subscription_expired_backfill(
  p_cutoff date default date '2026-09-25'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  message_key text;
  eligible_count integer := 0;
  queued_count integer := 0;
  skipped_previous_count integer := 0;
  skipped_missing_email_count integer := 0;
begin
  for item in
    select c.user_id, c.expires_on, p.subscription_package::text as package_name,
      coalesce(nullif(btrim(p.email), ''), nullif(btrim(a.email), '')) as recipient_email
    from private.subscription_cycles c
    join public.profiles p on p.id = c.user_id
    join auth.users a on a.id = c.user_id
    where c.expires_on < p_cutoff
      and p.is_active = false
      and p.subscription_package::text in ('bronze', 'diamond')
    order by c.user_id
  loop
    eligible_count := eligible_count + 1;
    message_key := 'subscription:' || item.user_id::text || ':' || item.expires_on::text || ':subscription_expired';

    if item.recipient_email is null
      or item.recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      skipped_missing_email_count := skipped_missing_email_count + 1;
      continue;
    end if;

    if exists (
      select 1
      from public.notification_email_outbox
      where idempotency_key = message_key || ':email'
    ) then
      skipped_previous_count := skipped_previous_count + 1;
      continue;
    end if;

    perform private.queue_notification(
      item.user_id,
      'انتهى اشتراكك',
      'انتهى اشتراكك، ويمكنك تجديده الآن لإعادة تنشيط حسابك ومواصلة التعلم.',
      'subscription_expired',
      '/account-disabled',
      'subscription',
      null,
      message_key,
      'subscription_expired'
    );

    update public.notification_email_outbox
    set payload = payload || jsonb_build_object(
      'expires_on', item.expires_on,
      'subscription_package', item.package_name,
      'backfill_cutoff', p_cutoff
    )
    where idempotency_key = message_key || ':email';

    queued_count := queued_count + 1;
  end loop;

  return jsonb_build_object(
    'eligible', eligible_count,
    'queued', queued_count,
    'skipped_previous', skipped_previous_count,
    'skipped_missing_email', skipped_missing_email_count
  );
end;
$$;

revoke all on function private.enqueue_subscription_expired_backfill(date)
  from public, anon, authenticated;
