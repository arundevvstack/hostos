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
CREATE POLICY "Enable all for authenticated users" ON public.podcast_renders FOR ALL USING (auth.role() = 'authenticated');
