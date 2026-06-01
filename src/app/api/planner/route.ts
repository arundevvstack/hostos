import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logTelemetry, calculateCost } from '@/lib/hardening/logger'

export async function POST(req: Request) {
  const startTime = Date.now()
  let episodeId = ''
  let userId = ''
  let costUsd = 0

  try {
    const { transcriptHistory, episode, currentPhase, forceTrigger } = await req.json()
    episodeId = episode?.id || ''

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    userId = user.id

    // 1. Fetch Dynamic Context (Parallel to save latency)
    const [memoriesRes, knowledgeRes, contradictionsRes] = await Promise.all([
      supabase.from('conversation_memory').select('*').eq('episode_id', episode.id).limit(20).order('created_at', { ascending: false }),
      supabase.from('knowledge_sources').select('*').eq('user_id', user.id),
      supabase.from('contradictions').select('*').eq('episode_id', episode.id).eq('status', 'pending')
    ])

    const memories = memoriesRes.data || []
    const knowledge = knowledgeRes.data || []
    const contradictions = contradictionsRes.data || []

    const hostName = episode?.hosts?.name || 'the host'
    const guestName = episode?.guests?.name || 'the guest'

    const recentTranscript = transcriptHistory.slice(-10).map((msg: any) => `${msg.role === 'user' ? guestName : hostName}: ${msg.content}`).join('\n')

    const systemPrompt = `You are the internal brain (Response Planner) of an AI Podcast Host named ${hostName}.
You are currently interviewing ${guestName}.

Current Interview Phase: ${currentPhase}
Knowledge Sources Available: ${knowledge.length} items
Recent Memories: ${memories.map(m => m.memory_content).join(' | ')}
Open Contradictions: ${contradictions.length > 0 ? contradictions.map(c => c.topic).join(', ') : 'None'}

Your job is to read the recent transcript and decide IF the host should respond now, or WAIT.
If the guest just finished a complete thought, ask a question, or paused expecting a response, you MUST NOT wait.
If the guest is clearly mid-sentence or mid-thought, you MUST WAIT.

If you decide to respond, pick an action:
- ASK_FOLLOW_UP
- CLARIFY
- CHALLENGE
- EXPLORE_STORY
- INVESTIGATE_CONTRADICTION
- SUMMARIZE

Output JSON matching the schema.`

    // If a forced trigger was provided (e.g. from Turn Negotiator or Recovery Engine), skip LLM
    let plannerResult
    if (forceTrigger) {
      plannerResult = {
        decision: forceTrigger,
        reasoning: 'Forced by Turn Negotiation or Recovery Engine.'
      }
    } else {
      // 2. Generate structured decision using fast Llama 3 8B
      const result = await generateObject({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        prompt: `RECENT TRANSCRIPT:\n${recentTranscript}\n\nMake your decision based on the LAST message from the guest. Are they finished speaking?`,
        schema: z.object({
          decision: z.enum(['WAIT', 'ASK_FOLLOW_UP', 'CLARIFY', 'CHALLENGE', 'EXPLORE_STORY', 'INVESTIGATE_CONTRADICTION', 'SUMMARIZE', 'RECOVERY_REQUIRED']),
          reasoning: z.string().describe('Why you chose this decision based on the transcript'),
          shift_phase: z.string().optional().describe('If the interview should shift to a new phase, name it, otherwise omit'),
        }),
      })
      plannerResult = result.object
      
      // Calculate LLM cost
      if (result.usage) {
        costUsd = calculateCost({
          provider: 'google',
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        })
      }
    }

    const latencyMs = Date.now() - startTime
    
    // Log success telemetry
    await logTelemetry({
      episodeId,
      userId,
      systemArea: 'LLM',
      status: 'success',
      latencyMs,
      costUsd,
      provider: 'google',
    })

    return new Response(JSON.stringify({
      planner: plannerResult,
      contextUsed: {
        memoryCount: memories.length,
        knowledgeCount: knowledge.length,
        contradictionCount: contradictions.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Planner API Error:', error?.message || error)
    
    const latencyMs = Date.now() - startTime
    if (userId) {
      await logTelemetry({
        episodeId,
        userId,
        systemArea: 'LLM',
        status: 'failure',
        errorMessage: error?.message || 'Unknown error',
        latencyMs,
        costUsd,
        provider: 'google',
      })
    }

    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
