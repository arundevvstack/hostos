-- Migration 17: Phase 13 Analytics & Growth Engine

-- 1. podcast_analytics
create table if not exists public.podcast_analytics (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  views integer default 0,
  downloads integer default 0,
  completion_rate numeric default 0.0 check (completion_rate >= 0 and completion_rate <= 100),
  avg_listen_time_seconds numeric default 0,
  avg_watch_time_seconds numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (episode_id)
);

-- 2. shorts_analytics
create table if not exists public.shorts_analytics (
  id uuid default uuid_generate_v4() primary key,
  short_render_id uuid references public.short_video_renders(id) on delete cascade not null,
  platform text not null check (platform in ('tiktok', 'reels', 'youtube_shorts', 'linkedin', 'instagram')),
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  avg_watch_time numeric default 0,
  retention_rate numeric default 0 check (retention_rate >= 0 and retention_rate <= 100),
  ctr numeric default 0 check (ctr >= 0 and ctr <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (short_render_id, platform)
);

-- 3. host_performance
create table if not exists public.host_performance (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.hosts(id) on delete cascade not null,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  conversation_flow_score numeric check (conversation_flow_score >= 0 and conversation_flow_score <= 100),
  naturalness_score numeric check (naturalness_score >= 0 and naturalness_score <= 100),
  curiosity_score numeric check (curiosity_score >= 0 and curiosity_score <= 100),
  memory_usage_score numeric check (memory_usage_score >= 0 and memory_usage_score <= 100),
  average_rating numeric check (average_rating >= 0 and average_rating <= 100),
  most_successful_topic text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (host_id, episode_id)
);

-- 4. viral_insights
create table if not exists public.viral_insights (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  common_topics text[] default '{}',
  common_hooks text[] default '{}',
  structural_patterns text[] default '{}',
  emotional_patterns text[] default '{}',
  recommendations text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (episode_id)
);

-- 5. content_scorecards
create table if not exists public.content_scorecards (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  podcast_score numeric check (podcast_score >= 0 and podcast_score <= 100),
  social_score numeric check (social_score >= 0 and social_score <= 100),
  growth_score numeric check (growth_score >= 0 and growth_score <= 100),
  publishing_score numeric check (publishing_score >= 0 and publishing_score <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (episode_id)
);

-- Enable RLS
alter table public.podcast_analytics enable row level security;
alter table public.shorts_analytics enable row level security;
alter table public.host_performance enable row level security;
alter table public.viral_insights enable row level security;
alter table public.content_scorecards enable row level security;

-- Policies for RLS
DROP POLICY IF EXISTS "Users can read podcast_analytics" ON public.podcast_analytics;
create policy "Users can read podcast_analytics" on public.podcast_analytics for select using (exists (select 1 from public.episodes where id = podcast_analytics.episode_id and user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read shorts_analytics" ON public.shorts_analytics;
create policy "Users can read shorts_analytics" on public.shorts_analytics for select using (exists (
  select 1 from public.short_video_renders 
  join public.clip_candidates on short_video_renders.clip_candidate_id = clip_candidates.id 
  join public.episodes on clip_candidates.episode_id = episodes.id
  where short_video_renders.id = shorts_analytics.short_render_id and episodes.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can read host_performance" ON public.host_performance;
create policy "Users can read host_performance" on public.host_performance for select using (exists (select 1 from public.hosts where id = host_performance.host_id and user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read viral_insights" ON public.viral_insights;
create policy "Users can read viral_insights" on public.viral_insights for select using (exists (select 1 from public.episodes where id = viral_insights.episode_id and user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read content_scorecards" ON public.content_scorecards;
create policy "Users can read content_scorecards" on public.content_scorecards for select using (exists (select 1 from public.episodes where id = content_scorecards.episode_id and user_id = auth.uid()));
