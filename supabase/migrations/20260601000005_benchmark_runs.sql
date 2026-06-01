-- Migration 6: Benchmark Versioning Safeguard

create table public.benchmark_runs (
  id uuid default uuid_generate_v4() primary key,
  git_commit_sha text not null,
  prompt_version text not null,
  eval_prompt_version text not null,
  memory_prompt_version text not null,
  model_name text not null,
  model_version text not null,
  benchmark_type text not null,
  metrics jsonb default '{}'::jsonb not null,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Enable RLS
alter table public.benchmark_runs enable row level security;
create policy "Authenticated users can read benchmark_runs" on public.benchmark_runs for select using (auth.role() = 'authenticated');
create policy "Service role can insert benchmark_runs" on public.benchmark_runs for insert with check (true);
