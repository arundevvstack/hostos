import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, BarChart3, TrendingUp, Trophy, Target, Share2, Activity } from 'lucide-react'

export default async function EpisodeAnalyticsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const episodeId = params.id
  
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: episode } = await supabase
    .from('episodes')
    .select('*, hosts(*), guests(*)')
    .eq('id', episodeId)
    .single()

  if (!episode) {
    redirect('/dashboard/episodes')
  }

  // MVP Mock Data for the Scorecard
  const mockScorecard = {
    podcastScore: 88,
    socialScore: 92,
    growthScore: 85,
    publishingScore: 95
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 p-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/episodes`}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full h-10 w-10 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-[32px] font-bold tracking-tight text-foreground font-heading flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Content Scorecard
          </h2>
          <p className="text-muted-foreground mt-1 text-[16px] font-medium">Performance insights for "{episode.title}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-500 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Podcast Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{mockScorecard.podcastScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Top 12% of all episodes</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-transparent border-pink-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pink-500 flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Social Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{mockScorecard.socialScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Highly shareable clips</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Growth Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{mockScorecard.growthScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Strong subscriber conversion</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-500 flex items-center gap-2">
              <Target className="w-4 h-4" /> Publishing Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{mockScorecard.publishingScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Assets fully optimized</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Viral Insights
            </CardTitle>
            <CardDescription>AI analysis of why this episode performed well</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Common Hooks</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-secondary rounded-full text-xs">Counter-intuitive Advice</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs">Vulnerability</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs">High Stakes</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Emotional Patterns</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-xs">Frustration (Early)</span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs">Triumph (Climax)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" /> Host Performance
            </CardTitle>
            <CardDescription>How {episode.hosts?.[0]?.name || 'the host'} drove the conversation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Conversation Flow</span>
                <span className="text-muted-foreground">94/100</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '94%' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Curiosity Score</span>
                <span className="text-muted-foreground">98/100</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: '98%' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Memory Usage</span>
                <span className="text-muted-foreground">88/100</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: '88%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
