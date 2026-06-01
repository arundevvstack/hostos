import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Video, Users, Activity } from 'lucide-react'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Layout will also redirect, but we must prevent TypeError here
    return null;
  }

  // Fetch counts
  const [{ count: hostCount }, { count: episodeCount }, { count: guestCount }] = await Promise.all([
    supabase.from('hosts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('episodes').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
  ])

  const stats = [
    { title: 'Total Hosts', value: hostCount || 0, icon: <Mic className="h-4 w-4 text-zinc-400" /> },
    { title: 'Total Episodes', value: episodeCount || 0, icon: <Video className="h-4 w-4 text-zinc-400" /> },
    { title: 'Guests', value: guestCount || 0, icon: <Users className="h-4 w-4 text-zinc-400" /> },
    { title: 'Interviews Completed', value: 0, icon: <Activity className="h-4 w-4 text-zinc-400" /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-zinc-400">Welcome to your HostAI Podcast Studio overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-200">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-200">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-zinc-400 text-center py-10">
              No recent activity. Start by creating an AI Host!
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
