-- Extend the existing subscription reminder pipeline to the verified Excel
-- source rows without creating Auth users or changing profile matching rules.

create table if not exists private.excel_subscription_recipients (
  normalized_email text primary key,
  subscription_package public.subscription_package not null,
  expires_on date not null,
  source_row_no integer not null check (source_row_no > 0),
  source_run_id bigint not null references wasel_sync.runs(id) on delete restrict,
  source_etag text,
  matched_user_id uuid references auth.users(id) on delete restrict,
  cycle_first_seen_at timestamptz not null default now(),
  allow_expired_reminder boolean not null,
  source_synced_at timestamptz not null default now(),
  check (normalized_email = lower(btrim(normalized_email)))
);

create index if not exists excel_subscription_recipients_run_idx
  on private.excel_subscription_recipients(source_run_id);

revoke all on private.excel_subscription_recipients
  from public, anon, authenticated, service_role;

create table if not exists private.subscription_email_delivery_ledger (
  normalized_email text not null,
  expires_on date not null,
  reminder_type text not null check (reminder_type in (
    'subscription_expiry_7d','subscription_expiry_3d',
    'subscription_expiry_today','subscription_expired'
  )),
  delivery_status text not null check (delivery_status in ('queued','sent','suppressed')),
  outbox_id uuid references public.notification_email_outbox(id) on delete restrict,
  provider_email_id text,
  migrated_from_history boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (normalized_email,expires_on,reminder_type),
  check (normalized_email = lower(btrim(normalized_email)))
);

revoke all on private.subscription_email_delivery_ledger
  from public, anon, authenticated, service_role;

create table if not exists private.subscription_email_history_review (
  outbox_id uuid primary key references public.notification_email_outbox(id) on delete restrict,
  normalized_email text,
  reason text not null,
  created_at timestamptz not null default now()
);

revoke all on private.subscription_email_history_review
  from public, anon, authenticated, service_role;

alter table public.notification_email_outbox
  add column if not exists recipient_email text;

alter table public.notification_email_outbox
  alter column user_id drop not null;

alter table public.notification_email_outbox
  drop constraint if exists notification_email_outbox_recipient_check;
alter table public.notification_email_outbox
  add constraint notification_email_outbox_recipient_check
  check (user_id is not null or nullif(btrim(recipient_email),'') is not null);

-- Resolve every historical subscription email into the new identity tuple
-- before the scheduler is allowed to create direct-to-email reminders.
insert into private.subscription_email_history_review(outbox_id,normalized_email,reason)
select o.id,
       nullif(lower(btrim(coalesce(nullif(p.email,''),a.email))),''),
       case
         when nullif(lower(btrim(coalesce(nullif(p.email,''),a.email))),'') is null then 'missing_historical_email'
         else 'missing_or_invalid_historical_expiry'
       end
from public.notification_email_outbox o
left join public.profiles p on p.id=o.user_id
left join auth.users a on a.id=o.user_id
where o.template_key in (
  'subscription_expiry_7d','subscription_expiry_3d',
  'subscription_expiry_today','subscription_expired'
)
and (
  nullif(lower(btrim(coalesce(nullif(p.email,''),a.email))),'') is null
  or coalesce(o.payload->>'expires_on','') !~ '^\d{4}-\d{2}-\d{2}$'
)
on conflict (outbox_id) do nothing;

insert into private.subscription_email_delivery_ledger(
  normalized_email,expires_on,reminder_type,delivery_status,
  outbox_id,provider_email_id,migrated_from_history,created_at
)
select lower(btrim(coalesce(nullif(p.email,''),a.email))),
       (o.payload->>'expires_on')::date,
       o.template_key,
       case when o.status='sent' then 'sent' else 'queued' end,
       o.id,o.provider_email_id,true,o.created_at
from public.notification_email_outbox o
left join public.profiles p on p.id=o.user_id
left join auth.users a on a.id=o.user_id
where o.template_key in (
  'subscription_expiry_7d','subscription_expiry_3d',
  'subscription_expiry_today','subscription_expired'
)
and nullif(lower(btrim(coalesce(nullif(p.email,''),a.email))),'') is not null
and coalesce(o.payload->>'expires_on','') ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (normalized_email,expires_on,reminder_type) do nothing;

-- Preserve the proven activation/package logic. The only addition is a
-- private current-source snapshot containing every valid Excel row, including
-- rows that do not have a matching academy account.
create or replace function wasel_sync.apply_profiles(p_run bigint,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; n integer; m integer:=0; a integer:=0; d integer:=0; u integer:=0; pc integer:=0; bd integer:=0; db integer:=0; ex jsonb:='[]'; target boolean; old_value boolean; pid uuid; old_pkg public.subscription_package; new_pkg public.subscription_package;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>10000 then raise exception 'unsafe_rows'; end if;
 if exists(select 1 from jsonb_to_recordset(p_rows) as x(email text) where email is null or email<>lower(btrim(email))) then raise exception 'invalid_rows'; end if;
 if exists(select 1 from jsonb_to_recordset(p_rows) as x(email text) group by email having count(*)>1) then raise exception 'duplicate_rows'; end if;

 insert into private.excel_subscription_recipients(
   normalized_email,subscription_package,expires_on,source_row_no,
   source_run_id,source_etag,matched_user_id,cycle_first_seen_at,
   allow_expired_reminder,source_synced_at
 )
 select x.email,x.package::public.subscription_package,x.expiry,x.row_no,
        p_run,null,null,now(),
        x.expiry >= (statement_timestamp() at time zone 'Asia/Riyadh')::date,now()
 from jsonb_to_recordset(p_rows) as x(email text,expiry date,package text,row_no integer)
 on conflict(normalized_email) do update set
   subscription_package=excluded.subscription_package,
   expires_on=excluded.expires_on,
   source_row_no=excluded.source_row_no,
   source_run_id=excluded.source_run_id,
   source_etag=null,
   matched_user_id=null,
   cycle_first_seen_at=case
     when private.excel_subscription_recipients.expires_on is distinct from excluded.expires_on
       then now()
     else private.excel_subscription_recipients.cycle_first_seen_at
   end,
   allow_expired_reminder=case
     when private.excel_subscription_recipients.expires_on is distinct from excluded.expires_on
       then excluded.expires_on >= (statement_timestamp() at time zone 'Asia/Riyadh')::date
     else private.excel_subscription_recipients.allow_expired_reminder
   end,
   source_synced_at=now();

 for r in select * from jsonb_to_recordset(p_rows) as x(email text,expiry date,package text,row_no integer) order by email loop
  perform id from public.profiles where lower(btrim(email))=r.email for update; select count(*) into n from public.profiles where lower(btrim(email))=r.email;
  if n=0 then u:=u+1; ex:=ex||jsonb_build_array(jsonb_build_object('row',r.row_no,'email',r.email,'reason','no_matching_profile')); continue; end if;
  if n<>1 then ex:=ex||jsonb_build_array(jsonb_build_object('row',r.row_no,'email',r.email,'reason','duplicate_profile_email')); continue; end if;
  m:=m+1; select id,is_active,subscription_package into pid,old_value,old_pkg from public.profiles where lower(btrim(email))=r.email; target:=r.expiry >= (statement_timestamp() at time zone 'Asia/Riyadh')::date; new_pkg:=r.package::public.subscription_package;
  update private.excel_subscription_recipients set matched_user_id=pid where normalized_email=r.email and source_run_id=p_run;
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

alter function wasel_sync.apply_profiles(bigint,jsonb) owner to postgres;
revoke all on function wasel_sync.apply_profiles(bigint,jsonb)
  from public,anon,authenticated,service_role,wasel_subscription_writer;

create or replace function wasel_sync.finish_excel_recipient_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status='success' and old.status is distinct from 'success' then
    update private.excel_subscription_recipients
      set source_etag=new.source_etag
      where source_run_id=new.id and source_etag is null;
  end if;
  return new;
end;
$$;

revoke all on function wasel_sync.finish_excel_recipient_snapshot()
  from public,anon,authenticated,service_role;

drop trigger if exists finish_excel_recipient_snapshot on wasel_sync.runs;
create trigger finish_excel_recipient_snapshot
after update of status,source_etag on wasel_sync.runs
for each row execute function wasel_sync.finish_excel_recipient_snapshot();

create or replace function private.enqueue_subscription_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare item record; today_riyadh date := (now() at time zone 'Asia/Riyadh')::date;
  v_reminder_type text; reminder_title text; reminder_body text; reminder_link text;
  notification_uuid uuid; outbox_uuid uuid; acquired integer; queued integer := 0;
begin
  for item in
    select s.normalized_email,s.expires_on,s.subscription_package::text package_name,
           s.matched_user_id
    from private.excel_subscription_recipients s
    where s.source_etag is not null
      and s.source_run_id=(select max(id) from wasel_sync.runs where status='success')
      and not exists (
        select 1 from private.subscription_email_history_review h
        where h.normalized_email=s.normalized_email
      )
      and (
        s.expires_on-today_riyadh in (7,3,0)
        or (s.expires_on<today_riyadh and s.allow_expired_reminder)
      )
  loop
    if item.expires_on-today_riyadh=7 then
      v_reminder_type:='subscription_expiry_7d'; reminder_title:='باقي 7 أيام على اشتراكك';
      reminder_body:='باقي 7 أيام على انتهاء اشتراكك. جدّدي مبكرًا لاستمرار وصولك بدون انقطاع.'; reminder_link:='/profile';
    elsif item.expires_on-today_riyadh=3 then
      v_reminder_type:='subscription_expiry_3d'; reminder_title:='باقي 3 أيام على اشتراكك';
      reminder_body:='باقي 3 أيام على انتهاء اشتراكك. تقدرين تجدّدين الآن لاستمرار الوصول.'; reminder_link:='/profile';
    elsif item.expires_on=today_riyadh then
      v_reminder_type:='subscription_expiry_today'; reminder_title:='اليوم آخر يوم في اشتراكك';
      reminder_body:='اليوم هو آخر يوم في اشتراكك الحالي. جدّدي قبل انتهائه لاستمرار حسابك.'; reminder_link:='/profile';
    else
      v_reminder_type:='subscription_expired'; reminder_title:='انتهى اشتراكك';
      reminder_body:='انتهى اشتراكك الحالي. يمكنك تجديده لإعادة تفعيل الوصول.'; reminder_link:='/account-disabled';
    end if;

    insert into private.subscription_email_delivery_ledger(
      normalized_email,expires_on,reminder_type,delivery_status
    ) values(item.normalized_email,item.expires_on,v_reminder_type,'queued')
    on conflict(normalized_email,expires_on,reminder_type) do nothing;
    get diagnostics acquired=row_count;
    if acquired<>1 then continue; end if;

    notification_uuid:=null;
    if item.matched_user_id is not null then
      insert into public.notifications(user_id,title,body,type,link_url,related_type,idempotency_key)
      values(item.matched_user_id,reminder_title,reminder_body,v_reminder_type,
             reminder_link,'subscription',
             'subscription:'||item.matched_user_id::text||':'||item.expires_on::text||':'||v_reminder_type)
      on conflict(idempotency_key) where idempotency_key is not null do update
        set idempotency_key=excluded.idempotency_key
      returning id into notification_uuid;
    end if;

    insert into public.notification_email_outbox(
      user_id,notification_id,recipient_email,template_key,subject,payload,idempotency_key
    ) values(
      item.matched_user_id,notification_uuid,item.normalized_email,v_reminder_type,
      private.email_subject(v_reminder_type,reminder_title,
        jsonb_build_object('body',reminder_body,'link',reminder_link)),
      jsonb_build_object('body',reminder_body,'link',reminder_link,
        'expires_on',item.expires_on,'subscription_package',item.package_name),
      'subscription-excel:'||encode(extensions.digest(item.normalized_email,'sha256'),'hex')||
        ':'||item.expires_on::text||':'||v_reminder_type
    ) returning id into outbox_uuid;

    update private.subscription_email_delivery_ledger
      set outbox_id=outbox_uuid
      where normalized_email=item.normalized_email
        and expires_on=item.expires_on and reminder_type=v_reminder_type;
    queued:=queued+1;
  end loop;
  return queued;
end;
$$;

revoke all on function private.enqueue_subscription_reminders()
  from public,anon,authenticated,service_role;

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
  with candidates as (
    select o.id
    from public.notification_email_outbox o
    left join public.profiles p on p.id=o.user_id
    left join auth.users a on a.id=o.user_id
    where o.status in ('pending','failed') and o.attempts<5 and o.next_attempt_at<=now()
      and nullif(lower(btrim(coalesce(o.recipient_email,nullif(p.email,''),a.email))),'') is not null
    order by o.created_at for update of o skip locked
    limit least(greatest(p_limit,1),50)
  ), updated as (
    update public.notification_email_outbox o
      set status='processing',claimed_at=now(),attempts=o.attempts+1
    from candidates where o.id=candidates.id returning o.*
  )
  select u.id,
    lower(btrim(coalesce(u.recipient_email,nullif(p.email,''),a.email))),
    p.full_name,
    coalesce(nullif(u.payload->>'subscription_package',''),p.subscription_package::text),
    u.template_key,private.email_subject(u.template_key,u.subject,u.payload),
    u.payload,u.idempotency_key,u.attempts
  from updated u
  left join public.profiles p on p.id=u.user_id
  left join auth.users a on a.id=u.user_id;
end;
$$;

revoke all on function public.claim_notification_email_batch(text,integer)
  from public,anon,authenticated;
grant execute on function public.claim_notification_email_batch(text,integer) to service_role;

create or replace function public.complete_notification_email(
  p_gate text,p_id uuid,p_sent boolean,p_provider_id text default null,p_error text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare expected text; current_attempts integer; current_template text;
begin
  select decrypted_secret into expected from vault.decrypted_secrets where name='wasel_sync_gate';
  if expected is null or p_gate is null or p_gate<>expected then raise exception 'unauthorized'; end if;
  select attempts,template_key into current_attempts,current_template
    from public.notification_email_outbox where id=p_id for update;
  if current_attempts is null then raise exception 'email_not_found'; end if;
  if p_sent then
    update public.notification_email_outbox
      set status='sent',provider_email_id=p_provider_id,sent_at=now(),last_error=null
      where id=p_id;
    if current_template like 'subscription_%' then
      update private.subscription_email_delivery_ledger
        set delivery_status='sent',provider_email_id=p_provider_id
        where outbox_id=p_id;
    end if;
  else
    update public.notification_email_outbox set
      status=case when attempts>=5 then 'failed' else 'pending' end,
      last_error=left(coalesce(p_error,'delivery_failed'),500),
      next_attempt_at=now()+make_interval(mins=>least(60,power(2,greatest(attempts-1,0))::integer))
    where id=p_id;
  end if;
end;
$$;

revoke all on function public.complete_notification_email(text,uuid,boolean,text,text)
  from public,anon,authenticated;
grant execute on function public.complete_notification_email(text,uuid,boolean,text,text) to service_role;
