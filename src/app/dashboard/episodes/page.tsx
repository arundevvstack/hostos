import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Plus, Calendar, PlayCircle, CheckCircle2, Clock } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Episodes</h2>
          <p className="text-zinc-400">Plan and manage your podcast episodes.</p>
        </div>
        <Link href="/dashboard/episodes/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Episode
          </Button>
        </Link>
      </div>

      {episodes?.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 text-center py-12">
          <CardContent className="flex flex-col items-center space-y-4">
            <Video className="h-12 w-12 text-zinc-600" />
            <div className="space-y-2">
              <h3 className="font-semibold text-xl text-zinc-200">No episodes created</h3>
              <p className="text-zinc-400 max-w-sm mx-auto">
                Schedule your first episode by pairing an AI host with a guest.
              </p>
            </div>
            <Link href="/dashboard/episodes/new">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white mt-4">
                Create your first Episode
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {episodes?.map((episode) => (
            <Card key={episode.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <CardTitle className="text-lg text-zinc-100 leading-tight">{episode.title}</CardTitle>
                    <CardDescription className="text-zinc-400">
                      With {(episode.guests as any)?.name || 'TBD'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1.5 shrink-0 bg-zinc-950 border-zinc-800 text-zinc-300">
                    <StatusIcon status={episode.status} />
                    {episode.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-zinc-500">Host: </span>
                    <span className="text-zinc-300">{(episode.hosts as any)?.name || 'Unassigned'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-zinc-500">Topic: </span>
                    <span className="text-zinc-300 line-clamp-2">{episode.topic || 'No topic set'}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t border-zinc-800 mt-auto flex justify-between items-center">
                <span className="text-xs text-zinc-500">
                  {new Date(episode.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  {episode.status === 'Draft' || episode.status === 'Scheduled' ? (
                    <Link href={`/dashboard/interview/${episode.id}`}>
                      <Button variant="outline" size="sm" className="border-blue-500 text-blue-400 hover:bg-blue-950/30">
                        Enter Room
                      </Button>
                    </Link>
                  ) : null}
                  <form action={async () => {
                    'use server'
                    await deleteEpisode(episode.id)
                  }}>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/30">
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
