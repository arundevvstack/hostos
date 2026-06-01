import { google } from '@ai-sdk/google'
import { generateObject, streamText, Message } from 'ai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

export const maxDuration = 60 // Allow longer execution for intelligence pipeline

export async function POST(req: Request) {
  const { messages, episodeId, hostId, currentPhase } = await req.json()

  const supabase = createClient()
  
  // 1. Save the incoming guest message
  const lastUserMessage = messages[messages.length - 1]
  const { data: userMsgData } = await supabase.from('conversations').insert({
    episode_id: episodeId,
    role: 'guest',
    message: lastUserMessage.content,
  }).select('id').single()

  const guestMessageId = userMsgData?.id

  // 2. Fetch required context for the Intelligence Layer
  const { data: episode } = await supabase
    .from('episodes')
    .select('*, hosts(*), guests(*)')
    .eq('id', episodeId)
    .single()

  const { data: hostDna } = await supabase.from('host_dna').eq('host_id', hostId).single()
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

  // Evaluate the conversation up to this point
  const conversationHistory = messages.map((m: Message) => `${m.role}: ${m.content}`).join('\n')

  const { object: evaluation } = await generateObject({
    model: google('gemini-1.5-pro'),
    schema: evaluationSchema,
    system: `You are the AI Evaluation Layer for a podcast interview. 
Analyze the guest's latest message in the context of the conversation.
Current Phase: ${currentPhase} (Goal: ${activePhaseInfo?.goal})
Criteria to progress phase: ${activePhaseInfo?.completion_criteria}`,
    prompt: `Guest just said: "${lastUserMessage.content}"\n\nFull History:\n${conversationHistory}`,
  })

  // Persistence Step: Fan out evaluation data
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

  for (const contradiction of evaluation.contradictions) {
    await supabase.from('contradictions').insert({
      episode_id: episodeId,
      contradiction_a: contradiction.contradiction_a,
      contradiction_b: contradiction.contradiction_b,
      severity: contradiction.severity
    })
  }

  for (const target of evaluation.curiosity_targets) {
    await supabase.from('curiosity_targets').insert({
      episode_id: episodeId,
      trigger_statement: target.trigger_statement,
      curiosity_score: evaluation.curiosity_score,
      suggested_followups: target.suggested_followups
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

  // Fetch updated memory context for the prompt
  const { data: latestMemories } = await supabase.from('conversation_memory').select('*').eq('episode_id', episodeId).limit(10)

  const systemPrompt = `You are ${episode?.hosts?.name}, a professional podcast host.
Your Personality: ${episode?.hosts?.personality_traits?.join(', ') || 'Professional'}
Your Expertise: ${episode?.hosts?.expertise_areas?.join(', ') || 'General'}
Your Interview Style: ${episode?.hosts?.interview_style || 'Conversational'}
Your Tone: ${episode?.hosts?.tone_of_voice || 'Warm'}

Host DNA Sliders (0-100):
- Curiosity: ${hostDna?.curiosity_level || 50}
- Challenge: ${hostDna?.challenge_level || 50}
- Empathy: ${hostDna?.empathy_level || 50}
- Humor: ${hostDna?.humor_level || 50}
- Storytelling: ${hostDna?.storytelling_level || 50}
- Follow-up Depth: ${hostDna?.followup_depth || 50}

Current Interview Phase: ${activePhase}

Guest Context:
Name: ${episode?.guests?.name}
Bio: ${episode?.guests?.bio}

Dynamic Memory Feed:
${latestMemories?.map(m => `- [${m.memory_type.toUpperCase()}] ${m.memory_content}`).join('\n')}

Selected Strategy for this response: ${evaluation.response_strategy}
Reasoning: ${evaluation.phase_reasoning}

INSTRUCTIONS:
1. Generate the next response to the guest.
2. Adapt your tone strictly to your Host DNA and Personality.
3. Execute the selected strategy (${evaluation.response_strategy}).
4. If there is a memory relevant, reference it naturally.
5. DO NOT act like an AI. Act exactly like the human podcast host described.
6. Keep your responses concise and conversational.`

  const result = await streamText({
    model: google('gemini-1.5-pro'),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      // Persist the host's generated response
      await supabase.from('conversations').insert({
        episode_id: episodeId,
        role: 'host',
        message: text,
      })
    }
  })

  return result.toDataStreamResponse()
}
