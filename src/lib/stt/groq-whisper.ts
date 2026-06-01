import { STTProvider } from './provider'

export class GroqWhisperProvider implements STTProvider {
  async transcribe(audioBlob: Blob): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }

    const formData = new FormData()
    // Whisper API expects a file with a valid extension (webm is what MediaRecorder produces typically)
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('response_format', 'json')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Groq Whisper API error: ${res.status} - ${errText}`)
    }

    const data = await res.json()
    return data.text
  }
}
