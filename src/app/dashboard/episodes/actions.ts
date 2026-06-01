'use server'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEpisode(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const title = formData.get('title') as string
  const hostId = formData.get('host_id') as string
  const guestId = formData.get('guest_id') as string
  const topic = formData.get('topic') as string
  const status = formData.get('status') as string || 'Draft'

  const { error } = await supabase.from('episodes').insert({
    user_id: user.id,
    title,
    host_id: hostId || null,
    guest_id: guestId || null,
    topic,
    status,
  })

  if (error) {
    console.error('Error creating episode:', error)
    throw new Error('Failed to create episode')
  }

  revalidatePath('/dashboard/episodes')
  redirect('/dashboard/episodes')
}

export async function deleteEpisode(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('episodes').delete().match({ id, user_id: user.id })

  if (error) {
    console.error('Error deleting episode:', error)
    throw new Error('Failed to delete episode')
  }

  revalidatePath('/dashboard/episodes')
}
