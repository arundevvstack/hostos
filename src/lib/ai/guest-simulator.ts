import { google } from '@ai-sdk/google'
import { generateText, Message } from 'ai'
import { createClient } from '@/utils/supabase/server'

export async function generateGuestResponse(episodeId: string) {
  const supabase = createClient()

  // Fetch episode and synthetic configuration
  const { data: episode } = await supabase.from('episodes').select('*, synthetic_episodes(*, synthetic_personas(*), synthetic_scenarios(*))').eq('id', episodeId).single()
  const syntheticConfig = episode?.synthetic_episodes?.[0]
  if (!syntheticConfig) throw new Error('Not a synthetic episode')

  const persona = syntheticConfig.synthetic_personas
  const scenario = syntheticConfig.synthetic_scenarios

  // Fetch history
  const { data: history } = await supabase.from('conversations').select('*').eq('episode_id', episodeId).order('created_at', { ascending: true })

  const messages: Message[] = history?.map((msg: any) => ({
    id: msg.id,
    role: msg.role === 'host' ? 'user' : 'assistant', // To the guest, the host is the user
    content: msg.message
  })) || []

  // Ensure there is at least one message for the guest to respond to
  if (messages.length === 0) {
    return { text: "Hi, thanks for having me." }
  }

  const systemPrompt = `You are playing the role of a podcast guest.
Your Profile:
Name: ${persona.name}
Category: ${persona.category}
Bio: ${persona.biography}
Personality: ${persona.personality}
Expertise: ${persona.expertise}
Communication Style: ${persona.communication_style}
Emotional Tendencies: ${persona.emotional_tendencies}
Hidden Story: ${persona.hidden_stories} (Try to weave this in if appropriate)

Scenario Constraints (CRITICAL INSTRUCTION):
${scenario.behavior_prompt}

INSTRUCTIONS:
1. Stay strictly in character. Do not break the fourth wall.
2. Adhere entirely to your Communication Style and the Scenario Constraint.
3. Respond naturally to the host's previous message.
4. Do not offer to conclude the interview yourself unless the host wraps it up.`

  const { text } = await generateText({
    model: google('gemini-1.5-pro'), // Ideally this could be swapped to another model to ensure variety
    system: systemPrompt,
    messages
  })

  return { text }
}
