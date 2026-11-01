create or replace function private.email_subject(
  template_key text,
  fallback_subject text,
  payload jsonb default '{}'::jsonb
)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case template_key
    when 'booking_confirmed' then 'تم تأكيد حجز جلستك الخاصة | أكاديمية مسك'
    when 'coach_booking_confirmed' then 'حجز جلسة خاصة جديدة | أكاديمية مسك'
    when 'booking_cancelled' then 'تم إلغاء الجلسة الخاصة | أكاديمية مسك'
    when 'booking_rescheduled' then 'تمت إعادة جدولة الجلسة الخاصة | أكاديمية مسك'
    when 'zoom_ready' then 'رابط Zoom لجلستك أصبح جاهزًا | أكاديمية مسك'
    when 'review_request' then 'شاركينا تقييم جلستك الخاصة | أكاديمية مسك'
    when 'private_class_reminder' then
      case when coalesce(payload->>'body','') like '%24 ساعة%'
        then 'تذكير: جلستك الخاصة غدًا | أكاديمية مسك'
        else 'تذكير: بقيت ساعة على جلستك الخاصة | أكاديمية مسك' end
    when 'subscription_expiry_7d' then 'باقي 7 أيام على انتهاء اشتراكك | أكاديمية مسك'
    when 'subscription_expiry_3d' then 'باقي 3 أيام على انتهاء اشتراكك | أكاديمية مسك'
    when 'subscription_expiry_today' then 'اليوم آخر يوم في اشتراكك | أكاديمية مسك'
    when 'subscription_expired' then 'انتهى اشتراكك في أكاديمية مسك'
    else coalesce(nullif(fallback_subject,''),'إشعار جديد | أكاديمية مسك')
  end;
$function$;
