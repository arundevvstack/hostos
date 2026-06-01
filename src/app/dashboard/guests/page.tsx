import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, Globe, Building2 } from 'lucide-react'
import { deleteGuest } from './actions'

export default async function GuestsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: guests } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Guests</h2>
          <p className="text-zinc-400">Manage profiles for the people you plan to interview.</p>
        </div>
        <Link href="/dashboard/guests/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Guest
          </Button>
        </Link>
      </div>

      {guests?.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 text-center py-12">
          <CardContent className="flex flex-col items-center space-y-4">
            <Users className="h-12 w-12 text-zinc-600" />
            <div className="space-y-2">
              <h3 className="font-semibold text-xl text-zinc-200">No guests added</h3>
              <p className="text-zinc-400 max-w-sm mx-auto">
                Build your CRM by adding guests. You'll need guests to schedule new episodes.
              </p>
            </div>
            <Link href="/dashboard/guests/new">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white mt-4">
                Add your first Guest
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guests?.map((guest) => (
            <Card key={guest.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-100">{guest.name}</CardTitle>
                <CardDescription className="text-zinc-400 flex flex-col gap-1 mt-2">
                  {guest.company && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {guest.company}
                    </span>
                  )}
                  {guest.website && (
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <Globe className="h-3.5 w-3.5" />
                      <a href={guest.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {guest.website.replace(/^https?:\/\//, '')}
                      </a>
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-zinc-300 line-clamp-3">
                  {guest.bio || 'No bio provided.'}
                </p>
              </CardContent>
              <div className="p-4 border-t border-zinc-800 mt-auto flex justify-between items-center">
                <span className="text-xs text-zinc-500">
                  Added {new Date(guest.created_at).toLocaleDateString()}
                </span>
                <form action={async () => {
                  'use server'
                  await deleteGuest(guest.id)
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
