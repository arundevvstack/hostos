'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play } from 'lucide-react'
import { voiceManager } from '@/lib/voice/manager'

export function VoiceSettings({
  initialProvider = 'browser',
  initialVoiceId = '',
  initialRate = '0.9',
  initialPitch = '1.0',
  initialVolume = '1.0'
}: {
  initialProvider?: string
  initialVoiceId?: string
  initialRate?: string
  initialPitch?: string
  initialVolume?: string
} = {}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [elevenVoices, setElevenVoices] = useState<Array<{voice_id: string, name: string}>>([])
  const [voiceId, setVoiceId] = useState(initialProvider === 'browser' ? initialVoiceId : '')
  const [elevenVoiceId, setElevenVoiceId] = useState(initialProvider === 'elevenlabs' ? initialVoiceId : '')
  const [rate, setRate] = useState(initialRate)
  const [pitch, setPitch] = useState(initialPitch)
  const [volume, setVolume] = useState(initialVolume)
  const [isPlaying, setIsPlaying] = useState(false)
  const [provider, setProvider] = useState(initialProvider)

  useEffect(() => {
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices())
    }
    updateVoices()
    window.speechSynthesis.onvoiceschanged = updateVoices

    // Fetch ElevenLabs voices if API key is available
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
    if (apiKey) {
      fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey }
      })
      .then(res => res.json())
      .then(data => {
        if (data.voices) {
          setElevenVoices(data.voices)
          if (data.voices.length > 0) {
            setElevenVoiceId(data.voices[0].voice_id)
          }
        }
      })
      .catch(err => console.error('Error fetching ElevenLabs voices:', err))
    }
  }, [])

  const testVoice = async () => {
    if (isPlaying) {
      voiceManager.stop()
      setIsPlaying(false)
      return
    }

    const testText = "Hello, I'm Lena Morgan. Welcome to the show. Today we're exploring the stories behind great founders and creators."
    
    setIsPlaying(true)
    voiceManager.setEngine(provider as 'browser' | 'elevenlabs' | 'cartesia')
    await voiceManager.enqueue('test-voice', testText, {
      voiceId: provider === 'elevenlabs' ? elevenVoiceId : (voiceId || undefined),
      rate: parseFloat(rate),
      pitch: parseFloat(pitch),
      volume: parseFloat(volume)
    })
    
    // Simplistic reset
    setTimeout(() => {
      setIsPlaying(false)
    }, 5000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Engine Configuration</h3>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={testVoice}
          className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 h-8 rounded-full px-4"
        >
          <Play className="h-3 w-3 mr-1.5" />
          Test Voice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Voice Engine</Label>
          <Select name="voice_provider" value={provider} onValueChange={(val) => setProvider(val || '')}>
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 rounded-xl shadow-lg">
              <SelectItem value="browser">Browser Native TTS (Free)</SelectItem>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              <SelectItem value="cartesia" disabled>Cartesia (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider === 'browser' ? (
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Browser Voice</Label>
            <Select name="voice_id" value={voiceId} onValueChange={(val) => setVoiceId(val || '')}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11">
                <SelectValue placeholder="Default System Voice" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-60 rounded-xl shadow-lg">
                <SelectItem value="default">Default System Voice</SelectItem>
                {voices.map(v => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">ElevenLabs Voice</Label>
            <Select name="voice_id" value={elevenVoiceId} onValueChange={(val) => setElevenVoiceId(val || '')}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11">
                <SelectValue placeholder="Select ElevenLabs Voice" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-60 rounded-xl shadow-lg">
                {elevenVoices.map(v => (
                  <SelectItem key={v.voice_id} value={v.voice_id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1.5">
              Add custom voices in your ElevenLabs account, then refresh here.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-gray-700 font-medium">Speaking Rate</Label>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{rate}</span>
          </div>
          <input 
            type="range" 
            name="voice_rate" 
            min="0.5" max="2" step="0.1" 
            value={rate} 
            onChange={e => setRate(e.target.value)}
            className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-gray-700 font-medium">Pitch</Label>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{pitch}</span>
          </div>
          <input 
            type="range" 
            name="voice_pitch" 
            min="0" max="2" step="0.1" 
            value={pitch} 
            onChange={e => setPitch(e.target.value)}
            className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-gray-700 font-medium">Volume</Label>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{volume}</span>
          </div>
          <input 
            type="range" 
            name="voice_volume" 
            min="0" max="1" step="0.1" 
            value={volume} 
            onChange={e => setVolume(e.target.value)}
            className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
