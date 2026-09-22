-- Private Classes: append-only booking history, strict ownership, Riyadh calendar rules.
-- This migration intentionally does not touch the Excel/OneDrive sync schemas or jobs.

create schema if not exists private;

create table if not exists public.private_class_coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  bio text,
  image_url text,
  is_active boolean not null default true,
  is_bookable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_class_availability (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.private_class_coaches(id) on delete restrict,
  blocked_date date not null,
  start_time time not null,
  is_blocked boolean not null default true,
  reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_class_availability_time_check check (
    start_time = time '00:00' or start_time in (
      time '18:00', time '19:00', time '20:00',
      time '21:00', time '22:00', time '23:00'
    )
  ),
  unique (coach_id, blocked_date, start_time)
);

create table if not exists public.private_class_bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete restrict,
  coach_id uuid not null references public.private_class_coaches(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  telegram_username text not null check (telegram_username ~ '^@?[A-Za-z0-9_]{5,32}$'),
  status text not null default 'scheduled' check (status in ('scheduled','completed','no_show','cancelled')),
  zoom_url text,
  zoom_updated_at timestamptz,
  attendance_recorded_at timestamptz,
  attendance_recorded_by uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete restrict,
  cancellation_reason text,
  reschedule_count integer not null default 0 check (reschedule_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_class_duration_check check (ends_at = starts_at + interval '1 hour')
);

create unique index if not exists private_class_one_active_coach_slot_idx
  on public.private_class_bookings (coach_id, starts_at)
  where status <> 'cancelled';
create index if not exists private_class_bookings_student_month_idx
  on public.private_class_bookings (student_id, starts_at, status);
create index if not exists private_class_bookings_coach_time_idx
  on public.private_class_bookings (coach_id, starts_at desc);

create table if not exists public.private_class_booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.private_class_bookings(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  event_type text not null,
  old_starts_at timestamptz,
  new_starts_at timestamptz,
  old_status text,
  new_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists private_class_booking_events_booking_idx
  on public.private_class_booking_events (booking_id, created_at);

create table if not exists public.private_class_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.private_class_bookings(id) on delete restrict,
  coach_id uuid not null references public.private_class_coaches(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  stars smallint not null check (stars between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 3 and 1500),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','hidden')),
  excluded_from_average boolean not null default false,
  exclusion_reason text,
  moderated_by uuid references auth.users(id) on delete restrict,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_class_review_exclusion_reason_check check (
    excluded_from_average = false or char_length(trim(coalesce(exclusion_reason,''))) >= 3
  )
);
create index if not exists private_class_reviews_coach_status_idx
  on public.private_class_reviews (coach_id, moderation_status, created_at desc);

alter table public.notifications add column if not exists related_type text;
alter table public.notifications add column if not exists related_id uuid;
alter table public.notifications add column if not exists idempotency_key text;
create unique index if not exists notifications_idempotency_key_idx
  on public.notifications (idempotency_key) where idempotency_key is not null;

create table if not exists public.notification_email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  notification_id uuid references public.notifications(id) on delete restrict,
  template_key text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','sent','failed','disabled')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notification_email_outbox_pending_idx
  on public.notification_email_outbox (created_at) where status = 'pending';

alter table public.private_class_coaches enable row level security;
alter table public.private_class_availability enable row level security;
alter table public.private_class_bookings enable row level security;
alter table public.private_class_booking_events enable row level security;
alter table public.private_class_reviews enable row level security;
alter table public.notification_email_outbox enable row level security;

create or replace function private.current_user_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text = 'admin' and is_active = true
  );
$$;

create or replace function private.current_coach_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.private_class_coaches
  where user_id = (select auth.uid()) and is_active = true
  limit 1;
$$;

revoke all on function private.current_user_is_admin() from public, anon, authenticated;
revoke all on function private.current_coach_id() from public, anon, authenticated;

create policy "Authenticated read bookable coaches"
on public.private_class_coaches for select to authenticated
using (is_active = true or user_id = (select auth.uid()) or (select private.current_user_is_admin()));

create policy "Coach reads own availability"
on public.private_class_availability for select to authenticated
using (coach_id = (select private.current_coach_id()) or (select private.current_user_is_admin()));

create policy "Students and coaches read related bookings"
on public.private_class_bookings for select to authenticated
using (
  student_id = (select auth.uid())
  or coach_id = (select private.current_coach_id())
  or (select private.current_user_is_admin())
);

create policy "Related users read booking history"
on public.private_class_booking_events for select to authenticated
using (exists (
  select 1 from public.private_class_bookings b
  where b.id = booking_id and (
    b.student_id = (select auth.uid())
    or b.coach_id = (select private.current_coach_id())
    or (select private.current_user_is_admin())
  )
));

create policy "Authenticated read approved reviews"
on public.private_class_reviews for select to authenticated
using (
  moderation_status = 'approved'
  or student_id = (select auth.uid())
  or coach_id = (select private.current_coach_id())
  or (select private.current_user_is_admin())
);

create policy "Admin reads email outbox"
on public.notification_email_outbox for select to authenticated
using ((select private.current_user_is_admin()));

revoke all on public.private_class_coaches, public.private_class_availability,
  public.private_class_bookings, public.private_class_booking_events,
  public.private_class_reviews, public.notification_email_outbox from anon, authenticated;
grant select on public.private_class_coaches, public.private_class_availability,
  public.private_class_booking_events, public.private_class_reviews to authenticated;
grant select (
  id, student_id, coach_id, starts_at, ends_at, telegram_username, status,
  zoom_updated_at, attendance_recorded_at, attendance_recorded_by,
  cancelled_at, cancelled_by, cancellation_reason, reschedule_count,
  created_at, updated_at
) on public.private_class_bookings to authenticated;
grant select on public.notification_email_outbox to authenticated;

create or replace function private.valid_private_class_start(candidate timestamptz)
returns boolean language sql immutable set search_path = '' as $$
  select
    extract(dow from candidate at time zone 'Asia/Riyadh') between 0 and 4
    and extract(hour from candidate at time zone 'Asia/Riyadh') between 18 and 23
    and extract(minute from candidate at time zone 'Asia/Riyadh') = 0
    and extract(second from candidate at time zone 'Asia/Riyadh') = 0;
$$;

create or replace function private.assert_available_slot(target_coach uuid, candidate timestamptz)
returns void language plpgsql stable security definer set search_path = '' as $$
declare local_date date; local_time time;
begin
  if not private.valid_private_class_start(candidate) then
    raise exception 'الموعد يجب أن يكون من الأحد إلى الخميس، من 6 إلى 11 مساءً بتوقيت الرياض';
  end if;
  if candidate <= now() then raise exception 'اختاري موعدًا قادمًا'; end if;
  local_date := (candidate at time zone 'Asia/Riyadh')::date;
  local_time := (candidate at time zone 'Asia/Riyadh')::time;
  if exists (
    select 1 from public.private_class_availability a
    where a.coach_id = target_coach and a.blocked_date = local_date and a.is_blocked = true
      and (a.start_time = time '00:00' or a.start_time = local_time)
  ) then raise exception 'هذا الموعد غير متاح'; end if;
end;
$$;
revoke all on function private.valid_private_class_start(timestamptz) from public, anon, authenticated;
revoke all on function private.assert_available_slot(uuid,timestamptz) from public, anon, authenticated;

create or replace function private.queue_notification(
  target_user uuid, notification_title text, notification_body text,
  notification_type text, target_link text, related_kind text,
  related_uuid uuid, unique_key text, email_template text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare notification_uuid uuid;
begin
  insert into public.notifications(user_id,title,body,type,link_url,related_type,related_id,idempotency_key)
  values(target_user,notification_title,notification_body,notification_type,target_link,related_kind,related_uuid,unique_key)
  on conflict (idempotency_key) where idempotency_key is not null do update
    set idempotency_key = excluded.idempotency_key
  returning id into notification_uuid;
  if email_template is not null then
    insert into public.notification_email_outbox(user_id,notification_id,template_key,subject,payload,idempotency_key)
    values(target_user,notification_uuid,email_template,notification_title,
      jsonb_build_object('body',notification_body,'link',target_link,'related_id',related_uuid),unique_key||':email')
    on conflict (idempotency_key) do nothing;
  end if;
  return notification_uuid;
end;
$$;
revoke all on function private.queue_notification(uuid,text,text,text,text,text,uuid,text,text) from public, anon, authenticated;

create or replace function private.book_private_class(target_coach uuid, candidate timestamptz, telegram text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); booking_uuid uuid; month_start date; used_count integer; coach_user uuid;
begin
  if caller is null then raise exception 'يجب تسجيل الدخول'; end if;
  if telegram is null or telegram !~ '^@?[A-Za-z0-9_]{5,32}$' then raise exception 'اسم مستخدم تيليجرام غير صحيح'; end if;
  if not exists (select 1 from public.profiles where id=caller and is_active=true and subscription_package::text='diamond') then
    raise exception 'الكلاسات الخاصة حصرية للألماسي';
  end if;
  if not exists (select 1 from public.private_class_coaches where id=target_coach and is_active=true and is_bookable=true) then
    raise exception 'الكوتش غير متاحة للحجز';
  end if;
  perform private.assert_available_slot(target_coach,candidate);
  month_start := date_trunc('month', candidate at time zone 'Asia/Riyadh')::date;
  perform pg_advisory_xact_lock(hashtextextended('private-class-quota:'||caller::text||':'||month_start::text,0));
  perform pg_advisory_xact_lock(hashtextextended('private-class-slot:'||target_coach::text||':'||candidate::text,0));
  select count(*) into used_count from public.private_class_bookings
  where student_id=caller and status <> 'cancelled'
    and (starts_at at time zone 'Asia/Riyadh')::date >= month_start
    and (starts_at at time zone 'Asia/Riyadh')::date < (month_start + interval '1 month')::date;
  if used_count >= 4 then raise exception 'استخدمتِ الجلسات الأربع لهذا الشهر'; end if;
  insert into public.private_class_bookings(student_id,coach_id,starts_at,ends_at,telegram_username)
  values(caller,target_coach,candidate,candidate+interval '1 hour',regexp_replace(telegram,'^@',''))
  returning id into booking_uuid;
  insert into public.private_class_booking_events(booking_id,actor_id,event_type,new_starts_at,new_status)
  values(booking_uuid,caller,'booked',candidate,'scheduled');
  perform private.queue_notification(caller,'تم تأكيد جلستك الخاصة','تم حجز موعدك بنجاح.','private_class_booking','/private-classes','booking',booking_uuid,'booking:'||booking_uuid||':confirmed','booking_confirmed');
  select user_id into coach_user from public.private_class_coaches where id=target_coach;
  perform private.queue_notification(coach_user,'حجز جديد','تم حجز جلسة خاصة جديدة معك.','private_class_booking','/coach/private-classes','booking',booking_uuid,'booking:'||booking_uuid||':coach-confirmed','coach_booking_confirmed');
  return booking_uuid;
exception when unique_violation then
  raise exception 'سبق حجز هذا الموعد، اختاري موعدًا آخر';
end;
$$;

create or replace function public.book_private_class(target_coach uuid, candidate timestamptz, telegram text)
returns uuid language sql volatile security invoker set search_path = '' as $$
  select private.book_private_class(target_coach,candidate,telegram);
$$;

create or replace function private.cancel_private_class(target_booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); row_data public.private_class_bookings%rowtype; coach_user uuid;
begin
  select * into row_data from public.private_class_bookings where id=target_booking for update;
  if row_data.id is null or row_data.student_id<>caller then raise exception 'الحجز غير موجود'; end if;
  if row_data.status<>'scheduled' then raise exception 'لا يمكن إلغاء هذا الحجز'; end if;
  if row_data.starts_at < now()+interval '12 hours' then raise exception 'الإلغاء متاح قبل الموعد بـ12 ساعة أو أكثر'; end if;
  update public.private_class_bookings set status='cancelled',cancelled_at=now(),cancelled_by=caller,updated_at=now() where id=target_booking;
  insert into public.private_class_booking_events(booking_id,actor_id,event_type,old_starts_at,old_status,new_status)
  values(target_booking,caller,'student_cancelled',row_data.starts_at,row_data.status,'cancelled');
  select user_id into coach_user from public.private_class_coaches where id=row_data.coach_id;
  perform private.queue_notification(coach_user,'تم إلغاء جلسة','ألغت العميلة جلستها ضمن المهلة المسموحة.','private_class_cancelled','/coach/private-classes','booking',target_booking,'booking:'||target_booking||':cancelled','booking_cancelled');
end;
$$;

create or replace function public.cancel_private_class(target_booking uuid)
returns void language sql volatile security invoker set search_path = '' as $$ select private.cancel_private_class(target_booking); $$;

create or replace function private.reschedule_private_class(target_booking uuid, candidate timestamptz, as_coach boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); row_data public.private_class_bookings%rowtype; coach_user uuid;
begin
  select * into row_data from public.private_class_bookings where id=target_booking for update;
  select user_id into coach_user from public.private_class_coaches where id=row_data.coach_id;
  if row_data.id is null or row_data.status<>'scheduled' then raise exception 'الحجز غير متاح لإعادة الجدولة'; end if;
  if as_coach and caller<>coach_user then raise exception 'غير مصرح'; end if;
  if not as_coach and caller<>row_data.student_id then raise exception 'غير مصرح'; end if;
  if row_data.starts_at < now()+interval '12 hours' then raise exception 'إعادة الجدولة متاحة قبل الموعد بـ12 ساعة أو أكثر'; end if;
  perform private.assert_available_slot(row_data.coach_id,candidate);
  perform pg_advisory_xact_lock(hashtextextended('private-class-slot:'||row_data.coach_id::text||':'||candidate::text,0));
  update public.private_class_bookings set starts_at=candidate,ends_at=candidate+interval '1 hour',reschedule_count=reschedule_count+1,updated_at=now() where id=target_booking;
  insert into public.private_class_booking_events(booking_id,actor_id,event_type,old_starts_at,new_starts_at,old_status,new_status)
  values(target_booking,caller,case when as_coach then 'coach_rescheduled' else 'student_rescheduled' end,row_data.starts_at,candidate,row_data.status,row_data.status);
  perform private.queue_notification(case when as_coach then row_data.student_id else coach_user end,
    'تم تغيير موعد الجلسة','تم اعتماد الموعد البديل المتفق عليه.','private_class_rescheduled',
    case when as_coach then '/private-classes' else '/coach/private-classes' end,
    'booking',target_booking,'booking:'||target_booking||':rescheduled:'||candidate::text,'booking_rescheduled');
exception when unique_violation then raise exception 'الموعد البديل محجوز';
end;
$$;

create or replace function public.reschedule_private_class(target_booking uuid, candidate timestamptz, as_coach boolean default false)
returns void language sql volatile security invoker set search_path = '' as $$ select private.reschedule_private_class(target_booking,candidate,as_coach); $$;

create or replace function private.set_private_class_zoom(target_booking uuid, target_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); row_data public.private_class_bookings%rowtype;
begin
  select * into row_data from public.private_class_bookings where id=target_booking for update;
  if row_data.id is null or row_data.coach_id<>(select private.current_coach_id()) then raise exception 'غير مصرح'; end if;
  if target_url !~ '^https://([A-Za-z0-9-]+\.)*zoom\.us/' then raise exception 'أدخلي رابط Zoom صحيح'; end if;
  update public.private_class_bookings set zoom_url=target_url,zoom_updated_at=now(),updated_at=now() where id=target_booking;
  insert into public.private_class_booking_events(booking_id,actor_id,event_type,details)
  values(target_booking,caller,'zoom_ready',jsonb_build_object('ready',true));
  perform private.queue_notification(row_data.student_id,'رابط الجلسة جاهز','تمت إضافة رابط Zoom، وسيظهر زر الدخول قبل الموعد بـ15 دقيقة.','private_class_zoom','/private-classes','booking',target_booking,'booking:'||target_booking||':zoom:'||extract(epoch from now())::bigint,'zoom_ready');
end;
$$;

create or replace function public.set_private_class_zoom(target_booking uuid, target_url text)
returns void language sql volatile security invoker set search_path = '' as $$ select private.set_private_class_zoom(target_booking,target_url); $$;

create or replace function private.private_class_join_url(target_booking uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); row_data public.private_class_bookings%rowtype;
begin
  select * into row_data from public.private_class_bookings where id=target_booking;
  if row_data.id is null or row_data.student_id<>caller or row_data.status<>'scheduled' then return null; end if;
  if now() < row_data.starts_at-interval '15 minutes' or now() > row_data.ends_at+interval '15 minutes' then return null; end if;
  return row_data.zoom_url;
end;
$$;
create or replace function public.private_class_join_url(target_booking uuid)
returns text language sql stable security invoker set search_path = '' as $$ select private.private_class_join_url(target_booking); $$;

create or replace function private.record_private_class_attendance(target_booking uuid, attended boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); row_data public.private_class_bookings%rowtype; next_status text;
begin
  select * into row_data from public.private_class_bookings where id=target_booking for update;
  if row_data.id is null or row_data.coach_id<>(select private.current_coach_id()) then raise exception 'غير مصرح'; end if;
  if row_data.status<>'scheduled' or row_data.attendance_recorded_at is not null then raise exception 'تم تسجيل الحضور مسبقًا'; end if;
  if now() < row_data.ends_at then raise exception 'يتفعل تسجيل الحضور بعد نهاية الجلسة'; end if;
  next_status := case when attended then 'completed' else 'no_show' end;
  update public.private_class_bookings set status=next_status,attendance_recorded_at=now(),attendance_recorded_by=caller,updated_at=now() where id=target_booking;
  insert into public.private_class_booking_events(booking_id,actor_id,event_type,old_status,new_status)
  values(target_booking,caller,case when attended then 'attended' else 'no_show' end,row_data.status,next_status);
  if attended then
    perform private.queue_notification(row_data.student_id,'قيّمي جلستك الخاصة','اكتملت جلستك، شاركينا تقييمك للكوتش.','private_class_review_request','/private-classes','booking',target_booking,'booking:'||target_booking||':review-request','review_request');
  end if;
end;
$$;
create or replace function public.record_private_class_attendance(target_booking uuid, attended boolean)
returns void language sql volatile security invoker set search_path = '' as $$ select private.record_private_class_attendance(target_booking,attended); $$;

create or replace function private.submit_private_class_review(target_booking uuid, rating smallint, review_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); row_data public.private_class_bookings%rowtype; review_uuid uuid;
begin
  select * into row_data from public.private_class_bookings where id=target_booking;
  if row_data.id is null or row_data.student_id<>caller or row_data.status<>'completed' then raise exception 'التقييم متاح بعد جلسة مكتملة فقط'; end if;
  if rating not between 1 and 5 or char_length(trim(coalesce(review_comment,'')))<3 then raise exception 'النجوم والتعليق مطلوبة'; end if;
  insert into public.private_class_reviews(booking_id,coach_id,student_id,stars,comment)
  values(target_booking,row_data.coach_id,caller,rating,trim(review_comment)) returning id into review_uuid;
  return review_uuid;
exception when unique_violation then raise exception 'سبق تقييم هذه الجلسة';
end;
$$;
create or replace function public.submit_private_class_review(target_booking uuid, rating smallint, review_comment text)
returns uuid language sql volatile security invoker set search_path = '' as $$ select private.submit_private_class_review(target_booking,rating,review_comment); $$;

create or replace function private.set_private_class_availability(target_date date, target_time time, blocked boolean, block_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); coach_uuid uuid := (select private.current_coach_id()); normalized_time time;
begin
  if coach_uuid is null then raise exception 'حسابك غير مربوط بكوتش فعالة'; end if;
  normalized_time := coalesce(target_time,time '00:00');
  if extract(dow from target_date) not between 0 and 4 then raise exception 'الجمعة والسبت غير متاحين أصلًا'; end if;
  if normalized_time<>time '00:00' and normalized_time not in (time '18:00',time '19:00',time '20:00',time '21:00',time '22:00',time '23:00') then raise exception 'الوقت خارج الجدول الأساسي'; end if;
  insert into public.private_class_availability(coach_id,blocked_date,start_time,is_blocked,reason,created_by)
  values(coach_uuid,target_date,normalized_time,blocked,block_reason,caller)
  on conflict (coach_id,blocked_date,start_time) do update set is_blocked=excluded.is_blocked,reason=excluded.reason,updated_at=now();
end;
$$;
create or replace function public.set_private_class_availability(target_date date, target_time time default null, blocked boolean default true, block_reason text default null)
returns void language sql volatile security invoker set search_path = '' as $$ select private.set_private_class_availability(target_date,target_time,blocked,block_reason); $$;

create or replace function private.private_class_rating_summary(target_coach uuid)
returns table(average_rating numeric, rating_count bigint) language sql stable security definer set search_path = '' as $$
  select round(avg(stars)::numeric,2),count(*) from public.private_class_reviews
  where coach_id=target_coach and excluded_from_average=false;
$$;
revoke all on function private.private_class_rating_summary(uuid) from public, anon, authenticated;
create or replace function public.private_class_rating_summary(target_coach uuid)
returns table(average_rating numeric, rating_count bigint) language sql stable security invoker set search_path = '' as $$
  select * from private.private_class_rating_summary(target_coach);
$$;

create or replace function public.dispatch_private_class_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer := 0; item record; reminder_key text; label text;
begin
  for item in
    select b.id,b.student_id,b.starts_at,c.user_id coach_user
    from public.private_class_bookings b join public.private_class_coaches c on c.id=b.coach_id
    where b.status='scheduled' and (
      b.starts_at between now()+interval '23 hours 55 minutes' and now()+interval '24 hours 5 minutes'
      or b.starts_at between now()+interval '55 minutes' and now()+interval '65 minutes'
    )
  loop
    label := case when item.starts_at > now()+interval '2 hours' then '24h' else '1h' end;
    reminder_key := 'booking:'||item.id||':reminder:'||label;
    perform private.queue_notification(item.student_id,'تذكير بجلستك الخاصة',case when label='24h' then 'باقي 24 ساعة على جلستك.' else 'باقي ساعة على جلستك.' end,'private_class_reminder','/private-classes','booking',item.id,reminder_key||':student','private_class_reminder');
    perform private.queue_notification(item.coach_user,'تذكير بجلسة خاصة',case when label='24h' then 'باقي 24 ساعة على الجلسة.' else 'باقي ساعة على الجلسة.' end,'private_class_reminder','/coach/private-classes','booking',item.id,reminder_key||':coach','private_class_reminder');
    inserted_count := inserted_count+1;
  end loop;
  return inserted_count;
end;
$$;

revoke all on function private.book_private_class(uuid,timestamptz,text) from public, anon, authenticated;
revoke all on function private.cancel_private_class(uuid) from public, anon, authenticated;
revoke all on function private.reschedule_private_class(uuid,timestamptz,boolean) from public, anon, authenticated;
revoke all on function private.set_private_class_zoom(uuid,text) from public, anon, authenticated;
revoke all on function private.private_class_join_url(uuid) from public, anon, authenticated;
revoke all on function private.record_private_class_attendance(uuid,boolean) from public, anon, authenticated;
revoke all on function private.submit_private_class_review(uuid,smallint,text) from public, anon, authenticated;
revoke all on function private.set_private_class_availability(date,time,boolean,text) from public, anon, authenticated;
revoke all on function public.book_private_class(uuid,timestamptz,text) from public, anon;
revoke all on function public.cancel_private_class(uuid) from public, anon;
revoke all on function public.reschedule_private_class(uuid,timestamptz,boolean) from public, anon;
revoke all on function public.set_private_class_zoom(uuid,text) from public, anon;
revoke all on function public.private_class_join_url(uuid) from public, anon;
revoke all on function public.record_private_class_attendance(uuid,boolean) from public, anon;
revoke all on function public.submit_private_class_review(uuid,smallint,text) from public, anon;
revoke all on function public.set_private_class_availability(date,time,boolean,text) from public, anon;
revoke all on function public.private_class_rating_summary(uuid) from public, anon;
revoke all on function public.dispatch_private_class_reminders() from public, anon, authenticated;
grant execute on function public.book_private_class(uuid,timestamptz,text) to authenticated;
grant execute on function public.cancel_private_class(uuid) to authenticated;
grant execute on function public.reschedule_private_class(uuid,timestamptz,boolean) to authenticated;
grant execute on function public.set_private_class_zoom(uuid,text) to authenticated;
grant execute on function public.private_class_join_url(uuid) to authenticated;
grant execute on function public.record_private_class_attendance(uuid,boolean) to authenticated;
grant execute on function public.submit_private_class_review(uuid,smallint,text) to authenticated;
grant execute on function public.set_private_class_availability(date,time,boolean,text) to authenticated;
grant execute on function public.private_class_rating_summary(uuid) to authenticated;

insert into public.private_class_coaches(user_id,display_name,bio,is_active,is_bookable)
select u.id,'رنا','كوتش جلسات خاصة',true,true from auth.users u
where lower(u.email)='ranamoh0596@gmail.com'
on conflict (user_id) do update set display_name=excluded.display_name,is_active=true,is_bookable=true,updated_at=now();

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('private-class-reminders','*/5 * * * *','select public.dispatch_private_class_reminders();');
  end if;
exception when unique_violation then null;
end $$;
