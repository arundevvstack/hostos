import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logTelemetry, calculateCost } from '@/lib/hardening/logger'

export const maxDuration = 60

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const startTime = Date.now()
  let episodeId = ''
  let userId = ''

  try {
    const { transcriptHistory, episode, plannerDecision, currentPhase } = await req.json()
    episodeId = episode?.id || ''

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    userId = user.id

    // We can re-fetch context if needed or assume the planner provided it. For Phase 8B, let's keep it fast.
    const hostName = episode?.hosts?.name || 'the host'
    const guestName = episode?.guests?.name || 'the guest'

    const systemPrompt = `You are ${hostName}, a charismatic professional podcast host. You are interviewing ${guestName}.

YOUR PERSONALITY: ${episode?.hosts?.personality_traits?.join(', ') || 'curious, warm, insightful'}
YOUR STYLE: ${episode?.hosts?.interview_style || 'conversational'}, ${episode?.hosts?.tone_of_voice || 'warm and engaging'}
YOUR EXPERTISE: ${episode?.hosts?.expertise_areas?.join(', ') || 'business, technology, culture'}

CURRENT PHASE: ${currentPhase || 'INTRODUCTION'}
PLANNER STRATEGY FOR THIS RESPONSE: ${plannerDecision?.decision} (${plannerDecision?.reasoning})

RULES:
- You ARE ${hostName}. Never break character. Never say "As an AI".
- Keep responses SHORT: 1-3 sentences max.
- Use natural spoken language (um, ah, pauses if appropriate), not corporate speak.
- Execute the PLANNER STRATEGY flawlessly.
${plannerDecision?.decision === 'RECOVERY_REQUIRED' 
  ? '- CRITICAL RULE: You just interrupted the guest, but they kept speaking. You MUST apologize naturally (e.g. "Sorry, go ahead", "My apologies, finish that thought") and let them finish.' 
  : (plannerDecision?.decision === 'STORY_SPIKE' || plannerDecision?.decision === 'CONTRADICTION' || plannerDecision?.decision === 'EMOTION_SPIKE' || plannerDecision?.decision === 'CURIOSITY_SPIKE' || plannerDecision?.decision === 'CLARITY_FAILURE')
  ? `- CRITICAL RULE: You just interrupted the guest mid-sentence because of a ${plannerDecision?.decision}. Your first sentence MUST address this immediately, asking them to elaborate, clarify, or challenge them based on the trigger.`
  : ''}
`

    // Stream using fast Groq model
    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'), // Use the 70b model for better responses, Planner uses 8b for speed
      system: systemPrompt,
      messages: transcriptHistory.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      onFinish: async ({ text, usage }) => {
        const cleanedText = text.trim()
        
        let costUsd = 0
        if (usage) {
          costUsd = calculateCost({
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          })
        }
        const latencyMs = Date.now() - startTime

        // Background DB updates
        if (cleanedText) {
          const lastUserMessage = transcriptHistory[transcriptHistory.length - 1]
          
          await Promise.allSettled([
            supabase.from('conversations').insert({
              episode_id: episode.id,
              user_id: user.id,
              role: 'guest',
              content: lastUserMessage.content,
            }),
            supabase.from('conversations').insert({
              episode_id: episode.id,
              user_id: user.id,
              role: 'host',
              content: cleanedText,
            }),
            logTelemetry({
              episodeId: episode.id,
              userId: user.id,
              systemArea: 'LLM',
              status: 'success',
              latencyMs,
              costUsd,
              provider: 'groq',
            })
          ])
        }
      },
    })

    return new Response(result.textStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Respond API Error:', error?.message || error)
    
    const latencyMs = Date.now() - startTime
    if (userId) {
      await logTelemetry({
        episodeId,
        userId,
        systemArea: 'LLM',
        status: 'failure',
        errorMessage: error?.message || 'Unknown error',
        latencyMs,
        costUsd: 0,
        provider: 'groq',
      })
    }

    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
