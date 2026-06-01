import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function logTelemetry(params: {
  episodeId?: string
  systemArea: 'Authentication' | 'Dashboard' | 'Hosts' | 'Guests' | 'Episodes' | 'Knowledge Engine' | 'Research Agent' | 'Interview Engine' | 'Voice Engine' | 'Production Studio' | 'Publishing OS' | 'API' | 'LLM' | 'STT' | 'TTS' | 'VAD' | 'Supabase' | 'Queue'
  status: 'success' | 'failure'
  errorMessage?: string
  latencyMs?: number
  costUsd?: number
  provider?: string
  userId: string
}) {
  try {
    const { error } = await supabase
      .from('system_observability_logs')
      .insert({
        episode_id: params.episodeId || null,
        user_id: params.userId,
        system_area: params.systemArea,
        status: params.status,
        error_message: params.errorMessage || null,
        latency_ms: params.latencyMs || null,
        cost_usd: params.costUsd || 0.000000,
        provider: params.provider || null,
      })
    if (error) {
      console.error('Failed to log telemetry:', error)
    }
  } catch (err) {
    console.error('Error in logTelemetry:', err)
  }
}

export function calculateCost(params: {
  provider: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  characters?: number
  durationSeconds?: number
}): number {
  const { provider, model, inputTokens = 0, outputTokens = 0, characters = 0, durationSeconds = 0 } = params
  
  const providerLower = provider.toLowerCase()
  
  if (providerLower === 'google' || providerLower === 'gemini') {
    // Gemini 2.5 Flash: $0.075 / 1M input tokens, $0.30 / 1M output tokens
    return (inputTokens * 0.075 / 1_000_000) + (outputTokens * 0.30 / 1_000_000)
  }
  
  if (providerLower === 'groq') {
    if (model && model.toLowerCase().includes('whisper')) {
      // Groq Whisper: $0.03 per minute of audio
      return (durationSeconds / 60) * 0.03
    }
    // Groq Llama 3.3 70B: $0.59 / 1M input tokens, $0.79 / 1M output tokens
    return (inputTokens * 0.59 / 1_000_000) + (outputTokens * 0.79 / 1_000_000)
  }
  
  if (providerLower === 'elevenlabs') {
    // ElevenLabs: $0.0003 per character
    return characters * 0.0003
  }
  
  if (providerLower === 'openai') {
    // Embedding Cost: $0.02 / 1M tokens (standard text-embedding-3-small)
    return (inputTokens * 0.02 / 1_000_000)
  }
  
  return 0
}

export async function checkRateLimit(params: {
  userId: string
  systemArea: string
  limitCount: number
  windowMs: number
}): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const sinceDate = new Date(Date.now() - params.windowMs).toISOString()
    const { count, error } = await supabase
      .from('system_observability_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .eq('system_area', params.systemArea)
      .eq('status', 'success')
      .gte('created_at', sinceDate)

    if (error) {
      console.error('Error checking rate limit:', error)
      return { allowed: true, remaining: 1 } // fail open to not block production
    }

    const currentCount = count || 0
    return {
      allowed: currentCount < params.limitCount,
      remaining: Math.max(0, params.limitCount - currentCount),
    }
  } catch (err) {
    console.error('Error in checkRateLimit:', err)
    return { allowed: true, remaining: 1 }
  }
}

export async function enqueueToDLQ(params: {
  userId: string
  jobType: 'studio_processing' | 'publishing_job' | 'guest_research' | 'benchmark_job'
  payload: any
  errorMessage: string
}) {
  try {
    const { error } = await supabase
      .from('dead_letter_queue')
      .insert({
        user_id: params.userId,
        job_type: params.jobType,
        payload: params.payload,
        error_message: params.errorMessage,
        status: 'failed',
        retry_count: 0,
        max_retries: 3,
      })
    if (error) {
      console.error('Failed to enqueue to DLQ:', error)
    }
  } catch (err) {
    console.error('Error in enqueueToDLQ:', err)
  }
}
