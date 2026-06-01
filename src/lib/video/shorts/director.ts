import { TranscriptSegment } from './detector'

export interface ShortVisualEffects {
  autoZoom: boolean
  speakerFocus: boolean
  splitScreen: boolean
  dynamicCropping: boolean
}

export interface ShortEDL {
  totalDuration: number
  format: '9:16' | '1:1' | '16:9'
  visualEffects: ShortVisualEffects
  captionStyle: string
}

/**
 * AI Clip Director
 * Determines the best visual framing and effects for a short form video based on its length and platform format.
 */
export function directShortVideo(
  format: '9:16' | '1:1' | '16:9',
  duration: number,
  clipType: string
): ShortEDL {
  const visualEffects: ShortVisualEffects = {
    autoZoom: false,
    speakerFocus: true,
    splitScreen: false,
    dynamicCropping: false
  }

  // Vertical video logic
  if (format === '9:16') {
    visualEffects.dynamicCropping = true // Keep speaker centered in vertical frame

    if (clipType === 'Contradiction' || clipType === 'Hot Take') {
      visualEffects.splitScreen = true // Good for showing both reactions in a hot take
      visualEffects.autoZoom = true // Add dramatic zoom on key points
    }

    if (clipType === 'Story' || clipType === 'Emotional Moment') {
      visualEffects.autoZoom = true // Slow push in for emotion
    }
  }

  // Square video logic
  if (format === '1:1') {
    visualEffects.dynamicCropping = true
    if (clipType === 'Contradiction') {
      visualEffects.splitScreen = true
    }
  }

  return {
    totalDuration: duration,
    format,
    visualEffects,
    captionStyle: 'dynamic_highlight' // default highly engaging captions
  }
}
