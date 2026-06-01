import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logTelemetry, calculateCost } from '@/lib/hardening/logger'

export async function POST(req: Request) {
  const startTime = Date.now()
  let userId = ''
  let costUsd = 0
  let textLength = 0

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    const { text, voiceId = 'pNInz6obpgDQGcFmaJcg', episodeId } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    textLength = text.length

    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API Key is missing' }, { status: 500 })
    }

    costUsd = calculateCost({
      provider: 'elevenlabs',
      characters: textLength,
    })

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // Fastest model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs Error:', errorText)
      
      const latencyMs = Date.now() - startTime
      await logTelemetry({
        userId,
        systemArea: 'TTS',
        status: 'failure',
        errorMessage: `ElevenLabs Error: ${errorText}`,
        latencyMs,
        costUsd,
        provider: 'elevenlabs',
      })
      
      return NextResponse.json({ error: 'TTS Provider Error' }, { status: response.status })
    }

    const audioBuffer = await response.arrayBuffer()
    const latencyMs = Date.now() - startTime
    
    let audioUrl = null
    if (episodeId) {
      const filename = `${userId}/${episodeId}/host_${Date.now()}.mp3`
      const { data: storageData, error: storageError } = await supabase.storage
        .from('interviews-audio')
        .upload(filename, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false
        })
        
      if (storageError) {
        console.error('Error saving host audio to storage:', storageError)
      } else if (storageData) {
        const { data: publicUrlData } = supabase.storage
          .from('interviews-audio')
          .getPublicUrl(storageData.path)
        audioUrl = publicUrlData.publicUrl
        
        const estimatedDurationSec = Math.max(1, textLength / 13)
        
        const { error: dbError } = await supabase.from('audio_recordings').insert({
          episode_id: episodeId,
          speaker: 'host',
          transcript: text,
          audio_url: audioUrl,
          duration: estimatedDurationSec,
        })
        if (dbError) console.error('Error saving host recording to db:', dbError)
      }
    }

    await logTelemetry({
      userId,
      systemArea: 'TTS',
      status: 'success',
      latencyMs,
      costUsd,
      provider: 'elevenlabs',
    })

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })

  } catch (error: any) {
    console.error('TTS API Error:', error?.message || error)
    
    const latencyMs = Date.now() - startTime
    if (userId) {
      await logTelemetry({
        userId,
        systemArea: 'TTS',
        status: 'failure',
        errorMessage: error?.message || 'Unknown error',
        latencyMs,
        costUsd: calculateCost({ provider: 'elevenlabs', characters: textLength }),
        provider: 'elevenlabs',
      })
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
