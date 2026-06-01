-- Migration 2: AI Interview Intelligence Engine Schema

-- 1. Host DNA System
create table if not exists public.host_dna (
  host_id uuid references public.hosts(id) on delete cascade primary key,
  curiosity_level int default 50 check (curiosity_level >= 0 and curiosity_level <= 100),
  challenge_level int default 50 check (challenge_level >= 0 and challenge_level <= 100),
  empathy_level int default 50 check (empathy_level >= 0 and empathy_level <= 100),
  humor_level int default 50 check (humor_level >= 0 and humor_level <= 100),
  storytelling_level int default 50 check (storytelling_level >= 0 and storytelling_level <= 100),
  followup_depth int default 50 check (followup_depth >= 0 and followup_depth <= 100),
  interruption_tendency int default 50 check (interruption_tendency >= 0 and interruption_tendency <= 100),
  controversy_tolerance int default 50 check (controversy_tolerance >= 0 and controversy_tolerance <= 100)
);

-- 2. Interview Objectives
create table if not exists public.interview_objectives (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  objective text not null,
  priority int default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Interview Phases
create table if not exists public.interview_phases (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  goal text not null,
  completion_criteria text not null,
  transition_rules text not null
);

-- Insert default phases
insert into public.interview_phases (name, goal, completion_criteria, transition_rules) values
('INTRODUCTION', 'Welcome guest and establish context', 'Guest is welcomed and topic is introduced', 'Transition to DISCOVERY when context is set'),
('DISCOVERY', 'Understand background and gather information', 'Key background facts established', 'Transition to DEEP_DIVE when baseline facts are clear'),
('DEEP_DIVE', 'Explore key stories and extract insights', 'Core stories and insights are extracted', 'Transition to CHALLENGE to test assumptions'),
('CHALLENGE', 'Probe assumptions and ask difficult questions', 'Guest assumptions challenged and discussed', 'Transition to REFLECTION to synthesize learnings'),
('REFLECTION', 'Synthesize lessons learned', 'Lessons and insights summarized by guest', 'Transition to CLOSING when reflection is complete'),
('CLOSING', 'Final advice and key takeaways', 'Interview formally concluded', 'End of interview')
ON CONFLICT (name) DO NOTHING;

-- Add current_phase to episodes
alter table public.episodes add column if not exists current_phase text references public.interview_phases(name) default 'INTRODUCTION';

-- 4. Voice Future-proofing on conversations
alter table public.conversations add column if not exists speaker_duration numeric;
alter table public.conversations add column if not exists pause_length numeric;
alter table public.conversations add column if not exists voice_confidence numeric;
alter table public.conversations add column if not exists emotion_score numeric;

-- 5. Conversation Memory
create table if not exists public.conversation_memory (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  memory_type text not null check (memory_type in ('fact', 'story', 'achievement', 'failure', 'emotional_moment', 'business_metric', 'lesson', 'personal_experience')),
  memory_content text not null,
  confidence_score numeric check (confidence_score >= 0 and confidence_score <= 100),
  timestamp_reference timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Contradictions Engine
create table if not exists public.contradictions (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  contradiction_a text not null,
  contradiction_b text not null,
  severity text check (severity in ('low', 'medium', 'high')),
  status text default 'pending' check (status in ('pending', 'addressed', 'resolved'))
);

-- 7. Curiosity Engine
create table if not exists public.curiosity_targets (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  trigger_statement text not null,
  curiosity_score numeric check (curiosity_score >= 0 and curiosity_score <= 100),
  suggested_followups text[],
  status text default 'pending' check (status in ('pending', 'explored', 'skipped'))
);

-- 8. Topic Graph
create table if not exists public.topic_nodes (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  name text not null,
  description text
);

create table if not exists public.topic_connections (
  node_a_id uuid references public.topic_nodes(id) on delete cascade,
  node_b_id uuid references public.topic_nodes(id) on delete cascade,
  relationship_type text,
  primary key (node_a_id, node_b_id)
);

-- 9. Conversation Metrics
create table if not exists public.conversation_metrics (
  message_id uuid references public.conversations(id) on delete cascade primary key,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
  confidence numeric check (confidence >= 0 and confidence <= 100),
  emotional_intensity numeric check (emotional_intensity >= 0 and emotional_intensity <= 100),
  curiosity_score numeric check (curiosity_score >= 0 and curiosity_score <= 100),
  topic_category text,
  importance_score numeric check (importance_score >= 0 and importance_score <= 100)
);

-- 10. Host Response Strategy
create table if not exists public.host_response_strategy (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  message_id uuid references public.conversations(id) on delete cascade,
  strategy text check (strategy in ('FOLLOW_UP', 'CHALLENGE', 'CLARIFY', 'STORY_EXTRACTION', 'EMOTIONAL_PROBE', 'TOPIC_SHIFT', 'SUMMARY', 'REFLECTION')),
  reasoning text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on new tables
alter table public.host_dna enable row level security;
alter table public.interview_objectives enable row level security;
alter table public.interview_phases enable row level security;
alter table public.conversation_memory enable row level security;
alter table public.contradictions enable row level security;
alter table public.curiosity_targets enable row level security;
alter table public.topic_nodes enable row level security;
alter table public.topic_connections enable row level security;
alter table public.conversation_metrics enable row level security;
alter table public.host_response_strategy enable row level security;

-- Setup basic RLS policies for the new tables based on ownership
DROP POLICY IF EXISTS "Users can manage their host DNA" ON public.host_dna;
create policy "Users can manage their host DNA" on public.host_dna for all using (exists (select 1 from public.hosts where id = host_dna.host_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage interview objectives" ON public.interview_objectives;
create policy "Users can manage interview objectives" on public.interview_objectives for all using (exists (select 1 from public.episodes where id = interview_objectives.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Anyone can read interview phases" ON public.interview_phases;
create policy "Anyone can read interview phases" on public.interview_phases for select using (true);
DROP POLICY IF EXISTS "Users can manage memory" ON public.conversation_memory;
create policy "Users can manage memory" on public.conversation_memory for all using (exists (select 1 from public.episodes where id = conversation_memory.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage contradictions" ON public.contradictions;
create policy "Users can manage contradictions" on public.contradictions for all using (exists (select 1 from public.episodes where id = contradictions.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage curiosity targets" ON public.curiosity_targets;
create policy "Users can manage curiosity targets" on public.curiosity_targets for all using (exists (select 1 from public.episodes where id = curiosity_targets.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage topic nodes" ON public.topic_nodes;
create policy "Users can manage topic nodes" on public.topic_nodes for all using (exists (select 1 from public.episodes where id = topic_nodes.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage topic connections" ON public.topic_connections;
create policy "Users can manage topic connections" on public.topic_connections for all using (exists (select 1 from public.topic_nodes where id = topic_connections.node_a_id and exists (select 1 from public.episodes where id = public.topic_nodes.episode_id and user_id = auth.uid())));
DROP POLICY IF EXISTS "Users can manage conversation metrics" ON public.conversation_metrics;
create policy "Users can manage conversation metrics" on public.conversation_metrics for all using (exists (select 1 from public.conversations where id = conversation_metrics.message_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage response strategies" ON public.host_response_strategy;
create policy "Users can manage response strategies" on public.host_response_strategy for all using (exists (select 1 from public.episodes where id = host_response_strategy.episode_id and user_id = auth.uid()));
-- Migration 3: Pilot Validation Phase

-- 1. Update conversations table to strictly track memory references, strategy, and phase
alter table public.conversations add column if not exists referenced_memory_ids uuid[] default array[]::uuid[];
alter table public.conversations add column if not exists response_strategy text;
alter table public.conversations add column if not exists interview_phase text references public.interview_phases(name);

-- 2. Scoring Model Tables
create table if not exists public.ai_interview_scores (
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

create table if not exists public.human_interview_scores (
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
create or replace view public.final_interview_scores as
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

DROP POLICY IF EXISTS "Users can read their ai scores" ON public.ai_interview_scores;
create policy "Users can read their ai scores" on public.ai_interview_scores for select using (exists (select 1 from public.episodes where id = ai_interview_scores.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert their ai scores" ON public.ai_interview_scores;
create policy "Users can insert their ai scores" on public.ai_interview_scores for insert with check (exists (select 1 from public.episodes where id = ai_interview_scores.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can read their human scores" ON public.human_interview_scores;
create policy "Users can read their human scores" on public.human_interview_scores for select using (exists (select 1 from public.episodes where id = human_interview_scores.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert their human scores" ON public.human_interview_scores;
create policy "Users can insert their human scores" on public.human_interview_scores for insert with check (exists (select 1 from public.episodes where id = human_interview_scores.episode_id and user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update their human scores" ON public.human_interview_scores;
create policy "Users can update their human scores" on public.human_interview_scores for update using (exists (select 1 from public.episodes where id = human_interview_scores.episode_id and user_id = auth.uid()));
-- Migration 4: Synthetic Interview Lab

create table if not exists public.prompt_versions (
  id uuid default uuid_generate_v4() primary key,
  version_tag text not null unique,
  system_prompt text not null,
  active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.synthetic_personas (
  id uuid default uuid_generate_v4() primary key,
  category text not null,
  name text not null,
  biography text not null,
  personality text not null,
  communication_style text not null,
  expertise text not null,
  emotional_tendencies text not null,
  hidden_stories text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.synthetic_scenarios (
  id uuid default uuid_generate_v4() primary key,
  type text not null unique,
  behavior_prompt text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.synthetic_runs (
  id uuid default uuid_generate_v4() primary key,
  prompt_version_id uuid references public.prompt_versions(id),
  total_interviews int not null,
  status text default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

create table if not exists public.synthetic_episodes (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  run_id uuid references public.synthetic_runs(id) on delete cascade not null,
  persona_id uuid references public.synthetic_personas(id) not null,
  scenario_id uuid references public.synthetic_scenarios(id) not null
);

-- Enable RLS
alter table public.prompt_versions enable row level security;
alter table public.synthetic_personas enable row level security;
alter table public.synthetic_scenarios enable row level security;
alter table public.synthetic_runs enable row level security;
alter table public.synthetic_episodes enable row level security;

-- Basic admin policies for lab tables (assuming authenticated users can access for now)
DROP POLICY IF EXISTS "Authenticated users can read prompt_versions" ON public.prompt_versions;
create policy "Authenticated users can read prompt_versions" on public.prompt_versions for all using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can read synthetic_personas" ON public.synthetic_personas;
create policy "Authenticated users can read synthetic_personas" on public.synthetic_personas for all using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can read synthetic_scenarios" ON public.synthetic_scenarios;
create policy "Authenticated users can read synthetic_scenarios" on public.synthetic_scenarios for all using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can read synthetic_runs" ON public.synthetic_runs;
create policy "Authenticated users can read synthetic_runs" on public.synthetic_runs for all using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can read synthetic_episodes" ON public.synthetic_episodes;
create policy "Authenticated users can read synthetic_episodes" on public.synthetic_episodes for all using (auth.role() = 'authenticated');

-- Insert initial scenarios
insert into public.synthetic_scenarios (type, behavior_prompt) values
('Straightforward', 'Answer questions directly and clearly without adding unnecessary details.'),
('Talkative', 'Give very long, rambling answers. Often go off on tangents before returning to the point.'),
('Reserved', 'Give short, one-sentence answers. Make the host work hard to get information.'),
('Emotional', 'Focus heavily on personal feelings, struggles, and the human impact of your work.'),
('Contradictory', 'Occasionally contradict something you said earlier in the interview.'),
('Evasive', 'Avoid answering direct questions by pivoting to a topic you prefer to talk about.'),
('Expert', 'Use highly technical jargon and assume the host knows deep industry concepts.'),
('Difficult', 'Challenge the host''s premises. Push back if you disagree with a question.')
ON CONFLICT ON CONSTRAINT synthetic_scenarios_type_key DO NOTHING;

-- Migration 5: Red Team Validation

-- Expand ai_interview_scores
alter table public.ai_interview_scores add column if not exists conversation_stuck_score numeric check (conversation_stuck_score >= 0 and conversation_stuck_score <= 100);
alter table public.ai_interview_scores add column if not exists engagement_score numeric check (engagement_score >= 0 and engagement_score <= 100);
alter table public.ai_interview_scores add column if not exists personality_drift_score numeric check (personality_drift_score >= 0 and personality_drift_score <= 100);
alter table public.ai_interview_scores add column if not exists short_term_memory_score numeric check (short_term_memory_score >= 0 and short_term_memory_score <= 100);
alter table public.ai_interview_scores add column if not exists long_term_memory_score numeric check (long_term_memory_score >= 0 and long_term_memory_score <= 100);

-- Insert Red Team Scenarios
insert into public.synthetic_scenarios (type, behavior_prompt) values
('One Word Guest', 'Answer everything with a single word like "yes", "no", or "maybe". Do not elaborate.'),
('Topic Dodger', 'Never answer the question directly. Always pivot the topic to something entirely unrelated.'),
('Self Promoter', 'Turn every answer into a marketing pitch for your new book, course, or product.'),
('Contradiction Machine', 'Constantly change your facts. Say one thing, and two turns later say the exact opposite.'),
('Hostile Guest', 'Challenge every question the host asks. Ask them why they are asking such a stupid question.'),
('Rambling Guest', 'Produce incredibly long, irrelevant responses that trail off into nothing.'),
('Emotional Guest', 'Frequently change your emotional state. Start crying randomly, then get extremely angry.'),
('Fake Expert', 'Claim immense expertise but use completely made-up buzzwords. Avoid specific details.'),
('Overly Polished', 'Give generic LinkedIn-style corporate answers. Never show vulnerability.'),
('Silent Guest', 'Show very low engagement. Pretend you didn''t hear the question or just shrug.')
ON CONFLICT ON CONSTRAINT synthetic_scenarios_type_key DO NOTHING;


-- Enable RLS
alter table public.benchmark_runs enable row level security;
DROP POLICY IF EXISTS "Authenticated users can read benchmark_runs" ON public.benchmark_runs;
create policy "Authenticated users can read benchmark_runs" on public.benchmark_runs for select using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Service role can insert benchmark_runs" ON public.benchmark_runs;
create policy "Service role can insert benchmark_runs" on public.benchmark_runs for insert with check (true);
-- Migration: Phase 6 Voice Host Engine

-- Add voice fields to hosts table
alter table public.hosts add column if not exists voice_enabled boolean default true;
alter table public.hosts add column if not exists voice_provider text default 'browser';
alter table public.hosts add column if not exists voice_id text;
alter table public.hosts add column if not exists voice_rate numeric default 1.0;
alter table public.hosts add column if not exists voice_pitch numeric default 1.0;
alter table public.hosts add column if not exists voice_volume numeric default 1.0;
alter table public.hosts add column if not exists future_voice_clone_id text;

-- Add voice analytics fields to episodes table
alter table public.episodes add column if not exists voice_play_count integer default 0;
alter table public.episodes add column if not exists voice_replay_count integer default 0;
alter table public.episodes add column if not exists voice_disabled_count integer default 0;

-- Migration 8: Phase 8E Conversation Interrupt Snapshots

create table if not exists public.conversation_interrupt_snapshots (
  id uuid primary key default uuid_generate_v4(),
  episode_id uuid references public.episodes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  interrupt_content text not null,
  interrupt_classification text,
  yield_decision text,
  host_intent text,
  interrupted_sentence text,
  transcript_context jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.conversation_interrupt_snapshots enable row level security;

-- Policies
DROP POLICY IF EXISTS "Users can insert their own snapshots" ON public.conversation_interrupt_snapshots;
create policy "Users can insert their own snapshots" 
on public.conversation_interrupt_snapshots for insert 
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select their own snapshots" ON public.conversation_interrupt_snapshots;
create policy "Users can select their own snapshots" 
on public.conversation_interrupt_snapshots for select 
using (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "Users can manage their episode chapters" ON public.episode_chapters;
create policy "Users can manage their episode chapters" on public.episode_chapters for all using (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their episode quotes" ON public.episode_quotes;
create policy "Users can manage their episode quotes" on public.episode_quotes for all using (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their episode social drafts" ON public.episode_social_drafts;
create policy "Users can manage their episode social drafts" on public.episode_social_drafts for all using (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "Users can manage their publishing assets" ON public.publishing_assets;
create policy "Users can manage their publishing assets" on public.publishing_assets for all using (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their asset versions" ON public.publishing_asset_versions;
create policy "Users can manage their asset versions" on public.publishing_asset_versions for all using (auth.uid() = user_id);

-- Migration 11: Launch Hardening and Observability
-- Create system_observability_logs table
create table if not exists public.system_observability_logs (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references public.episodes(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade not null,
  system_area text not null check (system_area in ('Authentication', 'Dashboard', 'Hosts', 'Guests', 'Episodes', 'Knowledge Engine', 'Research Agent', 'Interview Engine', 'Voice Engine', 'Production Studio', 'Publishing OS', 'API', 'LLM', 'STT', 'TTS', 'VAD', 'Supabase', 'Queue')),
  status text not null check (status in ('success', 'failure')),
  error_message text,
  latency_ms integer,
  cost_usd numeric(10, 6) default 0.000000,
  provider text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create dead_letter_queue table
create table if not exists public.dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  job_type text not null check (job_type in ('studio_processing', 'publishing_job', 'guest_research', 'benchmark_job')),
  payload jsonb not null,
  error_message text,
  retry_count integer default 0 not null,
  max_retries integer default 3 not null,
  status text not null default 'failed' check (status in ('failed', 'retrying', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on both tables
alter table public.system_observability_logs enable row level security;
alter table public.dead_letter_queue enable row level security;

-- Create policies for RLS
DROP POLICY IF EXISTS "Users can manage their own observability logs" ON public.system_observability_logs;
create policy "Users can manage their own observability logs" on public.system_observability_logs
  for all using (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own dead letter queue items" ON public.dead_letter_queue;
create policy "Users can manage their own dead letter queue items" on public.dead_letter_queue
  for all using (auth.uid() = user_id);

-- Performance and Hardening indexes on foreign keys and search paths
create index if not exists idx_conversations_episode on public.conversations(episode_id);
create index if not exists idx_memory_episode on public.conversation_memory(episode_id);

create index if not exists idx_publishing_assets_episode on public.publishing_assets(episode_id);
create index if not exists idx_obs_logs_episode on public.system_observability_logs(episode_id);
create index if not exists idx_obs_logs_user on public.system_observability_logs(user_id);
create index if not exists idx_dlq_user on public.dead_letter_queue(user_id);

-- Phase 10.5: Podcast Audio Rendering Engine
CREATE TABLE IF NOT EXISTS public.podcast_renders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    audio_url TEXT,
    duration FLOAT NOT NULL DEFAULT 0.0,
    render_status TEXT NOT NULL DEFAULT 'pending' CHECK (render_status IN ('pending', 'rendering', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.podcast_renders ENABLE ROW LEVEL SECURITY;

-- Disable RLS for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.podcast_renders;
CREATE POLICY "Enable all for authenticated users" ON public.podcast_renders FOR ALL USING (auth.role() = 'authenticated');
