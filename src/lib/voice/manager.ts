import { VoiceProvider, VoiceOptions, BrowserSpeechProvider } from './provider'
import { ElevenLabsProvider } from './elevenlabs'

export interface QueueItem {
  id: string
  text: string
  options: VoiceOptions
}

class VoiceManager {
  private provider: VoiceProvider
  private queue: QueueItem[] = []
  private isPlaying = false
  private currentItemId: string | null = null
  private audioUrls: Map<string, string> = new Map()
  private listeners: Set<(playingId: string | null, audioUrls: Map<string, string>) => void> = new Set()

  constructor() {
    this.provider = new BrowserSpeechProvider()
  }

  setEngine(engine: 'browser' | 'elevenlabs' | 'cartesia') {
    this.stop()
    if (engine === 'elevenlabs') {
      this.provider = new ElevenLabsProvider()
    } else {
      this.provider = new BrowserSpeechProvider()
    }
  }

  subscribe(listener: (playingId: string | null, audioUrls: Map<string, string>) => void) {
    this.listeners.add(listener)
    // Send initial state immediately
    listener(this.currentItemId, this.audioUrls)
    return () => { this.listeners.delete(listener); }
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentItemId, this.audioUrls))
  }

  /**
   * Replaces the underlying voice provider (e.g., to CartesiaProvider later)
   */
  setProvider(provider: VoiceProvider) {
    this.stop()
    this.provider = provider
  }

  /**
   * Adds text to the speech queue. Starts playback if not already playing.
   */
  async enqueue(id: string, text: string, options: Omit<VoiceOptions, 'onGenerated'>) {
    const fullOptions: VoiceOptions = {
      ...options,
      onGenerated: (url) => {
        this.audioUrls.set(id, url)
        this.notify()
      }
    }
    this.queue.push({ id, text, options: fullOptions })
    if (!this.isPlaying) {
      await this.processQueue()
    }
  }

  /**
   * Clears the queue and stops current playback immediately.
   */
  stop() {
    this.queue = []
    this.isPlaying = false
    this.currentItemId = null
    this.provider.stop()
    this.notify()
  }

  /**
   * Checks if a specific message ID is currently playing.
   */
  isCurrentlyPlaying(id: string): boolean {
    return this.currentItemId === id
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.isPlaying = false
      this.currentItemId = null
      this.notify()
      return
    }

    this.isPlaying = true
    const item = this.queue.shift()!
    this.currentItemId = item.id
    this.notify()

    try {
      await this.provider.speak(item.text, item.options)
    } catch (error) {
      console.error('Voice playback error:', error)
    } finally {
      // Move to next item even if there was an error
      if (this.isPlaying) {
        this.processQueue()
      } else {
        this.currentItemId = null
        this.notify()
      }
    }
  }
}

// Export a singleton instance
export const voiceManager = new VoiceManager()
