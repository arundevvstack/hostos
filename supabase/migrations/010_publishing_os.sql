-- Migration 10: Phase 11 Publishing Operating System

create table if not exists public.publishing_assets (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null check (asset_type in ('transcript', 'show_notes', 'chapters', 'quotes', 'linkedin', 'x_thread', 'blog', 'newsletter')),
  content text not null,
  status text not null default 'Draft' check (status in ('Draft', 'Review', 'Approved', 'Scheduled', 'Publishing', 'Published', 'Failed', 'Archived')),
  editor_id uuid references auth.users(id) on delete set null,
  publish_destination text check (publish_destination in ('rss', 'spotify', 'apple', 'youtube', 'linkedin', 'x', 'web', 'email')),
  version integer not null default 1,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint unique_episode_asset unique (episode_id, asset_type)
);

create table if not exists public.publishing_asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.publishing_assets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  version integer not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.publishing_assets enable row level security;
alter table public.publishing_asset_versions enable row level security;

-- RLS Policies
create policy "Users can manage their publishing assets" on public.publishing_assets for all using (auth.uid() = user_id);
create policy "Users can manage their asset versions" on public.publishing_asset_versions for all using (auth.uid() = user_id);
