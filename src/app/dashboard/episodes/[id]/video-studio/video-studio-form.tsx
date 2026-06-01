'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export function VideoStudioForm({
  episodeId,
  project,
  studios
}: {
  episodeId: string
  project: any
  studios: any[]
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const supabase = createClient()

  const [studioId, setStudioId] = useState(project?.studio_id || (studios.length > 0 ? studios[0].id : ''))
  const [cameraLayout, setCameraLayout] = useState(project?.camera_layout || 'dynamic')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (project?.id) {
        await supabase.from('video_projects').update({
          studio_id: studioId,
          camera_layout: cameraLayout,
          updated_at: new Date().toISOString()
        }).eq('id', project.id)
      } else {
        await supabase.from('video_projects').insert({
          episode_id: episodeId,
          studio_id: studioId,
          camera_layout: cameraLayout,
        })
      }
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRender = async () => {
    setIsRendering(true)
    try {
      // Create a background job for Phase 12E Render API
      const res = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, studioId, cameraLayout })
      })
      if (res.ok) {
        alert('Render job queued successfully!')
      } else {
        alert('Failed to queue render job')
      }
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setIsRendering(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Virtual Studio Theme</Label>
          <Select value={studioId} onValueChange={setStudioId}>
            <SelectTrigger className="h-[48px] rounded-[14px]">
              <SelectValue placeholder="Select a studio" />
            </SelectTrigger>
            <SelectContent>
              {studios.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Select the 3D environment for your avatars.</p>
        </div>

        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Camera Director Algorithm</Label>
          <Select value={cameraLayout} onValueChange={setCameraLayout}>
            <SelectTrigger className="h-[48px] rounded-[14px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dynamic">Dynamic (AI Directed Cuts)</SelectItem>
              <SelectItem value="split_screen">Static Side-by-Side</SelectItem>
              <SelectItem value="host_only">Host Only</SelectItem>
              <SelectItem value="guest_only">Guest Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">How the camera switches during the conversation.</p>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button onClick={handleSave} disabled={isSaving} variant="outline" className="h-[48px] px-8 rounded-[14px]">
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
        <Button onClick={handleRender} disabled={isRendering || !project} className="h-[48px] px-8 rounded-[14px] bg-primary text-white">
          {isRendering ? 'Queueing Render...' : 'Generate Video Render'}
        </Button>
      </div>
      
      {!project && (
        <p className="text-xs text-amber-600 font-medium">Please save configuration first before generating video.</p>
      )}
    </div>
  )
}
