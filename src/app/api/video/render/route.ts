import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { generateDirectorEDL } from '@/lib/video/director'
import { HeyGenProvider } from '@/lib/video/providers/heygen'
import { validateVideoUrl } from '@/lib/video/validator'

export async function POST(req: Request) {
  try {
    const { episodeId, studioId, cameraLayout } = await req.json()

    if (!episodeId || !studioId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Get Project ID or verify it
    const { data: project } = await supabase.from('video_projects').select('id').eq('episode_id', episodeId).single()
    if (!project) {
      return NextResponse.json({ error: 'Video project not found' }, { status: 404 })
    }

    // 2. Fetch the episode and transcripts
    const { data: episode } = await supabase.from('episodes').select('*, hosts(*), guests(*)').eq('id', episodeId).single()
    const { data: transcripts } = await supabase.from('transcripts').select('*').eq('episode_id', episodeId).order('start_time', { ascending: true })

    // 3. Generate the Camera EDL based on transcript
    const segments = (transcripts || []).map((t: any) => ({
      speaker: t.speaker_role as 'host' | 'guest',
      text: t.text,
      duration: t.end_time - t.start_time
    }))

    const edl = generateDirectorEDL(segments, cameraLayout)
    
    // In a real implementation:
    // 4. Send audio parts to HeyGen
    // 5. Build final composite video in the cloud (e.g. AWS MediaConvert / Remotion / Shotstack)
    // Here we'll just simulate it with the HeyGenProvider
    
    const provider = new HeyGenProvider()
    const response = await provider.generateVideo({
      avatarId: 'simulated_avatar_id',
      audioUrl: 'simulated_audio_url'
    })

    // Validate video URL if completed
    let finalStatus = response.status
    if (finalStatus === 'completed' && response.videoUrl) {
      const isValid = await validateVideoUrl(response.videoUrl)
      if (!isValid) {
        finalStatus = 'failed'
      }
    }

    // 6. Save Render record
    const { error: insertError } = await supabase.from('video_renders').insert({
      video_project_id: project.id,
      format: 'landscape',
      status: finalStatus,
      duration: edl.totalDuration,
      url: finalStatus === 'failed' ? null : (response.videoUrl || null)
    })

    if (insertError) {
      console.error('Error inserting render:', insertError)
      return NextResponse.json({ error: 'Failed to create render record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Render queued successfully' })
  } catch (error) {
    console.error('Error in /api/video/render:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
