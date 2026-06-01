-- Migration for Phase 8E: Conversation Interrupt Snapshots

CREATE TABLE IF NOT EXISTS conversation_interrupt_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interrupt_content TEXT NOT NULL,
  interrupt_classification TEXT,
  yield_decision TEXT,
  host_intent TEXT,
  interrupted_sentence TEXT,
  transcript_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversation_interrupt_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own snapshots" 
ON conversation_interrupt_snapshots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own snapshots" 
ON conversation_interrupt_snapshots FOR SELECT 
USING (auth.uid() = user_id);
