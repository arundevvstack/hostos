import { calculateViralScore } from './scorer'

export interface TranscriptSegment {
  id: string
  speaker_role: 'host' | 'guest'
  text: string
  start_time: number
  end_time: number
}

export interface ConversationMetric {
  message_id: string
  curiosity_score: number
  emotional_intensity: number
  importance_score: number
}

export interface DetectedClip {
  clip_type: string
  start_time: number
  end_time: number
  transcript_segment: string
  metrics: {
    curiosity: number
    emotion: number
    storyIntensity: number
    contradiction: number
    engagement: number
  }
}

/**
 * Hybrid Detection Engine: Step 1 Metric Analysis
 * Finds spikes in conversation metrics to identify candidate segments.
 */
export function detectCandidateClips(
  transcripts: TranscriptSegment[],
  metrics: ConversationMetric[]
): DetectedClip[] {
  const candidates: DetectedClip[] = []
  
  // Create a map for quick metric lookup
  const metricMap = new Map<string, ConversationMetric>()
  metrics.forEach(m => metricMap.set(m.message_id, m))

  // Group transcripts into rolling windows of ~30-60 seconds to find peaks
  let windowStartIdx = 0
  
  for (let i = 0; i < transcripts.length; i++) {
    const current = transcripts[i]
    const windowStart = transcripts[windowStartIdx]
    
    // Check if window is around 45 seconds (target length for a solid short)
    const windowDuration = current.end_time - windowStart.start_time
    
    if (windowDuration >= 30 && windowDuration <= 90) {
      // Analyze the metrics within this window
      let windowCuriosity = 0
      let windowEmotion = 0
      let windowImportance = 0
      let count = 0
      
      let fullText = ''

      for (let j = windowStartIdx; j <= i; j++) {
        const seg = transcripts[j]
        fullText += `${seg.speaker_role === 'host' ? 'Host' : 'Guest'}: ${seg.text}\n`
        
        const metric = metricMap.get(seg.id)
        if (metric) {
          windowCuriosity += metric.curiosity_score || 0
          windowEmotion += metric.emotional_intensity || 0
          windowImportance += metric.importance_score || 0
          count++
        }
      }

      if (count > 0) {
        windowCuriosity /= count
        windowEmotion /= count
        windowImportance /= count
      }

      // If any metric spikes above a threshold, consider it a candidate
      if (windowEmotion > 75 || windowCuriosity > 80 || windowImportance > 85) {
        
        let clipType = 'Key Quote'
        if (windowEmotion > 85) clipType = 'Emotional Moment'
        else if (windowCuriosity > 85) clipType = 'Hot Take'
        else if (windowImportance > 85 && windowDuration > 50) clipType = 'Story'

        candidates.push({
          clip_type: clipType,
          start_time: windowStart.start_time,
          end_time: current.end_time,
          transcript_segment: fullText.trim(),
          metrics: {
            curiosity: windowCuriosity,
            emotion: windowEmotion,
            storyIntensity: windowImportance,
            contradiction: Math.random() * 40, // Simulated contradiction score for now
            engagement: (windowCuriosity + windowEmotion) / 2
          }
        })

        // Advance the window to avoid heavy overlap
        windowStartIdx = i + 1
      }
    } else if (windowDuration > 90) {
      // Window got too big, move start forward
      windowStartIdx++
    }
  }

  // Rank by a quick heuristic to return top 20
  return candidates
    .sort((a, b) => {
      const scoreA = a.metrics.emotion + a.metrics.curiosity + a.metrics.storyIntensity
      const scoreB = b.metrics.emotion + b.metrics.curiosity + b.metrics.storyIntensity
      return scoreB - scoreA
    })
    .slice(0, 20)
}
