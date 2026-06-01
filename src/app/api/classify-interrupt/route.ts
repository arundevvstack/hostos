import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

export const maxDuration = 10

function calculateSimilarity(str1: string, str2: string) {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '')
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!s1 || !s2) return 0
  
  let matches = 0
  for (let i = 0; i < s1.length - 2; i++) {
    if (s2.includes(s1.substring(i, i + 3))) {
      matches++
    }
  }
  return Math.min(100, (matches / Math.max(s1.length, s2.length)) * 100 * 3)
}

export async function POST(req: Request) {
  try {
    const { interruptText, hostContext } = await req.json()

    // 1. Basic Self-Echo heuristic (text overlap)
    const selfEchoScore = calculateSimilarity(interruptText, hostContext)

    // 2. Classify intent via LLM
    const systemPrompt = `You are the Interruption Classifier for an AI podcast host.
The host was speaking, and the microphone picked up an interruption from the guest.

Host was saying: "${hostContext}"
Guest interrupt audio transcribed as: "${interruptText}"
Calculated Text Similarity Score (Self-Echo check): ${selfEchoScore.toFixed(1)}/100

Categorize the interruption. If the text similarity score is high (>60) and the text looks identical or like a garbled version of the host's words, classify it as "Self Echo".
If the text is very short (e.g. "hmm", "yeah", "right"), classify as "Backchannel" or "Agreement".
If it is ambient noise, classify as "Background Noise".

Categories:
- Agreement
- Backchannel
- Clarification
- Correction
- New Question
- Background Noise
- Self Echo

Determine Yield Decision based on rules:
- Backchannel, Agreement, Background Noise, Self Echo -> CONTINUE
- Clarification, New Question -> YIELD_AFTER_SENTENCE
- Correction -> YIELD_IMMEDIATELY
If it's an Urgent Interruption ("Hold on", "Stop"), yield immediately.
`

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: `Classify this interrupt: "${interruptText}"`,
      schema: z.object({
        intent: z.enum(['Agreement', 'Backchannel', 'Clarification', 'Correction', 'New Question', 'Background Noise', 'Self Echo']),
        yield_decision: z.enum(['CONTINUE', 'YIELD_AFTER_SENTENCE', 'YIELD_IMMEDIATELY']),
        confidence: z.number().min(0).max(100).describe('Confidence in classification from 0 to 100'),
        reasoning: z.string()
      }),
    })

    return new Response(JSON.stringify({
      classification: result.object,
      metrics: {
        selfEchoScore: selfEchoScore,
        interruptConfidence: result.object.confidence
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Classifier API Error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
