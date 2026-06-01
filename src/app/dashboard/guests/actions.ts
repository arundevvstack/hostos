'use server'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createGuest(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const name = formData.get('name') as string
  const bio = formData.get('bio') as string
  const company = formData.get('company') as string
  const website = formData.get('website') as string
  const notes = formData.get('notes') as string

  const { error } = await supabase.from('guests').insert({
    user_id: user.id,
    name,
    bio,
    company,
    website,
    notes,
  })

  if (error) {
    console.error('Error creating guest:', error)
    throw new Error('Failed to create guest')
  }

  revalidatePath('/dashboard/guests')
  redirect('/dashboard/guests')
}

export async function deleteGuest(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('guests').delete().match({ id, user_id: user.id })

  if (error) {
    console.error('Error deleting guest:', error)
    throw new Error('Failed to delete guest')
  }

  revalidatePath('/dashboard/guests')
}

import { runGuestResearchAgent } from '@/lib/research/agent'

export async function runGuestResearch(guestId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Ensure user owns guest
  const { data: guest } = await supabase.from('guests').select('id').eq('id', guestId).eq('user_id', user.id).single()
  if (!guest) throw new Error('Unauthorized')

  await runGuestResearchAgent(guestId)

  revalidatePath(`/dashboard/guests/${guestId}`)
}

