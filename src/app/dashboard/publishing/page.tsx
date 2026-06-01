'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Loader2, Calendar, Clock, CheckCircle2, AlertTriangle, 
  RefreshCw, PlayCircle, Globe, Mail, Podcast, Share2, Server
} from 'lucide-react'

export default function GlobalPublishingHub() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<any[]>([])
  const [runningWorker, setRunningWorker] = useState(false)

  useEffect(() => {
    fetchQueue()
  }, [])

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/publishing/queue')
      if (!res.ok) throw new Error('Failed to load queue')
      const data = await res.json()
      setJobs(data || [])
    } catch (err) {
      toast.error('Failed to load publishing queue')
    } finally {
      setLoading(false)
    }
  }

  const runWorker = async (jobId?: string) => {
    setRunningWorker(true)
    const toastId = toast.loading(jobId ? 'Publishing selected asset...' : 'Executing queue worker...')
    try {
      const res = await fetch('/api/publishing/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobId ? { job_id: jobId } : {})
      })

      if (!res.ok) throw new Error('Worker run failed')
      const data = await res.json()
      
      toast.dismiss(toastId)
      toast.success(jobId ? 'Asset published successfully!' : `Queue execution finished. Processed ${data.processed?.length || 0} jobs.`)
      fetchQueue()
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Queue execution failed')
    } finally {
      setRunningWorker(false)
    }
  }

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  // Calculate Metrics
  const activeCount = jobs.filter(j => j.status === 'queued' || j.status === 'publishing').length
  const publishedCount = jobs.filter(j => j.status === 'published').length
  const failedCount = jobs.filter(j => j.status === 'failed').length
  const successRate = publishedCount + failedCount > 0 
    ? Math.round((publishedCount / (publishedCount + failedCount)) * 100) 
    : 100

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'rss': return <Podcast className="h-4 w-4 text-emerald-600" />
      case 'spotify': return <Podcast className="h-4 w-4 text-green-500" />
      case 'apple': return <Podcast className="h-4 w-4 text-purple-500" />
      case 'linkedin': return <Share2 className="h-4 w-4 text-blue-600" />
      case 'x': return <Share2 className="h-4 w-4 text-foreground" />
      case 'web': return <Globe className="h-4 w-4 text-indigo-600" />
      case 'email': return <Mail className="h-4 w-4 text-rose-500" />
      default: return <Server className="h-4 w-4 text-zinc-500" />
    }
  }

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>
      case 'review': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Review</Badge>
      case 'queued': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>
      case 'publishing': return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse">Publishing</Badge>
      case 'published': return <Badge className="bg-green-50 text-green-700 border-green-200">Published</Badge>
      case 'failed': return <Badge variant="destructive">Failed</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Simulated Calendar Data
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  // Group jobs by day of week for the visual calendar
  const groupedByDay = daysOfWeek.map((day, idx) => {
    // Just simulate grouping based on job id or dates for visualization since actual dates can vary
    const dayJobs = jobs.filter(j => {
      if (!j.scheduled_for) return false
      const jobDay = new Date(j.scheduled_for).getDay()
      // JS getDay() returns 0 for Sunday, 1 for Monday...
      const mappedIdx = jobDay === 0 ? 6 : jobDay - 1
      return mappedIdx === idx
    })
    return { day, jobs: dayJobs }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Publishing OS</h1>
          <p className="text-muted-foreground mt-1">Global orchestrator for multi-channel distribution queues and release schedules</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchQueue} className="rounded-xl">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => runWorker()} disabled={runningWorker} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm font-semibold transition-all">
            {runningWorker ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Execute Queue Worker
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="rounded-2xl border-border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground font-heading">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Assets scheduled or publishing</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Successfully Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground font-heading">{publishedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Live distribution links live</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Failed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground font-heading">{failedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires user intervention</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground font-heading">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Simulation distribution quality</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Active Queue list */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[24px] border-border shadow-sm bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-heading flex items-center gap-2"><Clock className="h-5 w-5 text-indigo-500" /> Live Distribution Queue</CardTitle>
              <CardDescription>Release queue and status log across all channels</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {jobs.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No publishing jobs scheduled yet. Generate and schedule assets from the Episode Publishing center.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-6 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{job.episodes?.title}</span>
                          <span className="text-zinc-300">•</span>
                          <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                            {getPlatformIcon(job.platform)}
                            {job.platform}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Scheduled for {new Date(job.scheduled_for).toLocaleString()} 
                          {job.metadata?.published_at && ` (Published: ${new Date(job.metadata.published_at).toLocaleTimeString()})`}
                        </p>
                        {job.metadata?.logs && (
                          <div className="text-[11px] p-2 bg-secondary/50 rounded-lg text-muted-foreground font-mono mt-2">
                            Log: {job.metadata.logs}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {getJobStatusBadge(job.status)}
                        {(job.status === 'queued' || job.status === 'failed') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => runWorker(job.id)} 
                            disabled={runningWorker}
                            className="rounded-xl"
                          >
                            Publish Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Visual Release Calendar */}
        <div className="space-y-6">
          <Card className="rounded-[24px] border-border shadow-sm bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-heading flex items-center gap-2"><Calendar className="h-5 w-5 text-emerald-500" /> Release Schedule</CardTitle>
              <CardDescription>Visual weekly distribution grid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedByDay.map(({ day, jobs: dayJobs }) => (
                <div key={day} className="space-y-1.5 pb-3 border-b border-border last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{day}</span>
                    {dayJobs.length > 0 && (
                      <Badge variant="secondary" className="h-5 text-[10px] px-1.5 font-semibold">
                        {dayJobs.length} scheduled
                      </Badge>
                    )}
                  </div>
                  
                  {dayJobs.length === 0 ? (
                    <div className="text-xs text-muted-foreground pl-1 italic">No releases scheduled</div>
                  ) : (
                    <div className="space-y-1">
                      {dayJobs.map((j) => {
                        const time = new Date(j.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        return (
                          <div key={j.id} className="text-xs p-2 bg-secondary/40 rounded-lg flex items-center justify-between border border-border">
                            <span className="truncate max-w-[120px] font-semibold">{j.episodes?.title}</span>
                            <span className="text-muted-foreground flex items-center gap-1 font-mono text-[10px]">
                              {time} • {j.platform.toUpperCase()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
