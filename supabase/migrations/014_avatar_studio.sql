-- Phase 12: Avatar Podcast Studio Database Schema

-- 1. avatar_profiles
create table if not exists public.avatar_profiles (
  id uuid default uuid_generate_v4() primary key,
  entity_type text not null check (entity_type in ('host', 'guest')),
  entity_id uuid not null,
  provider text not null default 'heygen' check (provider in ('heygen', 'tavus', 'synthesia')),
  provider_avatar_id text,
  visual_identity jsonb default '{}'::jsonb,
  gesture_style text default 'neutral',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. avatar_studios
create table if not exists public.avatar_studios (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  background_url text,
  theme_config jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. video_projects
create table if not exists public.video_projects (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  studio_id uuid references public.avatar_studios(id) on delete set null,
  camera_layout text default 'dynamic',
  status text default 'draft' check (status in ('draft', 'rendering', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. video_renders
create table if not exists public.video_renders (
  id uuid default uuid_generate_v4() primary key,
  video_project_id uuid references public.video_projects(id) on delete cascade not null,
  format text not null check (format in ('landscape', 'portrait', 'square')),
  url text,
  duration numeric,
  status text default 'processing' check (status in ('processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.avatar_profiles enable row level security;
alter table public.avatar_studios enable row level security;
alter table public.video_projects enable row level security;
alter table public.video_renders enable row level security;

-- Create minimal policies (can be refined later)
create policy "Users can view their avatar profiles" on public.avatar_profiles for all using (true);
create policy "Public studios are readable" on public.avatar_studios for select using (true);
create policy "Users can view their video projects" on public.video_projects for all using (true);
create policy "Users can view their video renders" on public.video_renders for all using (true);

-- Seed Default Studios
insert into public.avatar_studios (name, description, theme_config) values
('Modern Business', 'Clean office background with warm lighting', '{"type": "office"}'::jsonb),
('Diary Of A CEO Style', 'Dark moody background with neon accents', '{"type": "dark_moody"}'::jsonb),
('Lex Fridman Style', 'Minimalist black background', '{"type": "minimal_black"}'::jsonb),
('Joe Rogan Style', 'Brick wall with neon signs and warm desk lamp', '{"type": "brick_neon"}'::jsonb),
('Minimal White SaaS', 'Bright white cyclorama with clean shadows', '{"type": "white_cyc"}'::jsonb)
on conflict do nothing;
