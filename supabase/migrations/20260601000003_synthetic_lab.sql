-- Migration 4: Synthetic Interview Lab

create table public.prompt_versions (
  id uuid default uuid_generate_v4() primary key,
  version_tag text not null unique,
  system_prompt text not null,
  active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.synthetic_personas (
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

create table public.synthetic_scenarios (
  id uuid default uuid_generate_v4() primary key,
  type text not null unique,
  behavior_prompt text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.synthetic_runs (
  id uuid default uuid_generate_v4() primary key,
  prompt_version_id uuid references public.prompt_versions(id),
  total_interviews int not null,
  status text default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

create table public.synthetic_episodes (
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
create policy "Authenticated users can read prompt_versions" on public.prompt_versions for all using (auth.role() = 'authenticated');
create policy "Authenticated users can read synthetic_personas" on public.synthetic_personas for all using (auth.role() = 'authenticated');
create policy "Authenticated users can read synthetic_scenarios" on public.synthetic_scenarios for all using (auth.role() = 'authenticated');
create policy "Authenticated users can read synthetic_runs" on public.synthetic_runs for all using (auth.role() = 'authenticated');
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
('Difficult', 'Challenge the host''s premises. Push back if you disagree with a question.');

-- Insert initial personas
insert into public.synthetic_personas (category, name, biography, personality, communication_style, expertise, emotional_tendencies, hidden_stories) values
('Startup Founder', 'Alex Chen', 'Founded a fintech startup that scaled to $10M ARR in 2 years.', 'Driven, slightly paranoid, highly analytical.', 'Fast-paced, data-heavy.', 'B2B SaaS, Go-to-Market strategy.', 'Struggles with burnout and imposter syndrome.', 'Almost went bankrupt in year 1 due to a bad hire.'),
('Creator', 'Sarah Jenkins', 'A lifestyle YouTuber with 2M subscribers.', 'Bubbly but guarded, deeply concerned with authenticity.', 'Conversational, uses slang, emotive.', 'Content algorithms, community building.', 'Feels trapped by audience expectations.', 'Lost 70% of sponsorships last year due to an algorithm shift.');
