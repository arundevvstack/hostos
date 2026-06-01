import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InterviewRoomV2Wrapper from '@/components/interview/interview-room-v2'

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Fetch massive initial payload for the intelligence engine
  const { data: episode, error } = await supabase
    .from('episodes')
    .select(`
      *,
      hosts:host_id(*),
      guests:guest_id(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !episode) {
    console.error('Error fetching episode:', error)
    redirect('/dashboard/episodes')
  }

  // Fetch host DNA
  let hostDna = null
  if (episode.host_id) {
    const { data: dna } = await supabase
      .from('host_dna')
      .select('*')
      .eq('host_id', episode.host_id)
      .single()
    hostDna = dna
  }

  // Fetch current memory state
  const { data: memories } = await supabase
    .from('conversation_memory')
    .select('*')
    .eq('episode_id', id)
    .order('timestamp_reference', { ascending: false })

  // Fetch initial history
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('episode_id', id)
    .order('created_at', { ascending: true })

  // Fetch contradictions
  const { data: contradictions } = await supabase
    .from('contradictions')
    .select('*')
    .eq('episode_id', id)
    .eq('status', 'pending')

  // Fetch curiosity targets
  const { data: curiosityTargets } = await supabase
    .from('curiosity_targets')
    .select('*')
    .eq('episode_id', id)
    .eq('status', 'pending')

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] w-full flex overflow-hidden">
      <InterviewRoomV2Wrapper episode={episode} />
    </div>
  )
}
