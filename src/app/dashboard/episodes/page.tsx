import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Plus, Calendar, PlayCircle, CheckCircle2, Clock, Sparkles, BarChart3 } from 'lucide-react'
import { deleteEpisode } from './actions'
import { Badge } from '@/components/ui/badge'

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'Draft': return <Clock className="w-4 h-4 text-zinc-500" />
    case 'Scheduled': return <Calendar className="w-4 h-4 text-blue-500" />
    case 'Recording': return <PlayCircle className="w-4 h-4 text-red-500 animate-pulse" />
    case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    default: return null
  }
}

export default async function EpisodesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: episodes } = await supabase
    .from('episodes')
    .select(`
      *,
      hosts(name),
      guests(name)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[32px] font-bold tracking-tight text-foreground font-heading">Episodes</h2>
          <p className="text-muted-foreground mt-1 font-medium">Plan and manage your podcast episodes.</p>
        </div>
        <Link href="/dashboard/episodes/new">
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-full h-[48px] px-8 shadow-sm font-semibold transition-all">
            <Plus className="mr-2 h-5 w-5" />
            New Episode
          </Button>
        </Link>
      </div>

      {episodes?.length === 0 ? (
        <Card className="bg-card border-border shadow-sm rounded-[24px] text-center py-20">
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="h-24 w-24 bg-secondary rounded-[20px] flex items-center justify-center mb-2">
              <Video className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-[24px] text-foreground font-heading">No episodes created</h3>
              <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                Schedule your first episode by pairing an AI host with a guest.
              </p>
            </div>
            <Link href="/dashboard/episodes/new">
              <Button variant="outline" className="border-border text-foreground hover:bg-secondary hover:text-primary mt-6 rounded-[14px] h-[48px] px-8 font-semibold transition-all">
                Create your first Episode
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {episodes?.map((episode) => (
            <Card key={episode.id} className="bg-card border-border shadow-sm rounded-[24px] flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="p-7 pb-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 pr-4">
                    <CardTitle className="text-xl font-bold text-foreground font-heading leading-tight">{episode.title}</CardTitle>
                    <CardDescription className="text-muted-foreground font-semibold">
                      With {(episode.guests as any)?.name || 'TBD'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-2 shrink-0 bg-secondary border-border text-foreground shadow-sm px-3 py-1 font-semibold rounded-[8px]">
                    <StatusIcon status={episode.status} />
                    {episode.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 px-7">
                <div className="space-y-4 p-5 bg-secondary/50 rounded-[16px] border border-border">
                  <div className="text-[14px] flex items-center gap-3">
                    <span className="text-muted-foreground font-semibold w-12 shrink-0">Host:</span>
                    <span className="text-foreground font-bold">{(episode.hosts as any)?.name || 'Unassigned'}</span>
                  </div>
                  <div className="text-[14px] flex items-start gap-3">
                    <span className="text-muted-foreground font-semibold w-12 shrink-0">Topic:</span>
                    <span className="text-foreground font-medium line-clamp-2 leading-relaxed">{episode.topic || 'No topic set'}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-5 px-7 border-t border-border mt-3 flex justify-between items-center bg-secondary/30 rounded-b-[24px]">
                <span className="text-[13px] font-bold text-muted-foreground tracking-wide">
                  {new Date(episode.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  {episode.status === 'Draft' || episode.status === 'Scheduled' ? (
                    <Link href={`/dashboard/interview/${episode.id}`}>
                      <Button variant="outline" size="sm" className="border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 rounded-[10px] shadow-sm font-semibold px-4">
                        Enter Room
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href={`/dashboard/episodes/${episode.id}/studio`}>
                        <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-[10px] shadow-sm font-semibold px-4">
                          Studio
                        </Button>
                      </Link>
                      <Link href={`/dashboard/episodes/${episode.id}/video-studio`}>
                        <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-[10px] shadow-sm font-semibold px-4">
                          <Video className="w-4 h-4 mr-1.5" /> Video
                        </Button>
                      </Link>
                      {episode.status === 'Completed' && (
                        <>
                          <Link href={`/dashboard/episodes/${episode.id}/shorts`}>
                            <Button variant="outline" size="sm" className="border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-[10px] shadow-sm font-semibold px-4">
                              <Sparkles className="w-4 h-4 mr-1.5" /> Shorts
                            </Button>
                          </Link>
                          <Link href={`/dashboard/episodes/${episode.id}/analytics`}>
                            <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-[10px] shadow-sm font-semibold px-4">
                              <BarChart3 className="w-4 h-4 mr-1.5" /> Analytics
                            </Button>
                          </Link>
                        </>
                      )}
                    </>
                  )}
                  <form action={async () => {
                    'use server'
                    await deleteEpisode(episode.id)
                  }}>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-[10px] font-semibold px-4">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
