import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Server, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default async function ProviderHealthDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: providers, error } = await supabase
    .from('provider_health')
    .select('*')
    .order('provider_name')

  if (error) {
    console.error('Failed to load provider health:', error)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'degraded': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'down': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'maintenance': return 'bg-blue-50 text-blue-700 border-blue-200'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Provider Health</h1>
          <p className="text-muted-foreground">Monitor the status and performance of third-party rendering APIs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers?.map((provider) => (
          <Card key={provider.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${
              provider.status === 'operational' ? 'bg-emerald-500' :
              provider.status === 'degraded' ? 'bg-amber-500' :
              provider.status === 'maintenance' ? 'bg-blue-500' : 'bg-destructive'
            }`} />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl capitalize flex items-center gap-2">
                  <Server className="w-5 h-5 text-muted-foreground" />
                  {provider.provider_name.replace('_', ' ')}
                </CardTitle>
                <Badge variant="outline" className={getStatusColor(provider.status)}>
                  {provider.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Success Rate</span>
                  <div className="flex items-center gap-1.5">
                    {provider.success_rate >= 95 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xl font-bold">{provider.success_rate}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Avg Render Time</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xl font-bold">{provider.average_render_time_seconds}s</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Renders: </span>
                  <span className="font-semibold">{provider.total_renders}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed: </span>
                  <span className="font-semibold text-destructive">{provider.failed_renders}</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-center pt-2">
                Last checked: {new Date(provider.last_checked).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!providers || providers.length === 0) && (
          <div className="col-span-full text-center p-12 bg-secondary/20 rounded-xl border border-dashed">
            <p className="text-muted-foreground">No provider health data available. Have you run the database migration?</p>
          </div>
        )}
      </div>
    </div>
  )
}
