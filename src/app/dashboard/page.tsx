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

  // Fetch profile to get first name
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Fetch counts
  const [{ count: hostCount }, { count: episodeCount }, { count: guestCount }] = await Promise.all([
    supabase.from('hosts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('episodes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const firstName = profile?.full_name?.split(' ')[0] || 'Founder'

  const stats = [
    { title: 'Hosts', value: hostCount || 0, icon: <Mic className="h-5 w-5 text-primary" /> },
    { title: 'Guests', value: guestCount || 0, icon: <Users className="h-5 w-5 text-primary" /> },
    { title: 'Episodes', value: episodeCount || 0, icon: <Video className="h-5 w-5 text-primary" /> },
    { title: 'Interviews', value: 0, icon: <Activity className="h-5 w-5 text-primary" /> },
  ]

  return (
    <div className="space-y-10">
      <div className="pt-4">
        <h2 className="text-[36px] font-bold text-foreground font-heading tracking-tight leading-tight">
          Good Morning, {firstName} <span className="text-3xl ml-1">👋</span>
        </h2>
        <p className="text-muted-foreground mt-3 text-[16px] max-w-2xl font-medium">
          Build, train and deploy AI podcast hosts that conduct world-class interviews.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card border-border shadow-sm rounded-[24px] hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-7 border-b border-border/40">
              <CardTitle className="text-[14px] font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className="h-10 w-10 rounded-[12px] bg-secondary flex items-center justify-center">
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent className="px-7 py-6">
              <div className="text-[40px] font-bold text-foreground font-heading tracking-tight leading-none">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border shadow-sm rounded-[24px]">
          <CardHeader className="border-b border-border p-6 px-7">
            <CardTitle className="text-xl font-bold text-foreground font-heading">Recent Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-7">
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="h-16 w-16 rounded-[16px] bg-secondary flex items-center justify-center mb-2">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground font-heading">No recent activity</h3>
              <p className="text-muted-foreground font-medium max-w-[260px]">
                Create your first AI host and start conducting intelligent interviews.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-card border-border shadow-sm rounded-[24px]">
          <CardHeader className="border-b border-border p-6 px-7">
            <CardTitle className="text-xl font-bold text-foreground font-heading">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-7 space-y-4">
             {/* Quick Actions place holder */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
