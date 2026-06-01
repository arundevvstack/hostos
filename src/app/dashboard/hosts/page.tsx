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
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[32px] font-bold tracking-tight text-foreground font-heading">AI Hosts</h2>
          <p className="text-muted-foreground mt-1 font-medium">Manage your custom AI podcast hosts.</p>
        </div>
        <Link href="/dashboard/hosts/new">
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-full h-[48px] px-8 shadow-sm font-semibold transition-all">
            <Plus className="mr-2 h-5 w-5" />
            Create Host
          </Button>
        </Link>
      </div>

      {hosts?.length === 0 ? (
        <Card className="bg-card border-border shadow-sm rounded-[24px] text-center py-20">
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="h-24 w-24 bg-secondary rounded-[20px] flex items-center justify-center mb-2">
              <Mic className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-[24px] text-foreground font-heading">No hosts created</h3>
              <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                You haven't created any AI hosts yet. Create your first host to get started with intelligent interviews.
              </p>
            </div>
            <Link href="/dashboard/hosts/new">
              <Button variant="outline" className="border-border text-foreground hover:bg-secondary hover:text-primary mt-6 rounded-[14px] h-[48px] px-8 font-semibold transition-all">
                Create your first Host
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hosts?.map((host) => (
            <Card key={host.id} className="bg-card border-border shadow-sm rounded-[24px] flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="p-7 pb-5">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-[16px] bg-secondary flex items-center justify-center flex-shrink-0">
                    <Mic className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground font-heading">{host.name}</CardTitle>
                    <CardDescription className="text-primary line-clamp-1 font-semibold mt-1.5 bg-secondary inline-block px-2.5 py-0.5 rounded-[6px] text-xs uppercase tracking-wider">{host.interview_style} Interviewer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 px-7">
                <p className="text-[15px] text-muted-foreground line-clamp-3 leading-relaxed font-medium">
                  {host.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {host.expertise_areas?.slice(0, 3).map((area: string) => (
                    <span key={area} className="inline-flex items-center rounded-full bg-background border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors">
                      {area}
                    </span>
                  ))}
                  {(host.expertise_areas?.length || 0) > 3 && (
                    <span className="inline-flex items-center rounded-full bg-background border border-border px-3 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors">
                      +{(host.expertise_areas?.length || 0) - 3} more
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="p-5 px-7 border-t border-border mt-4 flex justify-end gap-3 bg-secondary/30 rounded-b-[24px]">
                <Link href={`/dashboard/hosts/${host.id}`}>
                  <Button variant="ghost" size="sm" className="text-foreground hover:text-primary hover:bg-secondary rounded-[10px] font-semibold px-4">
                    Edit
                  </Button>
                </Link>
                <form action={async () => {
                  'use server'
                  await deleteHost(host.id)
                }}>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-[10px] font-semibold px-4">
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
