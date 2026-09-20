-- Preserve legacy Google Drive IDs while removing them as a requirement for
-- new or edited lessons. Bunny remains the only video playback source.
alter table public.lessons
alter column drive_file_id drop not null;
