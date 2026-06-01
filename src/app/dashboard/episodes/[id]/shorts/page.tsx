import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowLeft, Video, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShortsList } from './shorts-list'
import { detectCandidateClips } from '@/lib/video/shorts/detector'

export default async function ShortsStudioPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 1. Fetch episode data
  const { data: episode } = await supabase
    .from('episodes')
    .select('*, hosts(*), guests(*)')
    .eq('id', params.id)
    .single()

  if (!episode) {
    redirect('/dashboard/episodes')
  }

  // 2. Fetch existing clips from DB
  const { data: existingClips } = await supabase
    .from('clip_candidates')
    .select('*, viral_moments(*)')
    .eq('episode_id', params.id)
    .order('created_at', { ascending: false })

  const { data: renders } = await supabase
    .from('short_video_renders')
    .select('*')
    // We would filter by clip_candidate_ids here, but keeping it simple for MVP

  // 3. For the MVP / Demo, if no clips exist, we'll auto-generate them here
  // In a real app, this should be done in a background job after the episode finishes
  let candidatesToDisplay = existingClips || []

  if (candidatesToDisplay.length === 0) {
    // We need transcripts and metrics to auto-detect
    const { data: transcripts } = await supabase.from('transcripts').select('*').eq('episode_id', params.id).order('start_time', { ascending: true })
    const { data: metrics } = await supabase.from('conversation_metrics').select('*, conversations!inner(episode_id)').eq('conversations.episode_id', params.id)

    if (transcripts && metrics) {
      // Massage data for the detector
      const formattedTranscripts = transcripts.map(t => ({
        id: t.id,
        speaker_role: t.speaker_role as 'host'|'guest',
        text: t.text,
        start_time: t.start_time,
        end_time: t.end_time
      }))
      
      const formattedMetrics = metrics.map(m => ({
        message_id: m.message_id,
        curiosity_score: m.curiosity_score || 0,
        emotional_intensity: m.emotional_intensity || 0,
        importance_score: m.importance_score || 0
      }))

      const detected = detectCandidateClips(formattedTranscripts, formattedMetrics)
      
      // Save detected clips to DB
      for (const clip of detected) {
        const { data: savedClip } = await supabase.from('clip_candidates').insert({
          episode_id: params.id,
          clip_type: clip.clip_type,
          start_time: clip.start_time,
          end_time: clip.end_time,
          transcript_segment: clip.transcript_segment,
          status: 'pending'
        }).select().single()

        if (savedClip) {
          // Calculate and save viral score
          // Simplified for MVP, we'll just inject the scores calculated in detection
          await supabase.from('viral_moments').insert({
            clip_candidate_id: savedClip.id,
            viral_score: Math.round(clip.metrics.emotion * 0.4 + clip.metrics.curiosity * 0.4 + clip.metrics.storyIntensity * 0.2),
            hook_strength: clip.metrics.curiosity,
            emotional_impact: clip.metrics.emotion,
            retention_potential: clip.metrics.storyIntensity
          })
          
          candidatesToDisplay.push({
            ...savedClip,
            viral_moments: [{ viral_score: Math.round(clip.metrics.emotion * 0.4 + clip.metrics.curiosity * 0.4 + clip.metrics.storyIntensity * 0.2) }]
          })
        }
      }
      
      // Sort newly inserted clips by score
      candidatesToDisplay.sort((a, b) => (b.viral_moments?.[0]?.viral_score || 0) - (a.viral_moments?.[0]?.viral_score || 0))
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/episodes/${params.id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            AI Shorts Generator
          </h1>
          <p className="text-muted-foreground text-sm">
            Viral moments automatically extracted from "{episode.title}"
          </p>
        </div>
      </div>

      {candidatesToDisplay.length > 0 ? (
        <ShortsList candidates={candidatesToDisplay} renders={renders || []} />
      ) : (
        <div className="bg-muted/20 border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No Clips Found</h2>
          <p className="text-muted-foreground max-w-md">
            We couldn't detect any highly viral moments in this episode yet. Ensure the episode has a complete transcript and conversation metrics generated.
          </p>
          <Button>
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Detection Again
          </Button>
        </div>
      )}
    </div>
  )
}
