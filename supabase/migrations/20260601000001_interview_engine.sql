-- Migration 2: AI Interview Intelligence Engine Schema

-- 1. Host DNA System
create table public.host_dna (
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
create table public.interview_objectives (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  objective text not null,
  priority int default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Interview Phases
create table public.interview_phases (
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
('CLOSING', 'Final advice and key takeaways', 'Interview formally concluded', 'End of interview');

-- Add current_phase to episodes
alter table public.episodes add column current_phase text references public.interview_phases(name) default 'INTRODUCTION';

-- 4. Voice Future-proofing on conversations
alter table public.conversations add column speaker_duration numeric;
alter table public.conversations add column pause_length numeric;
alter table public.conversations add column voice_confidence numeric;
alter table public.conversations add column emotion_score numeric;

-- 5. Conversation Memory
create table public.conversation_memory (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  memory_type text not null check (memory_type in ('fact', 'story', 'achievement', 'failure', 'emotional_moment', 'business_metric', 'lesson', 'personal_experience')),
  memory_content text not null,
  confidence_score numeric check (confidence_score >= 0 and confidence_score <= 100),
  timestamp_reference timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Contradictions Engine
create table public.contradictions (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  contradiction_a text not null,
  contradiction_b text not null,
  severity text check (severity in ('low', 'medium', 'high')),
  status text default 'pending' check (status in ('pending', 'addressed', 'resolved'))
);

-- 7. Curiosity Engine
create table public.curiosity_targets (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  trigger_statement text not null,
  curiosity_score numeric check (curiosity_score >= 0 and curiosity_score <= 100),
  suggested_followups text[],
  status text default 'pending' check (status in ('pending', 'explored', 'skipped'))
);

-- 8. Topic Graph
create table public.topic_nodes (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  name text not null,
  description text
);

create table public.topic_connections (
  node_a_id uuid references public.topic_nodes(id) on delete cascade,
  node_b_id uuid references public.topic_nodes(id) on delete cascade,
  relationship_type text,
  primary key (node_a_id, node_b_id)
);

-- 9. Conversation Metrics
create table public.conversation_metrics (
  message_id uuid references public.conversations(id) on delete cascade primary key,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
  confidence numeric check (confidence >= 0 and confidence <= 100),
  emotional_intensity numeric check (emotional_intensity >= 0 and emotional_intensity <= 100),
  curiosity_score numeric check (curiosity_score >= 0 and curiosity_score <= 100),
  topic_category text,
  importance_score numeric check (importance_score >= 0 and importance_score <= 100)
);

-- 10. Host Response Strategy
create table public.host_response_strategy (
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
create policy "Users can manage their host DNA" on public.host_dna for all using (exists (select 1 from public.hosts where id = host_dna.host_id and user_id = auth.uid()));
create policy "Users can manage interview objectives" on public.interview_objectives for all using (exists (select 1 from public.episodes where id = interview_objectives.episode_id and user_id = auth.uid()));
create policy "Anyone can read interview phases" on public.interview_phases for select using (true);
create policy "Users can manage memory" on public.conversation_memory for all using (exists (select 1 from public.episodes where id = conversation_memory.episode_id and user_id = auth.uid()));
create policy "Users can manage contradictions" on public.contradictions for all using (exists (select 1 from public.episodes where id = contradictions.episode_id and user_id = auth.uid()));
create policy "Users can manage curiosity targets" on public.curiosity_targets for all using (exists (select 1 from public.episodes where id = curiosity_targets.episode_id and user_id = auth.uid()));
create policy "Users can manage topic nodes" on public.topic_nodes for all using (exists (select 1 from public.episodes where id = topic_nodes.episode_id and user_id = auth.uid()));
create policy "Users can manage topic connections" on public.topic_connections for all using (exists (select 1 from public.topic_nodes where id = topic_connections.node_a_id and exists (select 1 from public.episodes where id = public.topic_nodes.episode_id and user_id = auth.uid())));
create policy "Users can manage conversation metrics" on public.conversation_metrics for all using (exists (select 1 from public.conversations where id = conversation_metrics.message_id and user_id = auth.uid()));
create policy "Users can manage response strategies" on public.host_response_strategy for all using (exists (select 1 from public.episodes where id = host_response_strategy.episode_id and user_id = auth.uid()));
