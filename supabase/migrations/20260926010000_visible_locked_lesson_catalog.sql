-- Expose only the metadata needed to render the complete active lesson catalog.
-- Full lesson rows remain protected by the existing lessons RLS policy, so this
-- function does not expose Bunny identifiers, summaries, vocabulary, or video data.
create or replace function public.list_active_lesson_catalog()
returns table (
  id uuid,
  level public.user_level,
  title text,
  description text,
  package_access public.content_package_scope,
  lesson_order integer,
  duration_minutes integer,
  completed boolean,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    lesson.id,
    lesson.level,
    lesson.title,
    lesson.description,
    lesson.package_access,
    lesson.lesson_order,
    lesson.duration_minutes,
    coalesce(progress.completed, false),
    progress.completed_at
  from public.profiles profile
  cross join public.lessons lesson
  left join public.lesson_progress progress
    on progress.lesson_id = lesson.id
   and progress.user_id = profile.id
  where profile.id = (select auth.uid())
    and profile.is_active = true
    and lesson.is_active = true
  order by
    case lesson.level
      when 'beginner' then 1
      when 'advanced' then 2
      when 'expert' then 3
      when 'professional' then 4
      when 'strategies' then 5
    end,
    lesson.lesson_order,
    lesson.id;
$$;

revoke all on function public.list_active_lesson_catalog() from public;
revoke all on function public.list_active_lesson_catalog() from anon;
grant execute on function public.list_active_lesson_catalog() to authenticated;

comment on function public.list_active_lesson_catalog() is
  'Returns active lesson card metadata and the caller own completion state without exposing protected lesson content.';
