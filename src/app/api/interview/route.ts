import { google } from '@ai-sdk/google'
import { generateObject, streamText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

export const maxDuration = 60

import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const { messages, episodeId, hostId, currentPhase } = await req.json() as { messages: any[], hostId: string, episodeId: string, currentPhase: string }
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const lastUserMessage = messages[messages.length - 1]
  const { data: userMsgData } = await supabase.from('conversations').insert({
    episode_id: episodeId,
    role: 'guest',
    message: lastUserMessage.content,
  }).select('id').single()

  const guestMessageId = userMsgData?.id

  const { data: episode } = await supabase.from('episodes').select('*, hosts(*), guests(*)').eq('id', episodeId).single()
  const { data: hostDna } = await supabase.from('host_dna').select('*').eq('host_id', hostId).single()
  const { data: phases } = await supabase.from('interview_phases').select('*')
  const activePhaseInfo = phases?.find(p => p.name === currentPhase)

  // ==========================================
  // CALL 1: STRUCTURED EVALUATION LAYER
  // ==========================================
  const evaluationSchema = z.object({
    sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
    confidence: z.number().min(0).max(100),
    emotional_intensity: z.number().min(0).max(100),
    curiosity_score: z.number().min(0).max(100),
    memories: z.array(z.object({
      type: z.enum(['fact', 'story', 'achievement', 'failure', 'emotional_moment', 'business_metric', 'lesson', 'personal_experience']),
      content: z.string()
    })),
    contradictions: z.array(z.object({
      contradiction_a: z.string(),
      contradiction_b: z.string(),
      severity: z.enum(['low', 'medium', 'high'])
    })),
    curiosity_targets: z.array(z.object({
      trigger_statement: z.string(),
      suggested_followups: z.array(z.string())
    })),
    response_strategy: z.enum(['FOLLOW_UP', 'CHALLENGE', 'CLARIFY', 'STORY_EXTRACTION', 'EMOTIONAL_PROBE', 'TOPIC_SHIFT', 'SUMMARY', 'REFLECTION']),
    next_phase: z.string(),
    phase_reasoning: z.string(),
  })

  const conversationHistory = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')

  const { object: evaluation } = await generateObject({
    model: google('gemini-1.5-pro'),
    schema: evaluationSchema,
    system: `You are the AI Evaluation Layer for a podcast interview. 
Current Phase: ${currentPhase} (Goal: ${activePhaseInfo?.goal})
Criteria to progress: ${activePhaseInfo?.completion_criteria}`,
    prompt: `Guest just said: "${lastUserMessage.content}"\n\nFull History:\n${conversationHistory}`,
  })

  if (guestMessageId) {
    await supabase.from('conversation_metrics').insert({
      message_id: guestMessageId,
      sentiment: evaluation.sentiment,
      confidence: evaluation.confidence,
      emotional_intensity: evaluation.emotional_intensity,
      curiosity_score: evaluation.curiosity_score,
      topic_category: 'general',
      importance_score: 50
    })
  }

  for (const memory of evaluation.memories) {
    await supabase.from('conversation_memory').insert({
      episode_id: episodeId,
      memory_type: memory.type,
      memory_content: memory.content,
      confidence_score: 90
    })
  }

  // Update phase if changed
  let activePhase = currentPhase
  if (evaluation.next_phase && evaluation.next_phase !== currentPhase) {
    activePhase = evaluation.next_phase
    await supabase.from('episodes').update({ current_phase: activePhase }).eq('id', episodeId)
  }

  // ==========================================
  // CALL 2: STREAMING GENERATION
  // ==========================================
  const { data: latestMemories } = await supabase.from('conversation_memory').select('*').eq('episode_id', episodeId).limit(15)

  const systemPrompt = `You are ${episode?.hosts?.name}, a professional podcast host.
Your Personality: ${episode?.hosts?.personality_traits?.join(', ')}
Your Expertise: ${episode?.hosts?.expertise_areas?.join(', ')}
Your Tone: ${episode?.hosts?.tone_of_voice}

Host DNA Sliders (0-100):
- Curiosity: ${hostDna?.curiosity_level || 50}
- Challenge: ${hostDna?.challenge_level || 50}
- Empathy: ${hostDna?.empathy_level || 50}
- Storytelling: ${hostDna?.storytelling_level || 50}

Current Interview Phase: ${activePhase}
Selected Strategy: ${evaluation.response_strategy}

Guest Context: ${episode?.guests?.name}, ${episode?.guests?.bio}

Dynamic Memory Feed (Facts previously extracted):
${latestMemories?.map(m => `[ID: ${m.id}] - ${m.memory_content}`).join('\n')}

INSTRUCTIONS:
1. Generate the next response. Execute strategy: ${evaluation.response_strategy}.
2. If you reference a fact from the Dynamic Memory Feed, you MUST append a memory tag at the VERY END of your response formatted exactly like this: <REFS: id1, id2>. E.g., "That is interesting. <REFS: a1b2c3d4-..., f5e6d7c8-...>". 
3. Do not act like an AI. Keep responses conversational and human-like.`

  const result = await streamText({
    model: google('gemini-1.5-pro'),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      // Extract memory references via regex
      const refRegex = /<REFS:\s*([^>]+)>/;
      const match = text.match(refRegex);
      
      let referencedIds: string[] = [];
      let cleanedText = text;

      if (match) {
        referencedIds = match[1].split(',').map(id => id.trim());
        cleanedText = text.replace(refRegex, '').trim();
      }

      await supabase.from('conversations').insert({
        episode_id: episodeId,
        role: 'host',
        message: cleanedText,
        referenced_memory_ids: referencedIds,
        response_strategy: evaluation.response_strategy,
        interview_phase: activePhase
      })
    }
  })

  return result.toTextStreamResponse()
}
