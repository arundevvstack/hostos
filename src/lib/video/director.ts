export type ShotType = 'host_closeup' | 'guest_closeup' | 'wide_shot' | 'split_screen' | 'reaction_shot' | 'over_shoulder' | 'two_shot'

export interface CameraCut {
  startTime: number
  endTime: number
  shot: ShotType
  reason: string
}

export interface EDL {
  cuts: CameraCut[]
  totalDuration: number
}

interface TranscriptSegment {
  speaker: 'host' | 'guest'
  text: string
  duration: number
}

/**
 * Automatically directs the virtual cameras based on the conversational transcript.
 */
export function generateDirectorEDL(segments: TranscriptSegment[], algorithm: string = 'dynamic'): EDL {
  const cuts: CameraCut[] = []
  let currentTime = 0

  if (algorithm === 'split_screen') {
    // Static side-by-side for the entire video
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
    cuts.push({
      startTime: 0,
      endTime: totalDuration,
      shot: 'split_screen',
      reason: 'User selected static split screen layout'
    })
    return { cuts, totalDuration }
  }

  if (algorithm === 'host_only') {
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
    cuts.push({
      startTime: 0,
      endTime: totalDuration,
      shot: 'host_closeup',
      reason: 'User selected host only layout'
    })
    return { cuts, totalDuration }
  }

  if (algorithm === 'guest_only') {
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
    cuts.push({
      startTime: 0,
      endTime: totalDuration,
      shot: 'guest_closeup',
      reason: 'User selected guest only layout'
    })
    return { cuts, totalDuration }
  }

  // DYNAMIC ALGORITHM
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentStart = currentTime
    const segmentEnd = currentTime + segment.duration

    // Default shot is the speaker's closeup
    let shot: ShotType = segment.speaker === 'host' ? 'host_closeup' : 'guest_closeup'
    let reason = `${segment.speaker} speaking naturally`

    // Rule 1: If it's a very short interjection (like "Yeah", "Wow"), use a reaction shot or split screen
    if (segment.duration < 2.5) {
      if (i > 0 && segments[i - 1].speaker !== segment.speaker) {
        shot = 'split_screen'
        reason = 'Short interjection/agreement'
      }
    }

    // Rule 2: If the speaker talks for a long time (storytelling), slowly push to wide or change angle halfway
    if (segment.duration > 20) {
      // First 10 seconds: Close up
      cuts.push({
        startTime: segmentStart,
        endTime: segmentStart + 10,
        shot: shot,
        reason: 'Start of long storytelling'
      })

      // Remaining duration: Wide shot
      cuts.push({
        startTime: segmentStart + 10,
        endTime: segmentEnd,
        shot: 'wide_shot',
        reason: 'Visual variety during long monologue'
      })
      currentTime = segmentEnd
      continue
    }

    // Standard rule: cut to speaker
    cuts.push({
      startTime: segmentStart,
      endTime: segmentEnd,
      shot: shot,
      reason: reason
    })

    currentTime = segmentEnd
  }

  return { cuts, totalDuration: currentTime }
}
