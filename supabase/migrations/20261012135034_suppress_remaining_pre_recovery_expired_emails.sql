-- Cover expired cycles that were already inactive before recovery but never
-- received an expired notification. This prevents a retroactive recovery blast.
insert into private.subscription_email_suppressed_cycles(user_id,expires_on,reason)
select c.user_id,c.expires_on,'pre_recovery_cycle_no_retroactive_email'
from private.subscription_cycles c
join public.profiles p on p.id=c.user_id
where p.is_active=false
  and c.expires_on < (now() at time zone 'Asia/Riyadh')::date
  and not exists (
    select 1 from public.notifications n
    where n.idempotency_key =
      'subscription:'||c.user_id::text||':'||c.expires_on::text||':subscription_expired'
  )
on conflict (user_id,expires_on) do nothing;
