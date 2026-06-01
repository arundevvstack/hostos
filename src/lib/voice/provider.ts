export interface VoiceOptions {
  voiceId?: string
  rate: number
  pitch: number
  volume?: number
  personality_traits?: string[]
  tone_of_voice?: string
  onGenerated?: (url: string) => void
}

export interface VoiceProvider {
  speak(text: string, options: VoiceOptions): Promise<void>
  stop(): void
}

export class BrowserSpeechProvider implements VoiceProvider {
  private currentUtterance: SpeechSynthesisUtterance | null = null

  async speak(text: string, options: VoiceOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stop() // Ensure any current speech is stopped

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return reject(new Error('Speech synthesis not supported in this environment'))
      }

      const utterance = new SpeechSynthesisUtterance(text)
      
      utterance.rate = options.rate ?? 1
      utterance.pitch = options.pitch ?? 1
      utterance.volume = options.volume ?? 1

      // If a specific voiceId is provided, try to find it
      if (options.voiceId) {
        const voices = window.speechSynthesis.getVoices()
        const selectedVoice = voices.find(v => v.voiceURI === options.voiceId)
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }

      // Note: options.personality_traits and options.tone_of_voice are passed in 
      // but are intentionally ignored by the native Browser API. 
      // They will be parsed and injected into API requests for advanced TTS engines (e.g. ElevenLabs/Cartesia).

      utterance.onend = () => {
        this.currentUtterance = null
        resolve()
      }

      utterance.onerror = (e) => {
        this.currentUtterance = null
        if (e.error === 'interrupted') {
          resolve() // Interrupted is expected when stop() is called
        } else {
          reject(e)
        }
      }

      this.currentUtterance = utterance
      window.speechSynthesis.speak(utterance)
    })
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    this.currentUtterance = null
  }
}
