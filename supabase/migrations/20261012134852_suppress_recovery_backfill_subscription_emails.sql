create table if not exists private.subscription_email_suppressed_cycles (
  user_id uuid not null references auth.users(id) on delete restrict,
  expires_on date not null,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, expires_on)
);

revoke all on private.subscription_email_suppressed_cycles
  from public, anon, authenticated, service_role;

-- The recovery sync corrected accounts that had been stale for up to 20 days.
-- Do not send a bulk retroactive "expired" email for that historic outage.
insert into private.subscription_email_suppressed_cycles(user_id,expires_on,reason)
select c.profile_id,c.expiry,'recovery_run_648_no_retroactive_email'
from wasel_sync.changes c
where c.run_id=648
  and c.old_active=true
  and c.new_active=false
on conflict (user_id,expires_on) do nothing;

create or replace function private.enqueue_subscription_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare item record; today_riyadh date := (now() at time zone 'Asia/Riyadh')::date;
  reminder_type text; reminder_title text; reminder_body text; reminder_link text; queued integer := 0;
begin
  for item in
    select c.user_id,c.expires_on,p.is_active,p.subscription_package::text package_name
    from private.subscription_cycles c
    join public.profiles p on p.id=c.user_id
    where p.email is not null and (
      c.expires_on - today_riyadh in (7,3,0)
      or (p.is_active=false and c.expires_on < today_riyadh)
    )
  loop
    if item.expires_on - today_riyadh = 7 then
      reminder_type := 'subscription_expiry_7d'; reminder_title := 'باقي 7 أيام على اشتراكك';
      reminder_body := 'باقي 7 أيام على انتهاء اشتراكك. جدّدي مبكرًا لاستمرار وصولك بدون انقطاع.'; reminder_link := '/profile';
    elsif item.expires_on - today_riyadh = 3 then
      reminder_type := 'subscription_expiry_3d'; reminder_title := 'باقي 3 أيام على اشتراكك';
      reminder_body := 'باقي 3 أيام على انتهاء اشتراكك. تقدرين تجدّدين الآن لاستمرار الوصول.'; reminder_link := '/profile';
    elsif item.expires_on = today_riyadh then
      reminder_type := 'subscription_expiry_today'; reminder_title := 'اليوم آخر يوم في اشتراكك';
      reminder_body := 'اليوم هو آخر يوم في اشتراكك الحالي. جدّدي قبل انتهائه لاستمرار حسابك.'; reminder_link := '/profile';
    else
      reminder_type := 'subscription_expired'; reminder_title := 'انتهى اشتراكك';
      reminder_body := 'انتهى اشتراكك وتحول حسابك إلى غير نشط. يمكنك إعادة تنشيطه بالتجديد.'; reminder_link := '/account-disabled';
      if exists (
        select 1 from private.subscription_email_suppressed_cycles s
        where s.user_id=item.user_id and s.expires_on=item.expires_on
      ) then
        continue;
      end if;
    end if;

    perform private.queue_notification(
      item.user_id,reminder_title,reminder_body,reminder_type,reminder_link,
      'subscription',null,
      'subscription:'||item.user_id::text||':'||item.expires_on::text||':'||reminder_type,
      reminder_type
    );
    update public.notification_email_outbox
      set payload = payload || jsonb_build_object(
        'expires_on',item.expires_on,
        'subscription_package',item.package_name
      )
      where idempotency_key='subscription:'||item.user_id::text||':'||item.expires_on::text||':'||reminder_type||':email';
    queued := queued + 1;
  end loop;
  return queued;
end;
$$;

revoke all on function private.enqueue_subscription_reminders()
  from public,anon,authenticated,service_role;
