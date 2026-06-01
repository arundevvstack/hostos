export interface AvatarGenerateRequest {
  avatarId: string
  audioUrl: string
  gestureStyle?: string
  backgroundUrl?: string
}

export interface AvatarGenerateResponse {
  jobId: string
  status: 'processing' | 'completed' | 'failed'
  videoUrl?: string
}

export interface AvatarProvider {
  name: string
  generateVideo(request: AvatarGenerateRequest): Promise<AvatarGenerateResponse>
  checkStatus(jobId: string): Promise<AvatarGenerateResponse>
}
