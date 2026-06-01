export interface ClipScoringFactors {
  hookStrength: number
  curiosityGap: number
  emotionalImpact: number
  shareability: number
  retentionPotential: number
}

export interface ViralScoreResult {
  viralScore: number
  factors: ClipScoringFactors
  platformFit: string[]
}

/**
 * Calculates a viral score (0-100) based on detected conversation metrics.
 * In a production scenario, this might also involve an LLM evaluating the text.
 */
export function calculateViralScore(
  curiosity: number,
  emotion: number,
  storyIntensity: number,
  contradiction: number,
  engagement: number,
  durationSeconds: number
): ViralScoreResult {
  
  // 1. Hook Strength: Driven by contradiction and initial curiosity
  const hookStrength = Math.min(100, (contradiction * 0.4) + (curiosity * 0.6))

  // 2. Curiosity Gap: High curiosity but unresolved story
  const curiosityGap = Math.min(100, curiosity * 0.8 + storyIntensity * 0.2)

  // 3. Emotional Impact: Direct mapping from emotional intensity
  const emotionalImpact = emotion

  // 4. Shareability: Combination of emotion, engagement, and hook
  const shareability = Math.min(100, (emotion * 0.3) + (engagement * 0.4) + (hookStrength * 0.3))

  // 5. Retention Potential: Strong stories retain viewers
  const retentionPotential = Math.min(100, (storyIntensity * 0.6) + (engagement * 0.4))

  // Overall Viral Score
  // Weighting heavily favors hook (stops the scroll) and retention (watch time)
  const viralScore = Math.round(
    (hookStrength * 0.3) +
    (retentionPotential * 0.3) +
    (emotionalImpact * 0.15) +
    (curiosityGap * 0.1) +
    (shareability * 0.15)
  )

  // Determine Platform Fit based on duration and metrics
  const platformFit: string[] = []
  
  if (durationSeconds <= 60 && hookStrength > 80) {
    platformFit.push('tiktok')
    platformFit.push('reels')
    platformFit.push('youtube_shorts')
  } else if (durationSeconds <= 90 && storyIntensity > 70) {
    platformFit.push('reels')
    platformFit.push('linkedin')
  } else if (durationSeconds > 60) {
    platformFit.push('linkedin')
    platformFit.push('youtube_highlights')
  }

  // Ensure at least one platform
  if (platformFit.length === 0) {
    platformFit.push('instagram')
  }

  return {
    viralScore,
    factors: {
      hookStrength: Math.round(hookStrength),
      curiosityGap: Math.round(curiosityGap),
      emotionalImpact: Math.round(emotionalImpact),
      shareability: Math.round(shareability),
      retentionPotential: Math.round(retentionPotential)
    },
    platformFit: [...new Set(platformFit)]
  }
}
