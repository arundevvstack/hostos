import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BarChart3, TrendingUp } from 'lucide-react'
import { RevenueMetricsWidget, PodcastMetricsWidget, ShortsMetricsWidget, HostMetricsWidget, AIRecommendationEngine } from './components/DashboardCharts'

export default async function AnalyticsDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // We fetch high level metrics here. For the MVP, we rely on the mock data in the charts
  // if the database tables (podcast_analytics, etc) are empty.
  
  return (
    <div className="max-w-[1200px] mx-auto space-y-8 p-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-[32px] font-bold tracking-tight text-foreground font-heading">
            Growth Dashboard
          </h2>
          <p className="text-muted-foreground mt-1 text-[16px] font-medium">
            Measure and scale your podcast audience.
          </p>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RevenueMetricsWidget />
        
        <div className="md:col-span-2">
          <AIRecommendationEngine />
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Episode Chart */}
        <PodcastMetricsWidget />

        {/* Shorts Distribution */}
        <div className="lg:col-span-1 space-y-6">
          <ShortsMetricsWidget />
          <HostMetricsWidget />
        </div>
      </div>
    </div>
  )
}
