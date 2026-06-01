import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Video, Settings, Play, Camera, Film, Monitor } from 'lucide-react'
import { VideoStudioForm } from './video-studio-form'
import { MockBrandedPlayer } from '@/components/video/MockBrandedPlayer'

export default async function VideoStudioPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const episodeId = params.id

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // 1. Fetch Episode Data
  const { data: episode } = await supabase
    .from('episodes')
    .select('*, hosts(*), guests(*)')
    .eq('id', episodeId)
    .single()

  if (!episode) {
    redirect('/dashboard/episodes')
  }

  // 2. Fetch Studios
  const { data: studios } = await supabase.from('avatar_studios').select('*').order('name')

  // 3. Fetch Existing Video Project
  const { data: project } = await supabase
    .from('video_projects')
    .select('*')
    .eq('episode_id', episodeId)
    .maybeSingle()

  // 4. Fetch Renders
  const { data: renders } = await supabase
    .from('video_renders')
    .select('*')
    .eq('video_project_id', project?.id)
    .order('created_at', { ascending: false })

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
            <Video className="h-8 w-8 text-primary" />
            Avatar Video Studio
          </h2>
          <p className="text-muted-foreground mt-1 text-[16px] font-medium">Configure virtual sets and cameras for "{episode.title}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-border shadow-sm rounded-[24px]">
            <CardHeader className="border-b border-border bg-secondary/30 rounded-t-[24px]">
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> Project Settings
              </CardTitle>
              <CardDescription>Select your virtual studio and camera layout algorithm.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <VideoStudioForm 
                episodeId={episodeId}
                project={project}
                studios={studios || []}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-border shadow-sm rounded-[24px]">
            <CardHeader className="border-b border-border bg-secondary/30 rounded-t-[24px]">
              <CardTitle className="text-xl flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-500" /> Video Outputs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {!renders || renders.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">No videos rendered yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Configure your studio and trigger a render.</p>
                </div>
              ) : (
                renders.map(render => (
                  <div key={render.id} className="p-4 border border-border rounded-[16px] bg-secondary/20 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold capitalize">{render.format} Video</span>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-[6px] ${
                        render.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        render.status === 'processing' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {render.status}
                      </span>
                    </div>
                    {render.status === 'completed' && render.url === 'mock://branded-video' && (
                      <div className="mt-4 border border-border rounded-xl overflow-hidden shadow-sm">
                        <MockBrandedPlayer 
                          title={episode.title}
                          hostName={episode.hosts?.[0]?.name || 'HostAI'}
                          duration={render.duration}
                          format="landscape"
                        />
                      </div>
                    )}
                    {render.status === 'completed' && render.url && render.url !== 'mock://branded-video' && (
                      <Link href={render.url} target="_blank">
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <Play className="w-4 h-4 mr-2" /> Watch Video
                        </Button>
                      </Link>
                    )}
                    {render.status === 'failed' && (
                      <div className="p-3 mt-2 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 flex flex-col gap-2">
                        <p>A previous render attempt failed validation.</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 hover:bg-destructive/10">View Logs</Button>
                          <Button size="sm" variant="default" className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full">Retry Render</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
