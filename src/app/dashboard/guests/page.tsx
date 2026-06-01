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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Guests</h2>
          <p className="text-gray-500 mt-1">Manage profiles for the people you plan to interview.</p>
        </div>
        <Link href="/dashboard/guests/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 px-6 shadow-sm font-medium">
            <Plus className="mr-2 h-4 w-4" />
            Add Guest
          </Button>
        </Link>
      </div>

      {guests?.length === 0 ? (
        <Card className="bg-white border-gray-200 shadow-sm rounded-3xl text-center py-16">
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-2">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-xl text-gray-900">No guests added</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Build your CRM by adding guests. You'll need guests to schedule new episodes.
              </p>
            </div>
            <Link href="/dashboard/guests/new">
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 mt-6 rounded-full h-11 px-6">
                Add your first Guest
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guests?.map((guest) => (
            <Card key={guest.id} className="bg-white border-gray-200 shadow-sm rounded-3xl flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg font-bold text-gray-900">{guest.name}</CardTitle>
                <CardDescription className="text-gray-500 flex flex-col gap-1.5 mt-2">
                  {guest.company && (
                    <span className="flex items-center gap-2 font-medium">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      {guest.company}
                    </span>
                  )}
                  {guest.website && (
                    <span className="flex items-center gap-2 font-medium text-blue-600">
                      <Globe className="h-4 w-4 text-blue-400" />
                      <a href={guest.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {guest.website.replace(/^https?:\/\//, '')}
                      </a>
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 px-6">
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                  {guest.bio || 'No bio provided.'}
                </p>
              </CardContent>
              <div className="p-4 px-6 border-t border-gray-100 mt-4 flex justify-between items-center bg-gray-50/50 rounded-b-3xl">
                <span className="text-xs font-medium text-gray-400">
                  Added {new Date(guest.created_at).toLocaleDateString()}
                </span>
                <form action={async () => {
                  'use server'
                  await deleteGuest(guest.id)
                }}>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg">
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
