'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Download, Send, RefreshCw, Scissors } from 'lucide-react'
import { MockBrandedPlayer } from '@/components/video/MockBrandedPlayer'

export function ShortsList({ candidates, renders }: { candidates: any[], renders: any[] }) {
  const [selectedClip, setSelectedClip] = useState<any | null>(candidates[0] || null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column: List of Clips */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <h3 className="text-lg font-semibold flex items-center justify-between">
          <span>AI Clip Candidates</span>
          <Badge variant="secondary">{candidates.length} Detected</Badge>
        </h3>
        
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-2">
          {candidates.map((clip) => (
            <Card 
              key={clip.id} 
              className={`cursor-pointer transition-all hover:border-primary/50 ${selectedClip?.id === clip.id ? 'border-primary ring-1 ring-primary' : ''}`}
              onClick={() => setSelectedClip(clip)}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-primary/5 text-primary">
                    {clip.clip_type}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-orange-500">
                      {clip.viral_moments?.[0]?.viral_score || 0} Viral Score
                    </span>
                  </div>
                </div>
                
                <p className="text-sm line-clamp-3 text-muted-foreground mt-2">
                  "{clip.transcript_segment}"
                </p>
                
                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                  <span>Duration: {Math.round(clip.end_time - clip.start_time)}s</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {candidates.length === 0 && (
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              No clips detected yet.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Clip Editor / Preview */}
      <div className="md:col-span-2">
        {selectedClip ? (
          <Card className="h-full border-none shadow-none bg-muted/10">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {selectedClip.clip_type}
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                      🔥 {selectedClip.viral_moments?.[0]?.viral_score || 0} Viral Potential
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    AI identified this as a high-engagement moment.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Scissors className="w-4 h-4 mr-2" />
                    Edit Boundaries
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-lg border p-4 shadow-sm">
                  <h4 className="text-sm font-semibold mb-3">Transcript Preview</h4>
                  <div className="text-sm text-muted-foreground max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded">
                    {selectedClip.transcript_segment}
                  </div>
                </div>

                <div className="bg-background rounded-lg border p-4 shadow-sm flex flex-col items-center justify-center gap-4 text-center">
                  {(() => {
                    const clipRenders = renders.filter(r => r.clip_candidate_id === selectedClip.id)
                    const successfulRender = clipRenders.find(r => r.status === 'completed')

                    if (successfulRender && successfulRender.url === 'mock://branded-video') {
                      return (
                        <MockBrandedPlayer 
                          title={`Clip: ${selectedClip.clip_type}`} 
                          duration={Math.round(selectedClip.end_time - selectedClip.start_time)} 
                          format="portrait"
                        />
                      )
                    } else if (successfulRender && successfulRender.url) {
                      return (
                        <video src={successfulRender.url} controls className="w-full max-w-[200px] aspect-[9/16] rounded-lg shadow-inner" />
                      )
                    }

                    return (
                      <div className="w-full max-w-[200px] aspect-[9/16] bg-black rounded-lg flex items-center justify-center shadow-inner relative overflow-hidden group">
                        <Play className="w-12 h-12 text-white/50 group-hover:text-white transition-colors" />
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            Preview Not Rendered
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="bg-background rounded-lg border p-4 shadow-sm">
                <h4 className="text-sm font-semibold mb-4">Export & Publish</h4>
                
                {/* Look for existing renders for this clip */}
                {(() => {
                  const clipRenders = renders.filter(r => r.clip_candidate_id === selectedClip.id)
                  const failedRenders = clipRenders.filter(r => r.status === 'failed')

                  return (
                    <div className="space-y-4">
                      {failedRenders.length > 0 && (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex justify-between items-center">
                          <span>A previous render attempt failed video validation.</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 hover:bg-destructive/10">View Logs</Button>
                            <Button size="sm" variant="default" className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90">Retry Render</Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-3">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          <Play className="w-4 h-4 mr-2" />
                          Render 9:16 (TikTok/Reels)
                        </Button>
                        <Button variant="outline">
                          <Play className="w-4 h-4 mr-2" />
                          Render 1:1 (LinkedIn)
                        </Button>
                        <Button variant="secondary" className="ml-auto">
                          <Send className="w-4 h-4 mr-2" />
                          Send to Publishing OS
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>

            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
            Select a clip to view details
          </div>
        )}
      </div>
    </div>
  )
}
