-- Phase 6: Knowledge Training Engine
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    host_id UUID REFERENCES public.hosts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'txt', 'url', 'youtube', 'note')),
    source_name TEXT NOT NULL,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    confidence_score INTEGER DEFAULT 0,
    coverage_score INTEGER DEFAULT 0,
    freshness_score INTEGER DEFAULT 100,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    relevance_score FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- pgvector similarity search RPC
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  host_id_filter uuid
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_sources ks ON kc.source_id = ks.id
  WHERE ks.host_id = host_id_filter
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Phase 7: Guest Research Agent
CREATE TABLE IF NOT EXISTS public.guest_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    report_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Phase 8: STT (Audio Recordings)
CREATE TABLE IF NOT EXISTS public.audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL CHECK (speaker IN ('host', 'guest')),
    transcript TEXT NOT NULL,
    duration FLOAT NOT NULL DEFAULT 0.0,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Monitor & Metrics (Conversation Health)
CREATE TABLE IF NOT EXISTS public.conversation_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    silence_duration FLOAT DEFAULT 0.0,
    interruption_count INTEGER DEFAULT 0,
    overlap_duration FLOAT DEFAULT 0.0,
    response_latency FLOAT DEFAULT 0.0,
    engagement_score INTEGER DEFAULT 0,
    stuck_score INTEGER DEFAULT 0,
    human_likeness_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Phase 10: Production Studio
CREATE TABLE IF NOT EXISTS public.production_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('summary', 'show_notes', 'transcript', 'chapters', 'quotes', 'insights', 'actions', 'linkedin', 'x', 'blog', 'newsletter')),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Phase 11: Publishing & Distribution
CREATE TABLE IF NOT EXISTS public.distribution_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('rss', 'spotify', 'apple', 'youtube', 'linkedin', 'x')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'queued', 'publishing', 'published', 'failed')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies Setup
-- Enable RLS on new tables
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_jobs ENABLE ROW LEVEL SECURITY;

-- Disable RLS for now (or apply broad policy)
CREATE POLICY "Enable all for authenticated users" ON public.knowledge_sources FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.knowledge_chunks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.guest_research FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.audio_recordings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.conversation_health FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.production_assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.distribution_jobs FOR ALL USING (auth.role() = 'authenticated');
