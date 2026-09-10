alter table public.lessons
add column if not exists bunny_video_id uuid;

create unique index if not exists lessons_bunny_video_id_unique
on public.lessons (bunny_video_id)
where bunny_video_id is not null;

update public.lessons
set bunny_video_id = '0078afc6-491e-43a6-93b1-95dfafa80d0a'
where id = 'a9c7c08c-7eb6-4b8d-af46-0f1b2d0e7a70'
  and bunny_video_id is null;
