import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GuestIntelligenceSchema = z.object({
  careerSummary: z.string(),
  backgroundOverview: z.string(),
  interestingFacts: z.array(z.string()),
  potentialAngles: z.array(z.string()),
  suggestedDeepDives: z.array(z.string()),
  contradictionOpportunities: z.array(z.string()),
  curiosityOpportunities: z.array(z.string()),
  suggestedFollowUps: z.array(z.string()),
  riskAreas: z.array(z.string()),
  emotionalTriggers: z.array(z.string()),
  potentialViralMoments: z.array(z.string())
})

export async function runGuestResearchAgent(guestId: string) {
  try {
    // 1. Fetch guest data
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single()

    if (guestError || !guest) throw new Error('Guest not found')

    // 2. Create pending research record
    const { data: researchRecord, error: insertError } = await supabase
      .from('guest_research')
      .insert({
        guest_id: guestId,
        status: 'processing'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 3. Optional: In a full system, you would scrape the guest's LinkedIn/Twitter here
    // For now, we rely on the guest.bio and any social links provided in the guest record.
    const context = `
      Name: ${guest.name}
      Title: ${guest.title || 'N/A'}
      Company: ${guest.company || 'N/A'}
      Bio: ${guest.bio || 'N/A'}
      Social Links: ${guest.twitter_url ? 'Twitter: ' + guest.twitter_url : ''} ${guest.linkedin_url ? 'LinkedIn: ' + guest.linkedin_url : ''}
    `

    // 4. Run LLM extraction
    const { object } = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: GuestIntelligenceSchema,
      prompt: `
        You are a world-class Podcast Research Agent. Your job is to analyze a guest and generate a comprehensive intelligence report for the human or AI podcast host.
        
        Guest Information:
        ${context}
        
        Generate a highly actionable intelligence report containing:
        - Career summary and background overview
        - Interesting facts
        - Unique angles for the interview
        - Areas for deep dives
        - Contradiction opportunities (e.g. things they said vs things they did, or common industry contrarian takes they hold)
        - Curiosity opportunities (unexplored areas of their life/work)
        - Suggested follow-up questions
        - Risk areas (sensitive topics)
        - Emotional triggers (topics they are passionate about)
        - Potential viral moments
        
        If the bio is short, infer logically based on their title/company, but note it as speculative.
      `
    })

    // 5. Update research record
    await supabase
      .from('guest_research')
      .update({
        report_data: object,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', researchRecord.id)

    return { success: true, report: object }

  } catch (error) {
    console.error('Research Agent Error:', error)
    
    // Attempt to mark as failed
    try {
      await supabase
        .from('guest_research')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('guest_id', guestId)
        .eq('status', 'processing')
    } catch (e) {
      // ignore
    }

    return { success: false, error }
  }
}
