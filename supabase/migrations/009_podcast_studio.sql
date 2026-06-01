-- Migration 9: Phase 10 Podcast Production Studio

create table if not exists public.episode_chapters (
  id uuid primary key default uuid_generate_v4(),
  episode_id uuid references public.episodes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  start_time_seconds integer not null,
  end_time_seconds integer,
  title text not null,
  summary text,
  created_at timestamptz default now()
);

create table if not exists public.episode_quotes (
  id uuid primary key default uuid_generate_v4(),
  episode_id uuid references public.episodes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  speaker_role text not null check (speaker_role in ('host', 'guest')),
  quote_text text not null,
  context text,
  created_at timestamptz default now()
);

create table if not exists public.episode_social_drafts (
  id uuid primary key default uuid_generate_v4(),
  episode_id uuid references public.episodes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'x', 'blog', 'newsletter')),
  draft_content text not null,
  status text default 'Draft' check (status in ('Draft', 'Approved', 'Published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Enable
alter table public.episode_chapters enable row level security;
alter table public.episode_quotes enable row level security;
alter table public.episode_social_drafts enable row level security;

-- Policies
create policy "Users can manage their episode chapters" on public.episode_chapters for all using (auth.uid() = user_id);
create policy "Users can manage their episode quotes" on public.episode_quotes for all using (auth.uid() = user_id);
create policy "Users can manage their episode social drafts" on public.episode_social_drafts for all using (auth.uid() = user_id);
