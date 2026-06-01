import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, MessageSquare, Database, Target, Cpu, RefreshCcw, CheckCircle2 } from 'lucide-react'
import { submitHumanScore } from './actions'

export default async function InterviewReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: episode } = await supabase
    .from('episodes')
    .select(`
      *,
      hosts(name),
      guests(name),
      conversations(*, conversation_metrics(*)),
      conversation_memory(*),
      curiosity_targets(*),
      contradictions(*),
      human_interview_scores(*),
      ai_interview_scores(*)
    `)
    .eq('id', id)
    .single()

  if (!episode) redirect('/admin/interview-audit')

  const conversations = episode.conversations?.sort((a: any, b: any) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || []

  // Map messages to a replay timeline
  // A replay step: Guest Message -> AI Analysis metrics -> Host Response
  const replayTimeline = []
  for (let i = 0; i < conversations.length; i++) {
    if (conversations[i].role === 'guest') {
      const guestMsg = conversations[i]
      const metrics = guestMsg.conversation_metrics?.[0]
      
      // Look ahead for the immediate next host message
      let nextHostMsg = null
      if (i + 1 < conversations.length && conversations[i+1].role === 'host') {
        nextHostMsg = conversations[i+1]
        i++ // skip it in main loop since we pair it
      }

      // Find memories/targets created right after this guest message
      const timeWindowStart = new Date(guestMsg.created_at).getTime()
      const timeWindowEnd = nextHostMsg ? new Date(nextHostMsg.created_at).getTime() : Date.now()

      const createdMemories = episode.conversation_memory?.filter((m: any) => {
        const t = new Date(m.timestamp_reference || m.created_at).getTime()
        return t >= timeWindowStart && t <= timeWindowEnd
      })

      const createdTargets = episode.curiosity_targets?.filter((t: any) => {
        const tTime = new Date(t.created_at).getTime()
        return tTime >= timeWindowStart && tTime <= timeWindowEnd
      })

      replayTimeline.push({
        guestMsg,
        metrics,
        createdMemories,
        createdTargets,
        hostMsg: nextHostMsg
      })
    } else {
      // orphaned host message (e.g. host started the conversation)
      replayTimeline.push({
        guestMsg: null,
        metrics: null,
        createdMemories: [],
        createdTargets: [],
        hostMsg: conversations[i]
      })
    }
  }

  const humanScore = episode.human_interview_scores?.[0] || {}

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div className="flex items-center gap-4">
        <Link href="/admin/interview-audit">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Conversation Replay & Audit</h1>
          <p className="text-zinc-400 mt-2">Episode: {episode.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* REPLAY TIMELINE */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Timeline Replay
          </h2>
          
          <div className="space-y-8">
            {replayTimeline.map((step, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
                
                {/* GUEST MESSAGE */}
                {step.guestMsg && (
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase">Guest ({(episode.guests as any)?.name})</span>
                    <div className="bg-zinc-800 rounded-lg p-3 mt-1 text-zinc-200">
                      {step.guestMsg.message}
                    </div>
                  </div>
                )}

                {/* AI ANALYSIS BLOCK */}
                {step.metrics && (
                  <div className="pl-6 border-l-2 border-purple-500/30 space-y-3 py-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-purple-400 uppercase">
                      <Cpu className="h-4 w-4" /> AI Analysis Output
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="border-purple-900/50 bg-purple-950/20 text-purple-300">
                        Sentiment: {step.metrics.sentiment}
                      </Badge>
                      <Badge variant="outline" className="border-purple-900/50 bg-purple-950/20 text-purple-300">
                        Intensity: {step.metrics.emotional_intensity}
                      </Badge>
                      <Badge variant="outline" className="border-purple-900/50 bg-purple-950/20 text-purple-300">
                        Curiosity: {step.metrics.curiosity_score}
                      </Badge>
                    </div>

                    {step.createdMemories?.length > 0 && (
                      <div className="bg-zinc-950 rounded p-2 text-xs">
                        <strong className="text-zinc-400 block mb-1">Extracted Memories:</strong>
                        <ul className="list-disc pl-4 space-y-1 text-emerald-400">
                          {step.createdMemories.map((m: any) => (
                            <li key={m.id}>[{m.memory_type}] {m.memory_content}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {step.createdTargets?.length > 0 && (
                      <div className="bg-zinc-950 rounded p-2 text-xs">
                        <strong className="text-zinc-400 block mb-1">Curiosity Targets:</strong>
                        <ul className="list-disc pl-4 space-y-1 text-blue-400">
                          {step.createdTargets.map((t: any) => (
                            <li key={t.id}>{t.trigger_statement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* HOST RESPONSE */}
                {step.hostMsg && (
                  <div>
                    <div className="flex items-center justify-between mt-4 mb-1">
                      <span className="text-xs font-semibold text-blue-500 uppercase">Host Response ({(episode.hosts as any)?.name})</span>
                      <div className="flex gap-2">
                        <Badge className="bg-blue-900 text-blue-100">{step.hostMsg.response_strategy || 'UNKNOWN_STRATEGY'}</Badge>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400">{step.hostMsg.interview_phase}</Badge>
                      </div>
                    </div>
                    
                    <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-3 text-zinc-100">
                      {step.hostMsg.message}
                    </div>

                    {step.hostMsg.referenced_memory_ids?.length > 0 && (
                      <div className="mt-2 text-xs text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Referenced {step.hostMsg.referenced_memory_ids.length} memories in this response.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* HUMAN SCORING INTERFACE */}
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 sticky top-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Human Review Scoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={submitHumanScore} className="space-y-4">
                <input type="hidden" name="episode_id" value={episode.id} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Memory Score (0-100)</Label>
                    <Input type="number" name="memory_score" min="0" max="100" defaultValue={humanScore.memory_score} className="bg-zinc-950 border-zinc-800" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Curiosity Score (0-100)</Label>
                    <Input type="number" name="curiosity_score" min="0" max="100" defaultValue={humanScore.curiosity_score} className="bg-zinc-950 border-zinc-800" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Personality (0-100)</Label>
                    <Input type="number" name="personality_score" min="0" max="100" defaultValue={humanScore.personality_score} className="bg-zinc-950 border-zinc-800" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Progression (0-100)</Label>
                    <Input type="number" name="progression_score" min="0" max="100" defaultValue={humanScore.progression_score} className="bg-zinc-950 border-zinc-800" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Depth Score (0-100)</Label>
                    <Input type="number" name="depth_score" min="0" max="100" defaultValue={humanScore.depth_score} className="bg-zinc-950 border-zinc-800" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-emerald-400 font-bold">Overall Score (0-100)</Label>
                    <Input type="number" name="overall_score" min="0" max="100" defaultValue={humanScore.overall_score} className="bg-zinc-950 border-emerald-900/50 focus:border-emerald-500" required />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-zinc-400">Reviewer Notes</Label>
                  <Textarea name="reviewer_notes" defaultValue={humanScore.reviewer_notes} className="bg-zinc-950 border-zinc-800 min-h-[100px]" placeholder="Note any failure patterns or prompt weaknesses..." />
                </div>

                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold">
                  Save Audit Scores
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
