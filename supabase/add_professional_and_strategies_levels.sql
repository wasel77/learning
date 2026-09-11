-- Adding enum values is data-preserving: no lesson, profile, progress, or video row is changed.
alter type public.user_level add value if not exists 'professional' after 'expert';
alter type public.user_level add value if not exists 'strategies' after 'professional';

-- PostgreSQL requires newly added enum values to be committed before functions use them.
commit;

begin;

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
          when 'strategies' then requested_level in (
            'beginner', 'advanced', 'expert', 'strategies'
          )
          when 'expert' then requested_level in ('beginner', 'advanced', 'expert')
          when 'advanced' then requested_level in ('beginner', 'advanced')
          else requested_level = 'beginner'
        end
        when 'diamond' then case profile.level
          when 'strategies' then true
          when 'professional' then requested_level in (
            'beginner', 'advanced', 'expert', 'professional'
          )
          when 'expert' then requested_level in ('beginner', 'advanced', 'expert')
          when 'advanced' then requested_level in ('beginner', 'advanced')
          else requested_level = 'beginner'
        end
      end
  );
$$;

revoke execute on function public.can_access_level(public.user_level)
  from public, anon;
grant execute on function public.can_access_level(public.user_level)
  to authenticated;

commit;
