import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Target, RefreshCcw, Cpu, CheckCircle2 } from 'lucide-react'
import { submitHumanScore } from './actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default async function InterviewReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: episode } = await supabase
    .from('episodes')
    .select('*, hosts(name), guests(name), conversations(*, conversation_metrics(*)), conversation_memory(*), curiosity_targets(*), human_interview_scores(*)')
    .eq('id', id)
    .single()

  if (!episode) redirect('/admin/interview-audit')

  const conversations = episode.conversations?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []

  const replayTimeline = []
  for (let i = 0; i < conversations.length; i++) {
    if (conversations[i].role === 'guest') {
      const guestMsg = conversations[i]
      let nextHostMsg = null
      if (i + 1 < conversations.length && conversations[i+1].role === 'host') {
        nextHostMsg = conversations[i+1]
        i++
      }
      replayTimeline.push({ guestMsg, metrics: guestMsg.conversation_metrics?.[0], hostMsg: nextHostMsg })
    } else {
      replayTimeline.push({ guestMsg: null, metrics: null, hostMsg: conversations[i] })
    }
  }

  const humanScore = episode.human_interview_scores?.[0] || {}
  let pilotData: any = {}
  if (humanScore.reviewer_notes) {
    try { pilotData = JSON.parse(humanScore.reviewer_notes) } catch (e) {}
  }

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div className="flex items-center gap-4">
        <Link href="/admin/interview-audit">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Audit: {episode.title}</h1>
          <p className="text-zinc-400 mt-2">Human Pilot Program Validation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* REPLAY TIMELINE */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" /> Timeline Replay
          </h2>
          <div className="space-y-6">
            {replayTimeline.map((step, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
                {step.guestMsg && (
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase">Guest ({(episode.guests as any)?.name})</span>
                    <div className="bg-zinc-800 rounded-lg p-3 mt-1 text-zinc-200">{step.guestMsg.message}</div>
                  </div>
                )}
                {step.metrics && (
                  <div className="pl-6 border-l-2 border-purple-500/30 py-1">
                    <Badge variant="outline" className="text-xs bg-purple-950/20 text-purple-400 border-purple-900/50">Strategy Evaluation Rendered</Badge>
                  </div>
                )}
                {step.hostMsg && (
                  <div>
                    <div className="flex justify-between items-center mt-2 mb-1">
                      <span className="text-xs font-semibold text-blue-500 uppercase">Host ({(episode.hosts as any)?.name})</span>
                      <Badge className="bg-blue-900 text-blue-100">{step.hostMsg.response_strategy || 'HOST'}</Badge>
                    </div>
                    <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-3 text-zinc-100">{step.hostMsg.message}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* HUMAN PILOT FORM */}
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 sticky top-8">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500" /> Human Pilot Evaluation Form
              </CardTitle>
              <CardDescription className="text-zinc-400">Strictly log real-world user feedback for this episode.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form action={submitHumanScore} className="space-y-6">
                <input type="hidden" name="episode_id" value={episode.id} />
                
                <div className="grid grid-cols-3 gap-4 pb-4 border-b border-zinc-800">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Memory Score</Label>
                    <Input type="number" name="memory_score" min="0" max="100" defaultValue={humanScore.memory_score} className="bg-zinc-950 border-zinc-800" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Curiosity Score</Label>
                    <Input type="number" name="curiosity_score" min="0" max="100" defaultValue={humanScore.curiosity_score} className="bg-zinc-950 border-zinc-800" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-emerald-400 font-bold">Overall Score</Label>
                    <Input type="number" name="overall_score" min="0" max="100" defaultValue={humanScore.overall_score} className="bg-zinc-950 border-emerald-900/50" required />
                  </div>
                  
                  {/* Hidden required fields for other scores to avoid clutter */}
                  <input type="hidden" name="personality_score" value={humanScore.personality_score || 80} />
                  <input type="hidden" name="progression_score" value={humanScore.progression_score || 80} />
                  <input type="hidden" name="depth_score" value={humanScore.depth_score || 80} />
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-emerald-400">Product-Market Signal</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Interview Rating (1-10)</Label>
                      <Input type="number" name="interview_rating" min="1" max="10" defaultValue={pilotData.rating} className="bg-zinc-950 border-zinc-800" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Host Satisfaction (CRITICAL)</Label>
                      <select name="host_satisfaction" defaultValue={pilotData.host_satisfaction || ''} className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" required>
                        <option value="" disabled>Select option...</option>
                        <option value="Definitely">Definitely would use</option>
                        <option value="Probably">Probably would use</option>
                        <option value="Maybe">Maybe</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Would Use Again?</Label>
                      <select name="would_use_again" defaultValue={pilotData.would_use_again ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Would Recommend?</Label>
                      <select name="would_recommend" defaultValue={pilotData.would_recommend ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Most Memorable Question Asked by AI</Label>
                    <Input name="most_memorable_question" defaultValue={pilotData.most_memorable_question} className="bg-zinc-950 border-zinc-800" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Most Generic/Boring Question</Label>
                    <Input name="most_generic_question" defaultValue={pilotData.most_generic_question} className="bg-zinc-950 border-zinc-800" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Moment AI Felt Human</Label>
                      <Input name="moment_human" defaultValue={pilotData.moment_human} className="bg-zinc-950 border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Moment AI Felt Artificial</Label>
                      <Input name="moment_artificial" defaultValue={pilotData.moment_artificial} className="bg-zinc-950 border-zinc-800" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Additional Notes</Label>
                    <Textarea name="additional_notes" defaultValue={pilotData.additional_notes} className="bg-zinc-950 border-zinc-800 min-h-[80px]" />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Save Human Pilot Evaluation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
