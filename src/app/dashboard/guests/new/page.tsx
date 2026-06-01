import { createGuest } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewGuestPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/guests">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Guest</h2>
          <p className="text-zinc-400">Create a profile for an upcoming podcast guest.</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100">Guest Details</CardTitle>
          <CardDescription className="text-zinc-400">
            Provide background information that the AI host can use to personalize the interview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createGuest} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name" className="text-zinc-300">Guest Name</Label>
                <Input id="name" name="name" required placeholder="John Doe" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-zinc-300">Company</Label>
                <Input id="company" name="company" placeholder="Acme Corp" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-zinc-300">Website</Label>
                <Input id="website" name="website" type="url" placeholder="https://example.com" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio" className="text-zinc-300">Biography</Label>
                <Textarea 
                  id="bio" 
                  name="bio" 
                  placeholder="John is the CEO of Acme Corp and a leading expert in..." 
                  className="bg-zinc-950 border-zinc-800 text-white min-h-[100px]" 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes" className="text-zinc-300">Private Notes (Context for AI)</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  placeholder="Ask him about his recent transition to renewable energy. Do not bring up the lawsuit from 2020." 
                  className="bg-zinc-950 border-zinc-800 text-white min-h-[100px]" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-zinc-800">
              <Link href="/dashboard/guests">
                <Button variant="outline" type="button" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Guest
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
