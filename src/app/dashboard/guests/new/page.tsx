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
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/guests">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Add New Guest</h2>
          <p className="text-gray-500 mt-1">Create a profile for an upcoming podcast guest.</p>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Guest Details</CardTitle>
          <CardDescription className="text-gray-500 font-medium">
            Provide background information that the AI host can use to personalize the interview.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form action={createGuest} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name" className="text-gray-700 font-medium">Guest Name</Label>
                <Input id="name" name="name" required placeholder="John Doe" className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-gray-700 font-medium">Company</Label>
                <Input id="company" name="company" placeholder="Acme Corp" className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-gray-700 font-medium">Website</Label>
                <Input id="website" name="website" type="url" placeholder="https://example.com" className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio" className="text-gray-700 font-medium">Biography</Label>
                <Textarea 
                  id="bio" 
                  name="bio" 
                  placeholder="John is the CEO of Acme Corp and a leading expert in..." 
                  className="bg-gray-50 border-gray-200 text-gray-900 min-h-[120px] focus-visible:ring-blue-500 resize-none" 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes" className="text-gray-700 font-medium flex items-center justify-between">
                  <span>Private Notes</span>
                  <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Context for AI</span>
                </Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  placeholder="Ask him about his recent transition to renewable energy. Do not bring up the lawsuit from 2020." 
                  className="bg-gray-50 border-gray-200 text-gray-900 min-h-[120px] focus-visible:ring-blue-500 resize-none" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
              <Link href="/dashboard/guests">
                <Button variant="outline" type="button" className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-full h-11 px-6">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 px-8 shadow-sm">
                Save Guest
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
