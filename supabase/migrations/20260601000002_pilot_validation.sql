-- Migration 3: Pilot Validation Phase

-- 1. Update conversations table to strictly track memory references, strategy, and phase
alter table public.conversations add column referenced_memory_ids uuid[] default array[]::uuid[];
alter table public.conversations add column response_strategy text;
alter table public.conversations add column interview_phase text references public.interview_phases(name);

-- 2. Scoring Model Tables
create table public.ai_interview_scores (
  episode_id uuid references public.episodes(id) on delete cascade primary key,
  memory_score numeric check (memory_score >= 0 and memory_score <= 100),
  curiosity_score numeric check (curiosity_score >= 0 and curiosity_score <= 100),
  personality_score numeric check (personality_score >= 0 and personality_score <= 100),
  progression_score numeric check (progression_score >= 0 and progression_score <= 100),
  depth_score numeric check (depth_score >= 0 and depth_score <= 100),
  follow_up_quality_score numeric check (follow_up_quality_score >= 0 and follow_up_quality_score <= 100),
  overall_score numeric check (overall_score >= 0 and overall_score <= 100),
  evaluator_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.human_interview_scores (
  episode_id uuid references public.episodes(id) on delete cascade primary key,
  memory_score numeric check (memory_score >= 0 and memory_score <= 100),
  curiosity_score numeric check (curiosity_score >= 0 and curiosity_score <= 100),
  personality_score numeric check (personality_score >= 0 and personality_score <= 100),
  progression_score numeric check (progression_score >= 0 and progression_score <= 100),
  depth_score numeric check (depth_score >= 0 and depth_score <= 100),
  overall_score numeric check (overall_score >= 0 and overall_score <= 100),
  reviewer_notes text,
  reviewed_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Final scores can be a view that calculates the 70/30 split
create view public.final_interview_scores as
select 
  e.id as episode_id,
  coalesce(h.memory_score * 0.70 + a.memory_score * 0.30, coalesce(h.memory_score, a.memory_score)) as memory_score,
  coalesce(h.curiosity_score * 0.70 + a.curiosity_score * 0.30, coalesce(h.curiosity_score, a.curiosity_score)) as curiosity_score,
  coalesce(h.personality_score * 0.70 + a.personality_score * 0.30, coalesce(h.personality_score, a.personality_score)) as personality_score,
  coalesce(h.progression_score * 0.70 + a.progression_score * 0.30, coalesce(h.progression_score, a.progression_score)) as progression_score,
  coalesce(h.depth_score * 0.70 + a.depth_score * 0.30, coalesce(h.depth_score, a.depth_score)) as depth_score,
  coalesce(h.overall_score * 0.70 + a.overall_score * 0.30, coalesce(h.overall_score, a.overall_score)) as overall_score
from public.episodes e
left join public.human_interview_scores h on e.id = h.episode_id
left join public.ai_interview_scores a on e.id = a.episode_id
where h.episode_id is not null or a.episode_id is not null;

-- Enable RLS
alter table public.ai_interview_scores enable row level security;
alter table public.human_interview_scores enable row level security;

create policy "Users can read their ai scores" on public.ai_interview_scores for select using (exists (select 1 from public.episodes where id = ai_interview_scores.episode_id and user_id = auth.uid()));
create policy "Users can insert their ai scores" on public.ai_interview_scores for insert with check (exists (select 1 from public.episodes where id = ai_interview_scores.episode_id and user_id = auth.uid()));
create policy "Users can read their human scores" on public.human_interview_scores for select using (exists (select 1 from public.episodes where id = human_interview_scores.episode_id and user_id = auth.uid()));
create policy "Users can insert their human scores" on public.human_interview_scores for insert with check (exists (select 1 from public.episodes where id = human_interview_scores.episode_id and user_id = auth.uid()));
create policy "Users can update their human scores" on public.human_interview_scores for update using (exists (select 1 from public.episodes where id = human_interview_scores.episode_id and user_id = auth.uid()));
