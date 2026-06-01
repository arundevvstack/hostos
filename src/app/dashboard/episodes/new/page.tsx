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
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/episodes">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Plan Episode</h2>
          <p className="text-gray-500 mt-1">Set up a new interview session.</p>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Episode Details</CardTitle>
          <CardDescription className="text-gray-500 font-medium">
            Select your host and guest, and define the conversation topics.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form action={createEpisode} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-gray-700 font-medium">Episode Title</Label>
                <Input id="title" name="title" required placeholder="Episode 1: The Future of AI" className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="host_id" className="text-gray-700 font-medium">AI Host</Label>
                <Select name="host_id" required>
                  <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus-visible:ring-blue-500">
                    <SelectValue placeholder="Select an AI Host" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 rounded-xl shadow-lg">
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
                <Label htmlFor="guest_id" className="text-gray-700 font-medium">Guest</Label>
                <Select name="guest_id" required>
                  <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus-visible:ring-blue-500">
                    <SelectValue placeholder="Select a Guest" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 rounded-xl shadow-lg">
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
                <Label htmlFor="status" className="text-gray-700 font-medium">Initial Status</Label>
                <Select name="status" defaultValue="Draft">
                  <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus-visible:ring-blue-500">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 rounded-xl shadow-lg">
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2 mt-4">
                <Label htmlFor="topic" className="text-gray-700 font-medium flex items-center justify-between">
                  <span>Topics & Agenda</span>
                </Label>
                <Textarea 
                  id="topic" 
                  name="topic" 
                  placeholder="Discussing their latest startup, the implications of LLMs, and their morning routine." 
                  className="bg-gray-50 border-gray-200 text-gray-900 min-h-[140px] focus-visible:ring-blue-500 resize-none" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
              <Link href="/dashboard/episodes">
                <Button variant="outline" type="button" className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-full h-11 px-6">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 px-8 shadow-sm">
                Create Episode
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
