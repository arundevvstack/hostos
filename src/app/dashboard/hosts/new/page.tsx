import { createHost } from '../actions'
import { VoiceSettings } from '@/components/hosts/voice-settings'
import { AvatarSettings } from '@/components/hosts/avatar-settings'
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
    <div className="max-w-[1000px] mx-auto space-y-10 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/hosts">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full h-10 w-10 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-[32px] font-bold tracking-tight text-foreground font-heading">Create Digital Host</h2>
          <p className="text-muted-foreground mt-1 text-[16px] font-medium">Design the persona, intellect, and voice of your AI.</p>
        </div>
      </div>

      <form action={createHost} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMN 1: Identity & DNA */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h3 className="text-[20px] font-bold text-foreground font-heading border-b border-border pb-3 mb-6">1. Core Identity</h3>
              <div className="space-y-6 bg-card border border-border shadow-sm rounded-[24px] p-7">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-foreground font-semibold">Host Name</Label>
                  <Input id="name" name="name" required placeholder="e.g. Sarah, Tech Analyst" className="bg-background border-border text-foreground focus-visible:ring-primary h-[48px] rounded-[14px]" />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="interview_style" className="text-foreground font-semibold">Interview Style</Label>
                  <Select name="interview_style" required defaultValue="conversational">
                    <SelectTrigger className="bg-background border-border text-foreground h-[48px] rounded-[14px]">
                      <SelectValue placeholder="Select a style" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground rounded-[14px] shadow-lg">
                      <SelectItem value="conversational">Conversational & Casual</SelectItem>
                      <SelectItem value="investigative">Investigative & Deep</SelectItem>
                      <SelectItem value="educational">Educational & Explanatory</SelectItem>
                      <SelectItem value="confrontational">Direct & Challenging</SelectItem>
                      <SelectItem value="coaching">Supportive & Coaching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="tone_of_voice" className="text-foreground font-semibold">Tone of Voice</Label>
                  <Input id="tone_of_voice" name="tone_of_voice" placeholder="Warm and authoritative" className="bg-background border-border text-foreground h-[48px] rounded-[14px]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-foreground font-heading border-b border-border pb-3 mb-6 mt-10">2. Host DNA</h3>
              <div className="space-y-6 bg-card border border-border shadow-sm rounded-[24px] p-7">
                <p className="text-sm text-muted-foreground font-medium mb-6">Adjust the core behavioral metrics of this host.</p>
                
                {/* Visual Fake Sliders for UI Redesign request */}
                <div className="space-y-5">
                  {[
                    { label: 'Curiosity', value: 85 },
                    { label: 'Empathy', value: 60 },
                    { label: 'Challenge', value: 40 },
                    { label: 'Storytelling', value: 75 },
                    { label: 'Follow-up Depth', value: 90 },
                  ].map(trait => (
                    <div key={trait.label} className="space-y-2 group cursor-pointer">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-foreground">{trait.label}</span>
                        <span className="text-primary">{trait.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all group-hover:bg-primary/80" style={{ width: `${trait.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <Input type="hidden" name="personality_traits" value="Curious, Empathetic, Sharp" />
              </div>
            </div>
          </div>

          {/* COLUMN 2: Knowledge & Brain */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h3 className="text-[20px] font-bold text-foreground font-heading border-b border-border pb-3 mb-6">3. Intellect & Expertise</h3>
              <div className="bg-card border border-border shadow-sm rounded-[24px] p-7 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-foreground font-semibold">Background Context</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="A seasoned venture capitalist who loves diving deep into founder stories..." 
                    className="bg-background border-border text-foreground min-h-[120px] resize-none focus-visible:ring-primary rounded-[14px] p-4 leading-relaxed" 
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="expertise_areas" className="text-foreground font-semibold">Expertise Areas <span className="text-muted-foreground font-normal">(csv)</span></Label>
                  <Input id="expertise_areas" name="expertise_areas" placeholder="AI, Startups, Space Tech" className="bg-background border-border text-foreground h-[48px] rounded-[14px]" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="system_prompt" className="text-foreground font-semibold">Core System Prompt</Label>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-secondary px-2 py-1 rounded-[6px]">Advanced</span>
                  </div>
                  <Textarea 
                    id="system_prompt" 
                    name="system_prompt" 
                    placeholder="You are an expert interviewer. Your goal is to..." 
                    className="bg-gray-900 text-green-400 border-gray-800 min-h-[200px] font-mono text-[13px] focus-visible:ring-primary rounded-[14px] p-5 leading-relaxed" 
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2 font-medium">This prompt overrides default behaviors and drives the LLM persona directly.</p>
                </div>
              </div>
            </div>

            {/* SECTION: Voice Matrix */}
            <div>
              <h3 className="text-[20px] font-bold text-foreground font-heading border-b border-border pb-3 mb-6 mt-10">4. Voice Synthesis</h3>
              <div className="bg-card border border-border shadow-sm rounded-[24px] p-7">
                <VoiceSettings />
              </div>
            </div>

            {/* SECTION: Video Avatar */}
            <div>
              <h3 className="text-[20px] font-bold text-foreground font-heading border-b border-border pb-3 mb-6 mt-10">5. Video Avatar (Optional)</h3>
              <div className="bg-card border border-border shadow-sm rounded-[24px] p-7">
                <AvatarSettings />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-8 pb-16 border-t border-border">
          <Link href="/dashboard/hosts">
            <Button variant="outline" type="button" className="border-border text-foreground hover:bg-background h-[48px] px-8 rounded-[14px] font-semibold transition-all">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white h-[48px] px-10 rounded-[14px] font-semibold shadow-sm transition-all">
            Deploy Host
          </Button>
        </div>
      </form>
    </div>
  )
}
