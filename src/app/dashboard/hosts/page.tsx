import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Plus } from 'lucide-react'
import { deleteHost } from './actions'

export default async function HostsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: hosts } = await supabase
    .from('hosts')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Hosts</h2>
          <p className="text-zinc-400">Manage your custom AI podcast hosts.</p>
        </div>
        <Link href="/dashboard/hosts/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Host
          </Button>
        </Link>
      </div>

      {hosts?.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 text-center py-12">
          <CardContent className="flex flex-col items-center space-y-4">
            <Mic className="h-12 w-12 text-zinc-600" />
            <div className="space-y-2">
              <h3 className="font-semibold text-xl text-zinc-200">No hosts created</h3>
              <p className="text-zinc-400 max-w-sm mx-auto">
                You haven't created any AI hosts yet. Create your first host to get started with interviews.
              </p>
            </div>
            <Link href="/dashboard/hosts/new">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white mt-4">
                Create your first Host
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hosts?.map((host) => (
            <Card key={host.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Mic className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-zinc-100">{host.name}</CardTitle>
                    <CardDescription className="text-zinc-400 line-clamp-1">{host.interview_style} Interviewer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-zinc-300 line-clamp-3">
                  {host.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {host.expertise_areas?.slice(0, 3).map((area: string) => (
                    <span key={area} className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 transition-colors">
                      {area}
                    </span>
                  ))}
                  {(host.expertise_areas?.length || 0) > 3 && (
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 transition-colors">
                      +{(host.expertise_areas?.length || 0) - 3} more
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="p-4 border-t border-zinc-800 mt-auto flex justify-end">
                <form action={async () => {
                  'use server'
                  await deleteHost(host.id)
                }}>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/30">
                    Delete
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
