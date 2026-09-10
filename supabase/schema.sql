create type public.user_level as enum ('beginner', 'advanced', 'expert');
create type public.user_role as enum ('student', 'admin');
create type public.subscription_package as enum ('bronze', 'diamond');
create type public.content_package_scope as enum ('bronze', 'diamond', 'both');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  level public.user_level,
  role public.user_role not null default 'student',
  subscription_package public.subscription_package not null default 'bronze',
  is_active boolean not null default true,
  has_completed_placement_test boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id text primary key,
  level public.user_level not null default 'beginner',
  question_text text not null,
  explanation text,
  question_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.question_options (
  id text primary key,
  question_id text not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false
);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  percentage integer not null,
  final_level public.user_level not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.user_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  selected_option_id text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  level public.user_level not null,
  title text not null,
  description text,
  summary text,
  summary_links jsonb not null default '[]'::jsonb,
  vocabulary jsonb not null default '[]'::jsonb,
  drive_file_id text not null,
  bunny_video_id uuid,
  package_access public.content_package_scope not null default 'both',
  lesson_order integer not null default 1,
  duration_minutes integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index lessons_bunny_video_id_unique
on public.lessons (bunny_video_id)
where bunny_video_id is not null;

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched boolean not null default false,
  watched_at timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  quiz_score integer,
  quiz_total integer,
  quiz_percentage integer,
  quiz_passed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create table public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question_text text not null,
  explanation text,
  question_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lesson_question_options (
  id uuid primary key default gen_random_uuid(),
  lesson_question_id uuid not null references public.lesson_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false
);

create index lesson_questions_lesson_order_idx
  on public.lesson_questions (lesson_id, question_order);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level public.user_level not null,
  applies_to_all boolean not null default false,
  instructor_name text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  live_url text,
  replay_url text,
  package_access public.content_package_scope not null default 'both',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.success_stories (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  title text not null,
  description text not null,
  before_level public.user_level,
  after_level public.user_level,
  score integer,
  score_currency text not null default 'SAR' check (score_currency in ('SAR', 'USD')),
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_subscription_package_level_idx
  on public.profiles (subscription_package, level);
create index lessons_package_access_level_idx
  on public.lessons (package_access, level);
create index live_sessions_package_access_level_idx
  on public.live_sessions (package_access, level);

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.test_attempts enable row level security;
alter table public.user_answers enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_questions enable row level security;
alter table public.lesson_question_options enable row level security;
alter table public.live_sessions enable row level security;
alter table public.notifications enable row level security;
alter table public.success_stories enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.can_access_package(
  requested_scope public.content_package_scope
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
      and (
        requested_scope = 'both'
        or requested_scope::text = profile.subscription_package::text
      )
  );
$$;

revoke execute on function public.can_access_package(public.content_package_scope)
  from public, anon;
grant execute on function public.can_access_package(public.content_package_scope)
  to authenticated;

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
      and case profile.level
        when 'expert' then true
        when 'advanced' then requested_level in ('beginner', 'advanced')
        else requested_level = 'beginner'
      end
  );
$$;

revoke execute on function public.can_access_level(public.user_level)
  from public, anon;
grant execute on function public.can_access_level(public.user_level)
  to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, subscription_package)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    case
      when new.raw_user_meta_data ->> 'subscription_package' = 'diamond'
        then 'diamond'::public.subscription_package
      else 'bronze'::public.subscription_package
    end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create policy "Users can read own profile" on public.profiles for select
to authenticated using ((select auth.uid()) = id or public.is_admin());
create policy "Users can update own profile basics" on public.profiles for update
to authenticated using ((select auth.uid()) = id or public.is_admin())
with check ((select auth.uid()) = id or public.is_admin());

create policy "Authenticated users read active questions" on public.questions for select
to authenticated using (is_active = true or public.is_admin());
create policy "Admins manage questions" on public.questions for all
to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users read options" on public.question_options for select
to authenticated using (true);
create policy "Admins manage question options" on public.question_options for all
to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Users manage own attempts" on public.test_attempts for all
to authenticated using ((select auth.uid()) = user_id or public.is_admin())
with check ((select auth.uid()) = user_id or public.is_admin());
create policy "Users manage own answers" on public.user_answers for all
to authenticated using ((select auth.uid()) = user_id or public.is_admin())
with check ((select auth.uid()) = user_id or public.is_admin());

create policy "Authenticated users read accessible lessons" on public.lessons for select
to authenticated using (
  public.is_admin()
  or (
    is_active = true
    and public.can_access_package(package_access)
    and public.can_access_level(level)
  )
);
create policy "Admins manage lessons" on public.lessons for all
to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Users manage accessible lesson progress" on public.lesson_progress for all
to authenticated using (
  public.is_admin()
  or (
    (select auth.uid()) = user_id
    and exists (select 1 from public.lessons lesson where lesson.id = lesson_id)
  )
)
with check (
  public.is_admin()
  or (
    (select auth.uid()) = user_id
    and exists (select 1 from public.lessons lesson where lesson.id = lesson_id)
  )
);

create policy "Authenticated users read accessible lesson questions" on public.lesson_questions for select
to authenticated using (
  public.is_admin()
  or (
    is_active = true
    and exists (select 1 from public.lessons lesson where lesson.id = lesson_id)
  )
);
create policy "Admins manage lesson questions" on public.lesson_questions for all
to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users read accessible lesson question options" on public.lesson_question_options for select
to authenticated using (
  public.is_admin()
  or exists (
    select 1
    from public.lesson_questions question
    where question.id = lesson_question_id
  )
);
create policy "Admins manage lesson question options" on public.lesson_question_options for all
to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users read accessible live sessions" on public.live_sessions for select
to authenticated using (
  public.is_admin()
  or (
    is_active = true
    and public.can_access_package(package_access)
    and (applies_to_all = true or public.can_access_level(level))
  )
);
create policy "Admins manage live sessions" on public.live_sessions for all
to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Users read own notifications" on public.notifications for select
to authenticated using ((select auth.uid()) = user_id or public.is_admin());
create policy "Users update own notifications" on public.notifications for update
to authenticated using ((select auth.uid()) = user_id or public.is_admin())
with check ((select auth.uid()) = user_id or public.is_admin());
create policy "Admins insert notifications" on public.notifications for insert
to authenticated with check (public.is_admin());

create policy "Authenticated users read published stories" on public.success_stories for select
to authenticated using (is_published = true or public.is_admin());
create policy "Anyone can read published stories" on public.success_stories for select
to anon using (is_published = true);
create policy "Admins manage stories" on public.success_stories for all
to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.success_stories to anon;
grant select on public.questions, public.question_options, public.lessons, public.lesson_questions, public.lesson_question_options, public.live_sessions, public.success_stories to authenticated;
grant select, insert on public.profiles to authenticated;
grant update (full_name, level, has_completed_placement_test) on public.profiles to authenticated;
grant select, update on public.profiles to service_role;
grant select, insert, update on public.test_attempts, public.user_answers, public.lesson_progress, public.notifications to authenticated;
grant insert, update, delete on public.lessons, public.live_sessions, public.notifications, public.success_stories to authenticated;
grant insert, update, delete on public.questions, public.question_options to authenticated;
grant insert, update, delete on public.lesson_questions, public.lesson_question_options to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
