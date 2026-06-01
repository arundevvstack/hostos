import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

export const maxDuration = 10

export async function POST(req: Request) {
  try {
    const { interimTranscript, transcriptHistory, hostDna, interruptBudget, isGuestSpeaking } = await req.json()

    // If budget exhausted, force Guest Continues
    if (interruptBudget.used >= interruptBudget.max) {
      return new Response(JSON.stringify({
        decision: 'GUEST_CONTINUES',
        trigger: 'BUDGET_EXHAUSTED',
        reasoning: 'Interruption budget exhausted.'
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    const systemPrompt = `You are the Turn Negotiation Engine for an AI Podcast Host.
The guest is currently speaking. 

Interim Transcript (what they just said): "${interimTranscript}"

Your Host DNA limits:
Curiosity: ${hostDna?.curiosity_level || 50}/100
Challenge: ${hostDna?.challenge_level || 50}/100
Interruption Tolerance: ${hostDna?.interruption_tendency || 50}/100

Decide if the Host should INTERRUPT the guest right now. 
Only interrupt if:
1. STORY_SPIKE: The guest just dropped a massive narrative hook (e.g. "We almost lost the company").
2. CONTRADICTION: The guest contradicted a known fact.
3. EMOTION_SPIKE: The guest became highly emotional.
4. CURIOSITY_SPIKE: A highly surprising metric or fact was stated.
5. CLARITY_FAILURE: The guest is rambling vaguely.

If none apply, or if the interruption tolerance is low, choose GUEST_CONTINUES.
DO NOT interrupt for minor points. The conversation flow must remain natural.
`

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: `Evaluate this interim transcript and decide whether to interrupt: "${interimTranscript}"`,
      schema: z.object({
        decision: z.enum(['HOST_INTERRUPTS', 'GUEST_CONTINUES']),
        trigger: z.enum(['STORY_SPIKE', 'CONTRADICTION', 'EMOTION_SPIKE', 'CURIOSITY_SPIKE', 'CLARITY_FAILURE', 'NONE']),
        reasoning: z.string()
      }),
    })

    return new Response(JSON.stringify(result.object), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Negotiator API Error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
