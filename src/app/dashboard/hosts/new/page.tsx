import { createHost } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewHostPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/hosts">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create New Host</h2>
          <p className="text-zinc-400">Configure your AI host's personality and expertise.</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100">Host Profile</CardTitle>
          <CardDescription className="text-zinc-400">
            Define how your host acts and sounds during interviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHost} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Host Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Lex, Sarah, Tech Guru" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interview_style" className="text-zinc-300">Interview Style</Label>
                <Select name="interview_style" required defaultValue="conversational">
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="conversational">Conversational & Casual</SelectItem>
                    <SelectItem value="investigative">Investigative & Deep</SelectItem>
                    <SelectItem value="educational">Educational & Explanatory</SelectItem>
                    <SelectItem value="confrontational">Direct & Challenging</SelectItem>
                    <SelectItem value="coaching">Supportive & Coaching</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-zinc-300">Short Bio / Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="A seasoned venture capitalist who loves diving deep into founder stories..." 
                  className="bg-zinc-950 border-zinc-800 text-white min-h-[100px]" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expertise_areas" className="text-zinc-300">Expertise Areas (comma separated)</Label>
                <Input id="expertise_areas" name="expertise_areas" placeholder="AI, Startups, Space Tech" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality_traits" className="text-zinc-300">Personality Traits (comma separated)</Label>
                <Input id="personality_traits" name="personality_traits" placeholder="Curious, Empathetic, Sharp" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone_of_voice" className="text-zinc-300">Tone of Voice</Label>
                <Input id="tone_of_voice" name="tone_of_voice" placeholder="Warm and authoritative" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="system_prompt" className="text-zinc-300">System Prompt (Advanced)</Label>
                <Textarea 
                  id="system_prompt" 
                  name="system_prompt" 
                  placeholder="You are an expert interviewer. Your goal is to..." 
                  className="bg-zinc-950 border-zinc-800 text-white min-h-[150px]" 
                  required
                />
                <p className="text-xs text-zinc-500">This prompt drives the core LLM behavior for the host.</p>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/hosts">
                <Button variant="outline" type="button" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Host
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
