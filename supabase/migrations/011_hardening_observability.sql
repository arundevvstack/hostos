-- Migration 11: Launch Hardening and Observability
-- Create system_observability_logs table
CREATE TABLE IF NOT EXISTS public.system_observability_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  system_area TEXT NOT NULL CHECK (system_area IN ('Authentication', 'Dashboard', 'Hosts', 'Guests', 'Episodes', 'Knowledge Engine', 'Research Agent', 'Interview Engine', 'Voice Engine', 'Production Studio', 'Publishing OS', 'API', 'LLM', 'STT', 'TTS', 'VAD', 'Supabase', 'Queue')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  latency_ms INTEGER,
  cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create dead_letter_queue table
CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('studio_processing', 'publishing_job', 'guest_research', 'benchmark_job')),
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  max_retries INTEGER DEFAULT 3 NOT NULL,
  status TEXT NOT NULL DEFAULT 'failed' CHECK (status IN ('failed', 'retrying', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on both tables
ALTER TABLE public.system_observability_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own observability logs" ON public.system_observability_logs;
DROP POLICY IF EXISTS "Users can manage their own dead letter queue items" ON public.dead_letter_queue;

-- Create policies for RLS
CREATE POLICY "Users can manage their own observability logs" ON public.system_observability_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own dead letter queue items" ON public.dead_letter_queue
  FOR ALL USING (auth.uid() = user_id);

-- Performance and Hardening indexes on foreign keys and search paths
CREATE INDEX IF NOT EXISTS idx_conversations_episode ON public.conversations(episode_id);
CREATE INDEX IF NOT EXISTS idx_memory_episode ON public.conversation_memory(episode_id);
CREATE INDEX IF NOT EXISTS idx_chunks_source ON public.knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_publishing_assets_episode ON public.publishing_assets(episode_id);
CREATE INDEX IF NOT EXISTS idx_obs_logs_episode ON public.system_observability_logs(episode_id);
CREATE INDEX IF NOT EXISTS idx_obs_logs_user ON public.system_observability_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dlq_user ON public.dead_letter_queue(user_id);
