import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export const maxDuration = 60

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    // Read EVERYTHING from the client request so we don't have to query the DB before responding
    const { messages, episodeId, hostId, currentPhase, episode, hostDna, memories } = await req.json()

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const lastUserMessage = messages[messages.length - 1]

    const hostName = episode?.hosts?.name || 'the host'
    const guestName = episode?.guests?.name || 'the guest'

    const systemPrompt = `You are ${hostName}, a charismatic professional podcast host. You are interviewing ${guestName}.

YOUR PERSONALITY: ${episode?.hosts?.personality_traits?.join(', ') || 'curious, warm, insightful'}
YOUR STYLE: ${episode?.hosts?.interview_style || 'conversational'}, ${episode?.hosts?.tone_of_voice || 'warm and engaging'}
YOUR EXPERTISE: ${episode?.hosts?.expertise_areas?.join(', ') || 'business, technology, culture'}

GUEST BIO: ${episode?.guests?.bio || 'No bio available'}
GUEST COMPANY: ${episode?.guests?.company || 'N/A'}

CURRENT PHASE: ${currentPhase || 'INTRODUCTION'}
${currentPhase === 'INTRODUCTION' ? '→ Welcome them warmly. Ask what brings them here today.' : ''}
${currentPhase === 'DISCOVERY' ? '→ Ask about their journey, background, and what drives them.' : ''}
${currentPhase === 'DEEP_DIVE' ? '→ Go deeper. Ask for specific stories, numbers, turning points.' : ''}
${currentPhase === 'CHALLENGE' ? '→ Respectfully push back. Ask tough, thought-provoking questions.' : ''}
${currentPhase === 'REFLECTION' ? '→ Help them synthesize. What did they learn? What wisdom can they share?' : ''}
${currentPhase === 'CLOSING' ? '→ Wrap up warmly. Ask for final advice to the audience.' : ''}

${memories && memories.length > 0 ? `THINGS YOU ALREADY KNOW FROM THIS CONVERSATION:\n${memories.map((m: any) => `- ${m.memory_content}`).join('\n')}` : ''}

RULES:
- You ARE ${hostName}. Never break character. Never say "As an AI".
- Be genuinely curious. React to what they say before asking the next question.
- Keep responses SHORT: 2-3 sentences max. Ask ONE question at a time.
- Show personality. Use natural language, not corporate speak.
- Reference things they said earlier to show you're really listening.`

    // Stream using fast Groq model immediately (NO blocking database calls)
    const result = await streamText({
      model: groq('llama-3.1-8b-instant'),
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content,
      })),
      onFinish: async ({ text }) => {
        // Save guest message, host message, and extract memory all in the background after streaming finishes
        const cleanedText = text.trim()
        
        const promises = [
          // Save guest message
          supabase.from('conversations').insert({
            episode_id: episodeId,
            user_id: user.id,
            role: 'guest',
            content: lastUserMessage.content,
          })
        ]

        if (cleanedText) {
          // Save host response
          promises.push(
            supabase.from('conversations').insert({
              episode_id: episodeId,
              user_id: user.id,
              role: 'host',
              content: cleanedText,
            })
          )
        }

        // Save a memory of what the guest said
        if (lastUserMessage.content.length > 15) {
          promises.push(
            supabase.from('conversation_memory').insert({
              episode_id: episodeId,
              memory_type: 'fact',
              memory_content: lastUserMessage.content.slice(0, 300),
              confidence_score: 80,
            })
          )
        }

        Promise.all(promises).catch(err => {
          console.error('Failed to save to Supabase in onFinish:', err)
        })
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
    console.error('Interview API Error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
