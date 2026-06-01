-- Phase 12G: AI Shorts Generator Database Schema

-- 1. clip_candidates
create table if not exists public.clip_candidates (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  clip_type text not null check (clip_type in ('Story', 'Contradiction', 'Hot Take', 'Founder Lesson', 'Emotional Moment', 'Key Quote', 'Actionable Advice', 'Big Number', 'Failure', 'Success Story')),
  start_time numeric not null,
  end_time numeric not null,
  transcript_segment text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. viral_moments
create table if not exists public.viral_moments (
  id uuid default uuid_generate_v4() primary key,
  clip_candidate_id uuid references public.clip_candidates(id) on delete cascade not null unique,
  viral_score numeric check (viral_score >= 0 and viral_score <= 100),
  hook_strength numeric check (hook_strength >= 0 and hook_strength <= 100),
  retention_potential numeric check (retention_potential >= 0 and retention_potential <= 100),
  emotional_impact numeric check (emotional_impact >= 0 and emotional_impact <= 100),
  curiosity_gap numeric check (curiosity_gap >= 0 and curiosity_gap <= 100),
  shareability numeric check (shareability >= 0 and shareability <= 100),
  platform_fit text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. short_video_renders
create table if not exists public.short_video_renders (
  id uuid default uuid_generate_v4() primary key,
  clip_candidate_id uuid references public.clip_candidates(id) on delete cascade not null,
  format text not null check (format in ('9:16', '1:1', '16:9')),
  platform text not null check (platform in ('tiktok', 'reels', 'youtube_shorts', 'linkedin', 'instagram')),
  url text,
  duration numeric,
  caption_style text default 'dynamic',
  visual_effects jsonb default '[]'::jsonb,
  status text default 'processing' check (status in ('processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.clip_candidates enable row level security;
alter table public.viral_moments enable row level security;
alter table public.short_video_renders enable row level security;

-- Create minimal policies (can be refined later)
create policy "Users can view their clip candidates" on public.clip_candidates for all using (exists (select 1 from public.episodes where id = clip_candidates.episode_id and user_id = auth.uid()));
create policy "Users can view their viral moments" on public.viral_moments for all using (exists (select 1 from public.clip_candidates join public.episodes on clip_candidates.episode_id = episodes.id where clip_candidates.id = viral_moments.clip_candidate_id and episodes.user_id = auth.uid()));
create policy "Users can view their short video renders" on public.short_video_renders for all using (exists (select 1 from public.clip_candidates join public.episodes on clip_candidates.episode_id = episodes.id where clip_candidates.id = short_video_renders.clip_candidate_id and episodes.user_id = auth.uid()));
