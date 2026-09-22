-- Excel/OneDrive remains the sole source of truth. This private snapshot stores
-- only the parsed expiry date required for idempotent notification scheduling.
create table if not exists private.subscription_cycles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  expires_on date not null,
  source_synced_at timestamptz not null default now()
);

revoke all on private.subscription_cycles from public, anon, authenticated;

alter table public.notification_email_outbox
  add column if not exists provider_email_id text,
  add column if not exists claimed_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now();

alter table public.notification_email_outbox
  drop constraint if exists notification_email_outbox_status_check;
alter table public.notification_email_outbox
  add constraint notification_email_outbox_status_check
  check (status in ('pending','processing','sent','failed','disabled'));

create index if not exists notification_email_outbox_ready_idx
  on public.notification_email_outbox(next_attempt_at,created_at)
  where status in ('pending','failed');

create or replace function private.email_subject(
  template_key text,
  fallback_subject text,
  payload jsonb default '{}'::jsonb
) returns text language sql immutable set search_path = '' as $$
  select case template_key
    when 'booking_confirmed' then 'تم تأكيد حجز جلستك الخاصة | أكاديمية وصل'
    when 'coach_booking_confirmed' then 'حجز جلسة خاصة جديدة | أكاديمية وصل'
    when 'booking_cancelled' then 'تم إلغاء الجلسة الخاصة | أكاديمية وصل'
    when 'booking_rescheduled' then 'تمت إعادة جدولة الجلسة الخاصة | أكاديمية وصل'
    when 'zoom_ready' then 'رابط Zoom لجلستك أصبح جاهزًا | أكاديمية وصل'
    when 'review_request' then 'شاركينا تقييم جلستك الخاصة | أكاديمية وصل'
    when 'private_class_reminder' then
      case when coalesce(payload->>'body','') like '%24 ساعة%'
        then 'تذكير: جلستك الخاصة غدًا | أكاديمية وصل'
        else 'تذكير: بقيت ساعة على جلستك الخاصة | أكاديمية وصل' end
    when 'subscription_expiry_7d' then 'باقي 7 أيام على انتهاء اشتراكك | أكاديمية وصل'
    when 'subscription_expiry_3d' then 'باقي 3 أيام على انتهاء اشتراكك | أكاديمية وصل'
    when 'subscription_expiry_today' then 'اليوم آخر يوم في اشتراكك | أكاديمية وصل'
    when 'subscription_expired' then 'انتهى اشتراكك في أكاديمية وصل'
    else coalesce(nullif(fallback_subject,''),'إشعار جديد | أكاديمية وصل')
  end;
$$;
revoke all on function private.email_subject(text,text,jsonb) from public,anon,authenticated;

create or replace function private.queue_notification(
  target_user uuid, notification_title text, notification_body text,
  notification_type text, target_link text, related_kind text,
  related_uuid uuid, unique_key text, email_template text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare notification_uuid uuid; email_payload jsonb;
begin
  insert into public.notifications(user_id,title,body,type,link_url,related_type,related_id,idempotency_key)
  values(target_user,notification_title,notification_body,notification_type,target_link,related_kind,related_uuid,unique_key)
  on conflict (idempotency_key) where idempotency_key is not null do update
    set idempotency_key = excluded.idempotency_key
  returning id into notification_uuid;
  if email_template is not null then
    email_payload := jsonb_build_object('body',notification_body,'link',target_link,'related_id',related_uuid);
    insert into public.notification_email_outbox(user_id,notification_id,template_key,subject,payload,idempotency_key)
    values(target_user,notification_uuid,email_template,
      private.email_subject(email_template,notification_title,email_payload),
      email_payload,unique_key||':email')
    on conflict (idempotency_key) do nothing;
  end if;
  return notification_uuid;
end;
$$;
revoke all on function private.queue_notification(uuid,text,text,text,text,text,uuid,text,text) from public,anon,authenticated;

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
revoke all on function private.enqueue_subscription_reminders() from public,anon,authenticated;

create or replace function public.claim_notification_email_batch(p_gate text,p_limit integer default 25)
returns table(
  id uuid,email text,full_name text,subscription_package text,
  template_key text,subject text,payload jsonb,idempotency_key text,attempts integer
) language plpgsql security definer set search_path = '' as $$
declare expected text;
begin
  select decrypted_secret into expected from vault.decrypted_secrets where name='wasel_sync_gate';
  if expected is null or p_gate is null or p_gate<>expected then raise exception 'unauthorized'; end if;
  return query
  with claimed as (
    select o.id from public.notification_email_outbox o
    where o.status in ('pending','failed') and o.attempts<5 and o.next_attempt_at<=now()
    order by o.created_at for update skip locked limit least(greatest(p_limit,1),50)
  ), updated as (
    update public.notification_email_outbox o set status='processing',claimed_at=now(),attempts=o.attempts+1
    from claimed where o.id=claimed.id
    returning o.*
  )
  select u.id,coalesce(nullif(p.email,''),a.email),p.full_name,p.subscription_package::text,
    u.template_key,private.email_subject(u.template_key,u.subject,u.payload),u.payload,u.idempotency_key,u.attempts
  from updated u join public.profiles p on p.id=u.user_id join auth.users a on a.id=u.user_id
  where coalesce(nullif(p.email,''),a.email) is not null;
end;
$$;
revoke all on function public.claim_notification_email_batch(text,integer) from public,anon,authenticated;
grant execute on function public.claim_notification_email_batch(text,integer) to service_role;

create or replace function public.complete_notification_email(
  p_gate text,p_id uuid,p_sent boolean,p_provider_id text default null,p_error text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare expected text; current_attempts integer;
begin
  select decrypted_secret into expected from vault.decrypted_secrets where name='wasel_sync_gate';
  if expected is null or p_gate is null or p_gate<>expected then raise exception 'unauthorized'; end if;
  select attempts into current_attempts from public.notification_email_outbox where id=p_id for update;
  if current_attempts is null then raise exception 'email_not_found'; end if;
  if p_sent then
    update public.notification_email_outbox set status='sent',provider_email_id=p_provider_id,sent_at=now(),last_error=null where id=p_id;
  else
    update public.notification_email_outbox set
      status=case when attempts>=5 then 'failed' else 'pending' end,
      last_error=left(coalesce(p_error,'delivery_failed'),500),
      next_attempt_at=now()+make_interval(mins=>least(60,power(2,greatest(attempts-1,0))::integer))
    where id=p_id;
  end if;
end;
$$;
revoke all on function public.complete_notification_email(text,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.complete_notification_email(text,uuid,boolean,text,text) to service_role;

-- Preserve every existing activation/package rule exactly; only mirror the parsed
-- Excel expiry into the private snapshot after a profile is matched.
create or replace function wasel_sync.apply_profiles(p_run bigint,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; n integer; m integer:=0; a integer:=0; d integer:=0; u integer:=0; pc integer:=0; bd integer:=0; db integer:=0; ex jsonb:='[]'; target boolean; old_value boolean; pid uuid; old_pkg public.subscription_package; new_pkg public.subscription_package;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>10000 then raise exception 'unsafe_rows'; end if;
 if exists(select 1 from jsonb_to_recordset(p_rows) as x(email text) where email is null or email<>lower(btrim(email))) then raise exception 'invalid_rows'; end if;
 if exists(select 1 from jsonb_to_recordset(p_rows) as x(email text) group by email having count(*)>1) then raise exception 'duplicate_rows'; end if;
 for r in select * from jsonb_to_recordset(p_rows) as x(email text,expiry date,package text,row_no integer) order by email loop
  perform id from public.profiles where lower(btrim(email))=r.email for update; select count(*) into n from public.profiles where lower(btrim(email))=r.email;
  if n=0 then u:=u+1; ex:=ex||jsonb_build_array(jsonb_build_object('row',r.row_no,'email',r.email,'reason','no_matching_profile')); continue; end if;
  if n<>1 then ex:=ex||jsonb_build_array(jsonb_build_object('row',r.row_no,'email',r.email,'reason','duplicate_profile_email')); continue; end if;
  m:=m+1; select id,is_active,subscription_package into pid,old_value,old_pkg from public.profiles where lower(btrim(email))=r.email; target:=r.expiry >= (statement_timestamp() at time zone 'Asia/Riyadh')::date; new_pkg:=r.package::public.subscription_package;
  if old_value is distinct from target then update public.profiles set is_active=target where id=pid and lower(btrim(email))=r.email and is_active is not distinct from old_value; get diagnostics n=row_count; if n<>1 then raise exception 'concurrent_profile_change'; end if; insert into wasel_sync.changes(run_id,profile_id,email,old_active,new_active,expiry,old_package,new_package) values(p_run,pid,r.email,old_value,target,r.expiry,old_pkg,new_pkg); if target then a:=a+1; else d:=d+1; end if;
  elsif old_pkg is distinct from new_pkg then update public.profiles set subscription_package=new_pkg where id=pid and lower(btrim(email))=r.email and subscription_package is not distinct from old_pkg; get diagnostics n=row_count; if n<>1 then raise exception 'concurrent_profile_change'; end if; insert into wasel_sync.changes(run_id,profile_id,email,old_active,new_active,expiry,old_package,new_package) values(p_run,pid,r.email,old_value,old_value,r.expiry,old_pkg,new_pkg);
  end if;
  if old_pkg is distinct from new_pkg then pc:=pc+1; if old_pkg='bronze' and new_pkg='diamond' then bd:=bd+1; elsif old_pkg='diamond' and new_pkg='bronze' then db:=db+1; end if; end if;
  insert into private.subscription_cycles(user_id,expires_on,source_synced_at)
    values(pid,r.expiry,now()) on conflict(user_id) do update
    set expires_on=excluded.expires_on,source_synced_at=excluded.source_synced_at;
 end loop;
 return jsonb_build_object('matched',m,'activated',a,'deactivated',d,'unmatched',u,'package_changes',pc,'bronze_to_diamond',bd,'diamond_to_bronze',db,'exceptions',ex);
end;
$$;

do $$ begin
  perform cron.schedule(
    'subscription-email-reminders','10 * * * *',
    'select private.enqueue_subscription_reminders();'
  );
exception when unique_violation then null;
end $$;

