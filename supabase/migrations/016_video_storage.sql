-- Phase 16: Video Studio Hardening

-- 1. Create video_templates bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('video_templates', 'video_templates', true)
on conflict (id) do nothing;

-- Ensure public access policies are active for video_templates bucket
DROP POLICY IF EXISTS "Public Access to Video Templates" ON storage.objects;
create policy "Public Access to Video Templates"
  on storage.objects for select
  using ( bucket_id = 'video_templates' );

-- 2. provider_health table
create table if not exists public.provider_health (
  id uuid default uuid_generate_v4() primary key,
  provider_name text not null unique check (provider_name in ('heygen', 'tavus', 'synthesia', 'mock_renderer', 'shorts_renderer')),
  status text not null default 'operational' check (status in ('operational', 'degraded', 'down', 'maintenance')),
  success_rate numeric default 100.0,
  average_render_time_seconds numeric default 0,
  total_renders integer default 0,
  failed_renders integer default 0,
  last_checked timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.provider_health enable row level security;

-- Provider health should be publicly readable for dashboards
DROP POLICY IF EXISTS "Provider health is readable by all" ON public.provider_health;
create policy "Provider health is readable by all" on public.provider_health for select using (true);

-- Seed Providers
insert into public.provider_health (provider_name, status, success_rate) values
('heygen', 'operational', 100),
('tavus', 'maintenance', 0),
('synthesia', 'operational', 100),
('mock_renderer', 'operational', 100),
('shorts_renderer', 'operational', 100)
on conflict (provider_name) do nothing;
