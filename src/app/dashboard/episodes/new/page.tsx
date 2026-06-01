import { cookies } from 'next/headers'
import { createEpisode } from '../actions'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewEpisodePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: hosts }, { data: guests }] = await Promise.all([
    supabase.from('hosts').select('id, name').eq('user_id', user!.id),
    supabase.from('guests').select('id, name').eq('user_id', user!.id)
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/episodes">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plan Episode</h2>
          <p className="text-zinc-400">Set up a new interview session.</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100">Episode Details</CardTitle>
          <CardDescription className="text-zinc-400">
            Select your host and guest, and define the conversation topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEpisode} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-zinc-300">Episode Title</Label>
                <Input id="title" name="title" required placeholder="Episode 1: The Future of AI" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="host_id" className="text-zinc-300">AI Host</Label>
                <Select name="host_id" required>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="Select an AI Host" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {hosts?.map(host => (
                      <SelectItem key={host.id} value={host.id}>{host.name}</SelectItem>
                    ))}
                    {hosts?.length === 0 && (
                      <SelectItem value="" disabled>No hosts available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_id" className="text-zinc-300">Guest</Label>
                <Select name="guest_id" required>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="Select a Guest" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {guests?.map(guest => (
                      <SelectItem key={guest.id} value={guest.id}>{guest.name}</SelectItem>
                    ))}
                    {guests?.length === 0 && (
                      <SelectItem value="" disabled>No guests available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-zinc-300">Initial Status</Label>
                <Select name="status" defaultValue="Draft">
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="topic" className="text-zinc-300">Topics & Agenda</Label>
                <Textarea 
                  id="topic" 
                  name="topic" 
                  placeholder="Discussing their latest startup, the implications of LLMs, and their morning routine." 
                  className="bg-zinc-950 border-zinc-800 text-white min-h-[120px]" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-zinc-800">
              <Link href="/dashboard/episodes">
                <Button variant="outline" type="button" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Create Episode
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
