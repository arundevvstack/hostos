import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, Target, MemoryStick, Activity, BarChart2 } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function InterviewAuditDashboard() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Fetch episodes with relationships
  const { data: episodes } = await supabase
    .from('episodes')
    .select(`
      id, title, status, current_phase, created_at,
      hosts(name),
      guests(name),
      conversations(role, response_strategy, referenced_memory_ids),
      conversation_memory(id),
      curiosity_targets(id),
      contradictions(id),
      final_interview_scores(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const stats = episodes?.map(ep => {
    const hostMessages = ep.conversations?.filter((c: any) => c.role === 'host') || []
    const totalMessages = ep.conversations?.length || 0
    const memoriesExtracted = ep.conversation_memory?.length || 0
    const curiosityTargets = ep.curiosity_targets?.length || 0
    const contradictions = ep.contradictions?.length || 0
    
    // Memory Utilization
    const referencedMemoryIds = new Set()
    hostMessages.forEach((m: any) => {
      if (m.referenced_memory_ids) {
        m.referenced_memory_ids.forEach((id: string) => referencedMemoryIds.add(id))
      }
    })
    const memoriesReferenced = referencedMemoryIds.size
    const memoryUtilization = memoriesExtracted > 0 ? Math.round((memoriesReferenced / memoriesExtracted) * 100) : 0

    // Follow-up Ratio
    const followupCount = hostMessages.filter((m: any) => 
      ['FOLLOW_UP', 'CLARIFY', 'STORY_EXTRACTION'].includes(m.response_strategy)
    ).length
    const followupRatio = hostMessages.length > 0 ? Math.round((followupCount / hostMessages.length) * 100) : 0

    return {
      ...ep,
      totalMessages,
      hostMessages: hostMessages.length,
      memoriesExtracted,
      memoriesReferenced,
      memoryUtilization,
      curiosityTargets,
      contradictions,
      followupRatio,
      scores: ep.final_interview_scores?.[0] || {}
    }
  }) || []

  // Global KPIs
  const globalOverallScore = stats.length > 0 ? Math.round(stats.reduce((acc, ep) => acc + (ep.scores.overall_score || 0), 0) / stats.length) : 0
  const globalMemoryScore = stats.length > 0 ? Math.round(stats.reduce((acc, ep) => acc + (ep.scores.memory_score || 0), 0) / stats.length) : 0
  const globalCuriosityScore = stats.length > 0 ? Math.round(stats.reduce((acc, ep) => acc + (ep.scores.curiosity_score || 0), 0) / stats.length) : 0
  const globalFollowupRatio = stats.length > 0 ? Math.round(stats.reduce((acc, ep) => acc + ep.followupRatio, 0) / stats.length) : 0

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div>
        <h1 className="text-3xl font-bold">QA Dashboard: Pilot Validation</h1>
        <p className="text-zinc-400 mt-2">Audit interview quality, evaluate AI performance, and track pilot success metrics.</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Avg Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${globalOverallScore >= 80 ? 'text-emerald-500' : 'text-orange-500'}`}>
              {globalOverallScore}/100
            </div>
            <p className="text-xs text-zinc-500 mt-1">Target: &gt;= 80</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Avg Memory Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${globalMemoryScore >= 70 ? 'text-emerald-500' : 'text-orange-500'}`}>
              {globalMemoryScore}/100
            </div>
            <p className="text-xs text-zinc-500 mt-1">Target: &gt;= 70</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Avg Curiosity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${globalCuriosityScore >= 75 ? 'text-emerald-500' : 'text-orange-500'}`}>
              {globalCuriosityScore}/100
            </div>
            <p className="text-xs text-zinc-500 mt-1">Target: &gt;= 75</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Avg Follow-Up Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${globalFollowupRatio >= 70 ? 'text-emerald-500' : 'text-red-500'}`}>
              {globalFollowupRatio}%
            </div>
            <p className="text-xs text-zinc-500 mt-1">Target: &gt;= 70%</p>
          </CardContent>
        </Card>
      </div>

      {/* Episode List */}
      <h2 className="text-xl font-bold mt-8 mb-4">Pilot Episodes</h2>
      <div className="grid grid-cols-1 gap-4">
        {stats.map(ep => (
          <Link key={ep.id} href={`/admin/interview-audit/${ep.id}`}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{ep.title}</h3>
                      <Badge variant="outline" className="bg-zinc-950 text-zinc-400">{ep.current_phase}</Badge>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">
                      <span className="text-zinc-300 font-medium">{(ep.hosts as any)?.name}</span> interviewing <span className="text-zinc-300 font-medium">{(ep.guests as any)?.name}</span>
                    </p>
                  </div>
                  
                  <div className="flex gap-8 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 flex items-center gap-1"><MemoryStick className="w-3 h-3" /> Memory Util</span>
                      <span className={`font-semibold ${ep.memoryUtilization >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {ep.memoriesReferenced} / {ep.memoriesExtracted} ({ep.memoryUtilization}%)
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 flex items-center gap-1"><Target className="w-3 h-3" /> Follow-Up Ratio</span>
                      <span className={`font-semibold ${ep.followupRatio >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ep.followupRatio}%
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Final Score</span>
                      <span className={`font-bold ${ep.scores.overall_score >= 80 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                        {ep.scores.overall_score ? `${ep.scores.overall_score}/100` : 'Not Scored'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {stats.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No episodes recorded yet. Start an interview to begin pilot validation.
          </div>
        )}
      </div>
    </div>
  )
}
