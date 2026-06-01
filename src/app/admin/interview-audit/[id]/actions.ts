'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitHumanScore(formData: FormData) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const episodeId = formData.get('episode_id') as string
  const memoryScore = parseInt(formData.get('memory_score') as string)
  const curiosityScore = parseInt(formData.get('curiosity_score') as string)
  const personalityScore = parseInt(formData.get('personality_score') as string)
  const progressionScore = parseInt(formData.get('progression_score') as string)
  const depthScore = parseInt(formData.get('depth_score') as string)
  const overallScore = parseInt(formData.get('overall_score') as string)
  
  // Parse Pilot Program JSON Data
  const pilotData = {
    rating: parseInt(formData.get('interview_rating') as string) || null,
    would_use_again: formData.get('would_use_again') === 'true',
    would_recommend: formData.get('would_recommend') === 'true',
    host_satisfaction: formData.get('host_satisfaction') as string,
    most_memorable_question: formData.get('most_memorable_question') as string,
    most_generic_question: formData.get('most_generic_question') as string,
    moment_human: formData.get('moment_human') as string,
    moment_artificial: formData.get('moment_artificial') as string,
    additional_notes: formData.get('additional_notes') as string
  }

  const { error } = await supabase.from('human_interview_scores').upsert({
    episode_id: episodeId,
    memory_score: memoryScore,
    curiosity_score: curiosityScore,
    personality_score: personalityScore,
    progression_score: progressionScore,
    depth_score: depthScore,
    overall_score: overallScore,
    reviewer_notes: JSON.stringify(pilotData),
    reviewed_by: user.id
  })

  if (error) {
    console.error('Error submitting human score:', error)
    throw new Error('Failed to save score')
  }

  revalidatePath(`/admin/interview-audit/${episodeId}`)
}
