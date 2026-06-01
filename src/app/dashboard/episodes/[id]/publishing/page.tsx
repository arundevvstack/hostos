'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, CheckCircle2, AlertCircle, Calendar, Send, Copy, 
  History, Clock, FileText, Check, Edit2, Archive, Play, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

export default function EpisodePublishingPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const episodeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [episode, setEpisode] = useState<any>(null)
  
  // Publishing Assets
  const [assets, setAssets] = useState<any[]>([])
  const [activeAsset, setActiveAsset] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>('show_notes')
  
  // Editing state
  const [editingContent, setEditingContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  
  // Scheduling state
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('12:00')
  const [targetPlatform, setTargetPlatform] = useState('')

  useEffect(() => {
    fetchData()
  }, [episodeId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Episode
      const { data: epData } = await supabase.from('episodes').select('*, hosts(name), guests(name)').eq('id', episodeId).single()
      setEpisode(epData)

      // Assets from our API
      const res = await fetch(`/api/publishing/assets?episode_id=${episodeId}`)
      if (!res.ok) throw new Error('Failed to fetch publishing assets')
      const assetsData = await res.json()
      setAssets(assetsData || [])
      
      // Set active asset
      const defaultAsset = assetsData.find((a: any) => a.asset_type === 'show_notes') || assetsData[0]
      if (defaultAsset) {
        setActiveAsset(defaultAsset)
        setEditingContent(defaultAsset.content)
        setSelectedVersion(defaultAsset.version)
        setTargetPlatform(defaultAsset.publish_destination || '')
      }
    } catch (err) {
      toast.error('Failed to load publishing workspace')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    const asset = assets.find((a: any) => a.asset_type === val)
    if (asset) {
      setActiveAsset(asset)
      setEditingContent(asset.content)
      setSelectedVersion(asset.version)
      setTargetPlatform(asset.publish_destination || '')
    } else {
      setActiveAsset(null)
      setEditingContent('')
      setSelectedVersion(null)
      setTargetPlatform('')
    }
    setShowScheduleForm(false)
  }

  const handleSave = async () => {
    if (!activeAsset) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/publishing/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: episodeId,
          asset_type: activeAsset.asset_type,
          content: editingContent,
          publish_destination: targetPlatform || activeAsset.publish_destination
        })
      })

      if (!res.ok) throw new Error('Failed to save asset')
      toast.success('Asset updated and new version saved!')
      
      // Reload assets
      const reloadRes = await fetch(`/api/publishing/assets?episode_id=${episodeId}`)
      const reloadData = await reloadRes.json()
      setAssets(reloadData || [])
      const updated = reloadData.find((a: any) => a.asset_type === activeAsset.asset_type)
      if (updated) {
        setActiveAsset(updated)
        setEditingContent(updated.content)
        setSelectedVersion(updated.version)
      }
    } catch (err) {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusTransition = async (newStatus: string) => {
    if (!activeAsset) return
    try {
      let body: any = {
        asset_id: activeAsset.id,
        status: newStatus
      }

      if (newStatus === 'Scheduled') {
        if (!scheduleDate || !scheduleTime) {
          toast.error('Please select both date and time')
          return
        }
        const datetime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        body.scheduled_for = datetime
        body.publish_destination = targetPlatform || activeAsset.publish_destination || 'rss'
      }

      const res = await fetch('/api/publishing/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Asset transitioned to: ${newStatus}`)
      setShowScheduleForm(false)
      
      // Reload
      fetchData()
    } catch (err) {
      toast.error('Failed to transition status')
    }
  }

  const handleTriggerSimulatePublish = async () => {
    if (!activeAsset) return
    try {
      // Transition to Scheduled/Queued first if it is not
      if (activeAsset.status !== 'Scheduled') {
        toast.info('Transitioning to Scheduled first...')
        const datetime = new Date().toISOString()
        const res = await fetch('/api/publishing/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_id: activeAsset.id,
            status: 'Scheduled',
            scheduled_for: datetime,
            publish_destination: targetPlatform || activeAsset.publish_destination || 'rss'
          })
        })
        if (!res.ok) throw new Error('Failed to schedule')
      }

      toast.loading('Simulating publishing process...')
      
      // Trigger Queue processor
      const queueRes = await fetch('/api/publishing/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      toast.dismiss()
      if (!queueRes.ok) throw new Error('Failed to execute simulation')
      
      const queueData = await queueRes.json()
      toast.success('Simulation run complete!')
      
      // Reload
      fetchData()
    } catch (err) {
      toast.dismiss()
      toast.error('Simulation failed')
    }
  }

  const handleVersionChange = (verNum: number) => {
    setSelectedVersion(verNum)
    if (verNum === activeAsset.version) {
      setEditingContent(activeAsset.content)
    } else {
      const histItem = activeAsset.history?.find((h: any) => h.version === verNum)
      if (histItem) {
        setEditingContent(histItem.content)
      }
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editingContent)
    toast.success('Content copied to clipboard!')
  }

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const getStatusBadgeVariant = (stat: string) => {
    switch (stat) {
      case 'Draft': return 'secondary'
      case 'Review': return 'outline'
      case 'Approved': return 'default'
      case 'Scheduled': return 'outline'
      case 'Publishing': return 'outline'
      case 'Published': return 'success' as any
      case 'Failed': return 'destructive'
      case 'Archived': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusBadgeStyle = (stat: string) => {
    switch (stat) {
      case 'Review': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Scheduled': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Publishing': return 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse'
      case 'Published': return 'bg-green-50 text-green-700 border-green-200'
      default: return ''
    }
  }

  const assetList = [
    { type: 'youtube_shorts', label: 'YouTube Shorts', destination: 'youtube' },
    { type: 'tiktok', label: 'TikTok Video', destination: 'tiktok' },
    { type: 'reels', label: 'Instagram Reel', destination: 'instagram' },
    { type: 'show_notes', label: 'Show Notes', destination: 'rss' },
    { type: 'transcript', label: 'Transcript', destination: 'rss' },
    { type: 'chapters', label: 'Chapters', destination: 'rss' },
    { type: 'quotes', label: 'Key Quotes', destination: 'rss' },
    { type: 'linkedin', label: 'LinkedIn Post', destination: 'linkedin' },
    { type: 'x_thread', label: 'X (Twitter) Thread', destination: 'x' },
    { type: 'blog', label: 'Blog Draft', destination: 'web' },
    { type: 'newsletter', label: 'Newsletter Draft', destination: 'email' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Publishing OS</span>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{episode?.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading mt-1">Asset Publishing Center</h1>
          <p className="text-muted-foreground mt-0.5">Approve, review versions, and schedule distribution for <span className="font-semibold text-foreground">{episode?.title}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/dashboard/episodes/${episodeId}/studio`)} className="rounded-xl">
            Go to Production Studio
          </Button>
          <Button onClick={() => router.push(`/dashboard/publishing`)} className="rounded-xl">
            Open Global Publishing Hub
          </Button>
        </div>
      </div>

      {assets.length === 0 ? (
        <Card className="bg-secondary/30 border-dashed border-2 text-center py-20 rounded-[24px]">
          <CardContent className="flex flex-col items-center justify-center">
            <Clock className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-lg font-semibold">Publishing OS Not Seeded</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
              Please enter the Production Studio and click "Generate Assets" to seed these assets into the Publishing Operating System workflow.
            </p>
            <Button className="mt-6 rounded-xl" onClick={() => router.push(`/dashboard/episodes/${episodeId}/studio`)}>
              Open Production Studio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main approvals UI */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <ScrollArea className="w-full pb-2">
                <TabsList className="flex w-max bg-secondary p-1 rounded-xl mb-4">
                  {assetList.map((item) => {
                    const currentAsset = assets.find((a) => a.asset_type === item.type)
                    const status = currentAsset?.status || 'Draft'
                    return (
                      <TabsTrigger key={item.type} value={item.type} className="rounded-lg text-xs flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        {item.label}
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          status === 'Published' ? 'bg-green-500' :
                          status === 'Scheduled' ? 'bg-blue-500' :
                          status === 'Review' ? 'bg-amber-500' : 'bg-gray-400'
                        }`} />
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </ScrollArea>

              {activeAsset ? (
                <Card className="rounded-[24px] border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
                    <div>
                      <CardTitle className="text-xl capitalize font-heading flex items-center gap-2">
                        {activeAsset.asset_type.replace('_', ' ')} Workstation
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1.5">
                        <span>Currently v{activeAsset.version}</span>
                        <span>•</span>
                        <span>Last modified {new Date(activeAsset.updated_at).toLocaleTimeString()}</span>
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Version select */}
                      <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-lg border border-border">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <select 
                          className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                          value={selectedVersion || activeAsset.version}
                          onChange={(e) => handleVersionChange(Number(e.target.value))}
                        >
                          <option value={activeAsset.version}>v{activeAsset.version} (Active)</option>
                          {activeAsset.history?.map((h: any) => (
                            <option key={h.id} value={h.version}>v{h.version}</option>
                          ))}
                        </select>
                      </div>

                      <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy to Clipboard">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <textarea 
                      className="w-full min-h-[400px] bg-secondary/15 border border-border rounded-xl p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                    
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => handleVersionChange(activeAsset.version)} className="rounded-xl">
                        Reset Changes
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving} className="rounded-xl">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Version {selectedVersion !== activeAsset.version ? 'as New Draft' : ''}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-[300px] border rounded-[24px] bg-secondary/10">
                  <p className="text-muted-foreground">Asset not initialized. Please click Generate Assets.</p>
                </div>
              )}
            </Tabs>
          </div>

          {/* Workflow Sidebar */}
          <div className="space-y-6">
            <Card className="rounded-[24px] border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-heading">Approval Workflow</CardTitle>
                <CardDescription>Manage the publishing lifecycle for this asset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeAsset ? (
                  <>
                    <div className="flex items-center justify-between p-3.5 bg-secondary/50 rounded-xl border border-border">
                      <span className="text-sm font-semibold text-muted-foreground">Lifecycle State:</span>
                      <Badge className={`px-2.5 py-1 text-xs font-semibold rounded-[8px] ${getStatusBadgeStyle(activeAsset.status)}`} variant={getStatusBadgeVariant(activeAsset.status)}>
                        {activeAsset.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Change Status</span>
                      
                      {activeAsset.status === 'Draft' && (
                        <Button 
                          className="w-full justify-start rounded-xl font-medium" 
                          variant="outline"
                          onClick={() => handleStatusTransition('Review')}
                        >
                          <Edit2 className="mr-2.5 h-4 w-4 text-amber-500" />
                          Submit for Review
                        </Button>
                      )}
                      
                      {(activeAsset.status === 'Draft' || activeAsset.status === 'Review') && (
                        <Button 
                          className="w-full justify-start rounded-xl font-medium" 
                          variant="outline"
                          onClick={() => handleStatusTransition('Approved')}
                        >
                          <CheckCircle2 className="mr-2.5 h-4 w-4 text-emerald-500" />
                          Approve Asset
                        </Button>
                      )}

                      {activeAsset.status === 'Approved' && (
                        <Button 
                          className="w-full justify-start rounded-xl font-medium" 
                          variant="outline"
                          onClick={() => setShowScheduleForm(!showScheduleForm)}
                        >
                          <Calendar className="mr-2.5 h-4 w-4 text-blue-500" />
                          Schedule Publish
                        </Button>
                      )}

                      {showScheduleForm && (
                        <Card className="bg-secondary/40 border border-border rounded-xl mt-2 p-4 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Publish Destination</label>
                            <select 
                              className="w-full bg-background border border-border rounded-lg text-xs p-2 focus:outline-none"
                              value={targetPlatform}
                              onChange={(e) => setTargetPlatform(e.target.value)}
                            >
                              <option value="rss">RSS Feed (Show Notes/Transcript/Chapters)</option>
                              <option value="spotify">Spotify Podcasts</option>
                              <option value="apple">Apple Podcasts</option>
                              <option value="linkedin">LinkedIn Post</option>
                              <option value="x">Twitter / X Post</option>
                              <option value="web">Web Blog</option>
                              <option value="email">Email Newsletter</option>
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                              <input 
                                type="date" 
                                className="w-full bg-background border border-border rounded-lg text-xs p-2"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Time</label>
                              <input 
                                type="time" 
                                className="w-full bg-background border border-border rounded-lg text-xs p-2"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full rounded-lg text-xs h-9 bg-primary text-white"
                            onClick={() => handleStatusTransition('Scheduled')}
                          >
                            Confirm Schedule
                          </Button>
                        </Card>
                      )}

                      {activeAsset.status === 'Scheduled' && (
                        <div className="space-y-2">
                          <Button 
                            className="w-full justify-start rounded-xl font-medium" 
                            variant="outline"
                            onClick={() => handleStatusTransition('Approved')}
                          >
                            <Clock className="mr-2.5 h-4 w-4 text-zinc-500" />
                            Unschedule / Re-approve
                          </Button>
                          
                          <Button 
                            className="w-full justify-start rounded-xl font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200" 
                            variant="outline"
                            onClick={handleTriggerSimulatePublish}
                          >
                            <Send className="mr-2.5 h-4 w-4" />
                            Trigger Publish Now
                          </Button>
                        </div>
                      )}

                      {activeAsset.status !== 'Archived' && (
                        <Button 
                          className="w-full justify-start rounded-xl font-medium text-muted-foreground" 
                          variant="ghost"
                          onClick={() => handleStatusTransition('Archived')}
                        >
                          <Archive className="mr-2.5 h-4 w-4" />
                          Archive Asset
                        </Button>
                      )}

                      {activeAsset.status === 'Archived' && (
                        <Button 
                          className="w-full justify-start rounded-xl font-medium" 
                          variant="outline"
                          onClick={() => handleStatusTransition('Draft')}
                        >
                          <Clock className="mr-2.5 h-4 w-4 text-zinc-500" />
                          Restore to Draft
                        </Button>
                      )}
                    </div>
                    
                    <div className="border-t border-border pt-4 space-y-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Publish Destination</span>
                      <div className="text-sm font-semibold flex items-center justify-between">
                        <span className="capitalize">{activeAsset.publish_destination || 'Unassigned'}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                          {activeAsset.publish_destination === 'rss' ? 'Podcast Feed' : 
                           activeAsset.publish_destination === 'linkedin' || activeAsset.publish_destination === 'x' ? 'Social Network' : 
                           activeAsset.publish_destination === 'web' ? 'Blog/Site' : 'Email Teaser'}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Select an asset tab to view details.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick check list */}
            <Card className="rounded-[24px] border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-md">Distribution Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {assetList.map((item) => {
                  const asset = assets.find((a) => a.asset_type === item.type)
                  const isApproved = asset?.status === 'Approved' || asset?.status === 'Scheduled' || asset?.status === 'Published'
                  return (
                    <div key={item.type} className="flex items-center gap-3.5 text-sm">
                      <div className={`h-5 w-5 rounded-md flex items-center justify-center border ${
                        isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-background border-border text-muted-foreground'
                      }`}>
                        {isApproved ? <Check className="h-3.5 w-3.5" /> : null}
                      </div>
                      <span className={`${isApproved ? 'text-muted-foreground line-through font-medium' : 'text-foreground font-semibold'}`}>
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
