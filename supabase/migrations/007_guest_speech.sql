-- Migration 7: Phase 6 Guest Speech-to-Text

-- 1. Create Storage Bucket for Audio Recordings
insert into storage.buckets (id, name, public) 
values ('interviews-audio', 'interviews-audio', false)
on conflict (id) do nothing;

-- Ensure authenticated users can upload and read their own session's audio
create policy "Authenticated users can upload audio" 
on storage.objects for insert 
with check ( bucket_id = 'interviews-audio' and auth.role() = 'authenticated' );

create policy "Authenticated users can read audio" 
on storage.objects for select 
using ( bucket_id = 'interviews-audio' and auth.role() = 'authenticated' );

-- 2. Create audio_recordings Table
create table if not exists public.audio_recordings (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  speaker text not null check (speaker in ('guest', 'host')),
  transcript text,
  duration numeric,
  audio_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audio_recordings enable row level security;

create policy "Users can manage their audio recordings" on public.audio_recordings 
for all using (
  exists (
    select 1 from public.episodes 
    where id = audio_recordings.episode_id 
    and user_id = auth.uid()
  )
);
