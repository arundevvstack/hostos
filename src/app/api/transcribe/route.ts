import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { GroqWhisperProvider } from '@/lib/stt/groq-whisper'
import { logTelemetry, calculateCost } from '@/lib/hardening/logger'

// Use a factory or manager if we implement multiple providers later
const sttProvider = new GroqWhisperProvider()

export async function POST(req: Request) {
  const startTime = Date.now()
  let episodeId = ''
  let userId = ''
  let costUsd = 0

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    const formData = await req.formData()
    const audioFile = formData.get('audio') as Blob
    episodeId = formData.get('episodeId') as string || ''
    
    if (!audioFile || !episodeId) {
      return NextResponse.json({ error: 'Missing audio file or episodeId' }, { status: 400 })
    }

    // 1. Transcribe the audio using Groq Whisper (faster-whisper)
    const transcript = await sttProvider.transcribe(audioFile)

    // Estimate duration: assume ~3200 bytes per second for typical 24kbps mono audio
    const estimatedDurationSec = Math.max(1, audioFile.size / 3200)
    costUsd = calculateCost({
      provider: 'groq',
      model: 'whisper-large-v3',
      durationSeconds: estimatedDurationSec,
    })

    // 2. Upload to Supabase Storage (interviews-audio bucket)
    const filename = `${user.id}/${episodeId}/${Date.now()}.webm`
    const { data: storageData, error: storageError } = await supabase.storage
      .from('interviews-audio')
      .upload(filename, audioFile, {
        contentType: 'audio/webm',
        upsert: false
      })

    if (storageError) {
      console.error('Error uploading audio to storage:', storageError)
      // We can continue even if storage fails, the transcription is the main goal
    }

    // 3. Save metadata to audio_recordings
    let audioUrl = null
    if (storageData) {
      const { data: publicUrlData } = supabase.storage
        .from('interviews-audio')
        .getPublicUrl(storageData.path)
      audioUrl = publicUrlData.publicUrl
    }

    const { error: dbError } = await supabase.from('audio_recordings').insert({
      episode_id: episodeId,
      speaker: 'guest',
      transcript: transcript,
      audio_url: audioUrl,
      duration: estimatedDurationSec,
    })

    if (dbError) {
      console.error('Error saving audio recording to db:', dbError)
    }

    const latencyMs = Date.now() - startTime
    
    await logTelemetry({
      episodeId,
      userId,
      systemArea: 'STT',
      status: 'success',
      latencyMs,
      costUsd,
      provider: 'groq',
    })

    // 4. Return transcript back to the client
    return NextResponse.json({ transcript, audioUrl })
  } catch (error: any) {
    console.error('Transcription API error:', error)
    
    const latencyMs = Date.now() - startTime
    if (userId) {
      await logTelemetry({
        episodeId,
        userId,
        systemArea: 'STT',
        status: 'failure',
        errorMessage: error?.message || 'Unknown error',
        latencyMs,
        costUsd,
        provider: 'groq',
      })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
