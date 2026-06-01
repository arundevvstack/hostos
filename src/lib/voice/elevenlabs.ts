import { VoiceOptions, VoiceProvider, BrowserSpeechProvider } from './provider'

export class ElevenLabsProvider implements VoiceProvider {
  private currentAudio: HTMLAudioElement | null = null

  async speak(text: string, options: VoiceOptions): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.stop() // Ensure no overlapping audio

      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      if (!apiKey) {
        console.warn('ElevenLabs API key is missing. Falling back to browser speech.')
        const fallback = new BrowserSpeechProvider()
        await fallback.speak(text, options)
        return resolve()
      }

      // Default to Rachel if no voice is provided
      const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM' 

      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5', // Turbo model is extremely fast and emotive
            voice_settings: {
              similarity_boost: 0.7,
              stability: 0.5,
              style: 0.0,
              use_speaker_boost: true
            }
          })
        })

        if (!response.ok) {
          console.warn(`ElevenLabs API failed (${response.status}). Falling back to browser speech.`)
          const fallback = new BrowserSpeechProvider()
          await fallback.speak(text, options)
          return resolve()
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        if (options.onGenerated) {
          options.onGenerated(url)
        }
        
        this.currentAudio = new Audio(url)
        this.currentAudio.volume = options.volume || 1.0
        // HTMLAudioElement playbackRate is not perfectly analogous to TTS rate, but we can map it roughly.
        this.currentAudio.playbackRate = options.rate || 1.0

        this.currentAudio.onended = () => {
          if (!options.onGenerated) URL.revokeObjectURL(url)
          this.currentAudio = null
          resolve()
        }

        this.currentAudio.onerror = (e) => {
          if (!options.onGenerated) URL.revokeObjectURL(url)
          this.currentAudio = null
          reject(e)
        }

        await this.currentAudio.play()
      } catch (err) {
        reject(err)
      }
    })
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
  }
}
