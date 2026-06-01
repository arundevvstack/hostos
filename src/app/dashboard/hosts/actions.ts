'use server'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createHost(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
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

  const voiceProvider = formData.get('voice_provider') as string || 'browser'
  const voiceId = formData.get('voice_id') as string || null
  const voiceRate = parseFloat(formData.get('voice_rate') as string) || 1.0
  const voicePitch = parseFloat(formData.get('voice_pitch') as string) || 1.0
  const voiceVolume = parseFloat(formData.get('voice_volume') as string) || 1.0

  const { data, error } = await supabase.from('hosts').insert({
    user_id: user.id,
    name,
    description,
    interview_style: interviewStyle,
    tone_of_voice: toneOfVoice,
    system_prompt: systemPrompt,
    expertise_areas: expertiseAreas,
    personality_traits: personalityTraits,
    voice_provider: voiceProvider,
    voice_id: voiceId === 'default' ? null : voiceId,
    voice_rate: voiceRate,
    voice_pitch: voicePitch,
    voice_volume: voiceVolume,
  }).select().single()

  if (error) {
    console.error('Error creating host:', error)
    throw new Error('Failed to create host')
  }

  const avatarProvider = formData.get('avatar_provider') as string || 'none'
  const avatarId = formData.get('avatar_id') as string || ''
  const avatarGestureStyle = formData.get('avatar_gesture_style') as string || 'neutral'

  if (avatarProvider !== 'none') {
    await supabase.from('avatar_profiles').insert({
      entity_type: 'host',
      entity_id: data.id,
      provider: avatarProvider,
      provider_avatar_id: avatarId,
      gesture_style: avatarGestureStyle,
    })
  }

  revalidatePath('/dashboard/hosts')
  redirect('/dashboard/hosts')
}

export async function deleteHost(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
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

export async function updateHost(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const interviewStyle = formData.get('interview_style') as string
  const toneOfVoice = formData.get('tone_of_voice') as string
  const systemPrompt = formData.get('system_prompt') as string
  
  const expertiseAreas = (formData.get('expertise_areas') as string)?.split(',').map(s => s.trim()).filter(Boolean) || []
  const personalityTraits = (formData.get('personality_traits') as string)?.split(',').map(s => s.trim()).filter(Boolean) || []

  const voiceProvider = formData.get('voice_provider') as string || 'browser'
  const voiceId = formData.get('voice_id') as string || null
  const voiceRate = parseFloat(formData.get('voice_rate') as string) || 1.0
  const voicePitch = parseFloat(formData.get('voice_pitch') as string) || 1.0
  const voiceVolume = parseFloat(formData.get('voice_volume') as string) || 1.0

  const { error } = await supabase.from('hosts').update({
    name,
    description,
    interview_style: interviewStyle,
    tone_of_voice: toneOfVoice,
    system_prompt: systemPrompt,
    expertise_areas: expertiseAreas,
    personality_traits: personalityTraits,
    voice_provider: voiceProvider,
    voice_id: voiceId === 'default' ? null : voiceId,
    voice_rate: voiceRate,
    voice_pitch: voicePitch,
    voice_volume: voiceVolume,
  }).match({ id, user_id: user.id })

  if (error) {
    console.error('Error updating host:', error)
    throw new Error('Failed to update host')
  }

  const avatarProvider = formData.get('avatar_provider') as string || 'none'
  const avatarId = formData.get('avatar_id') as string || ''
  const avatarGestureStyle = formData.get('avatar_gesture_style') as string || 'neutral'

  if (avatarProvider !== 'none') {
    const { data: existingAvatar } = await supabase.from('avatar_profiles').select('id').eq('entity_type', 'host').eq('entity_id', id).maybeSingle()
    if (existingAvatar) {
      await supabase.from('avatar_profiles').update({
        provider: avatarProvider,
        provider_avatar_id: avatarId,
        gesture_style: avatarGestureStyle,
        updated_at: new Date().toISOString(),
      }).eq('id', existingAvatar.id)
    } else {
      await supabase.from('avatar_profiles').insert({
        entity_type: 'host',
        entity_id: id,
        provider: avatarProvider,
        provider_avatar_id: avatarId,
        gesture_style: avatarGestureStyle,
      })
    }
  } else {
    // If set to 'none', delete the existing avatar profile if it exists
    await supabase.from('avatar_profiles').delete().eq('entity_type', 'host').eq('entity_id', id)
  }

  revalidatePath('/dashboard/hosts')
  redirect('/dashboard/hosts')
}
