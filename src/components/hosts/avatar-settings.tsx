'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export function AvatarSettings({
  initialProvider = 'heygen',
  initialAvatarId = '',
  initialGestureStyle = 'neutral'
}: {
  initialProvider?: string
  initialAvatarId?: string
  initialGestureStyle?: string
}) {
  const [provider, setProvider] = useState(initialProvider)
  const [avatarId, setAvatarId] = useState(initialAvatarId)
  const [gestureStyle, setGestureStyle] = useState(initialGestureStyle)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Video Avatar Configuration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Avatar Provider</Label>
          <Select name="avatar_provider" value={provider} onValueChange={(val) => setProvider(val || '')}>
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 rounded-xl shadow-lg">
              <SelectItem value="heygen">HeyGen</SelectItem>
              <SelectItem value="tavus">Tavus</SelectItem>
              <SelectItem value="synthesia" disabled>Synthesia (Coming Soon)</SelectItem>
              <SelectItem value="none">Audio Only (No Avatar)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider !== 'none' && (
          <>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Provider Avatar ID</Label>
              <Input 
                name="avatar_id" 
                value={avatarId} 
                onChange={(e) => setAvatarId(e.target.value)} 
                placeholder={provider === 'heygen' ? "e.g., Wayne_20240711" : "e.g., t68a4b"}
                className="bg-gray-50 border-gray-200 text-gray-900 h-11"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Paste the specific Avatar ID from your {provider === 'heygen' ? 'HeyGen' : 'Tavus'} account.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Gesture Style</Label>
              <Select name="avatar_gesture_style" value={gestureStyle} onValueChange={(val) => setGestureStyle(val || '')}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 rounded-xl shadow-lg">
                  <SelectItem value="neutral">Neutral & Professional</SelectItem>
                  <SelectItem value="expressive">Expressive & Active</SelectItem>
                  <SelectItem value="subtle">Subtle & Calm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
