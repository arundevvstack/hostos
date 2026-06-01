'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createHost(formData: FormData) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const interviewStyle = formData.get('interview_style') as string
  const toneOfVoice = formData.get('tone_of_voice') as string
  const systemPrompt = formData.get('system_prompt') as string
  
  const expertiseAreas = (formData.get('expertise_areas') as string)?.split(',').map(s => s.trim()).filter(Boolean) || []
  const personalityTraits = (formData.get('personality_traits') as string)?.split(',').map(s => s.trim()).filter(Boolean) || []

  const { data, error } = await supabase.from('hosts').insert({
    user_id: user.id,
    name,
    description,
    interview_style: interviewStyle,
    tone_of_voice: toneOfVoice,
    system_prompt: systemPrompt,
    expertise_areas: expertiseAreas,
    personality_traits: personalityTraits,
  }).select().single()

  if (error) {
    console.error('Error creating host:', error)
    throw new Error('Failed to create host')
  }

  revalidatePath('/dashboard/hosts')
  redirect('/dashboard/hosts')
}

export async function deleteHost(id: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('hosts').delete().match({ id, user_id: user.id })

  if (error) {
    console.error('Error deleting host:', error)
    throw new Error('Failed to delete host')
  }

  revalidatePath('/dashboard/hosts')
}
