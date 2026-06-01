'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, FileText, CheckCircle2, List, Quote, Share2, Play, Volume2, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function StudioPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const episodeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [episode, setEpisode] = useState<any>(null)
  const [transcript, setTranscript] = useState<any[]>([])
  
  // Post-Production Assets
  const [summary, setSummary] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [socials, setSocials] = useState<any[]>([])
  
  // Podcast Render Engine
  const [podcastRender, setPodcastRender] = useState<any>(null)
  const [renderingState, setRenderingState] = useState<'idle' | 'rendering' | 'completed' | 'failed'>('idle')
  const [renderProgress, setRenderProgress] = useState(0)

  useEffect(() => {
    fetchData()
  }, [episodeId])

  const fetchData = async () => {
    setLoading(true)
    
    // Episode
    const { data: epData } = await supabase.from('episodes').select('*, hosts(name), guests(name)').eq('id', episodeId).single()
    setEpisode(epData)

    // Transcript
    const { data: convData } = await supabase.from('conversations').select('*').eq('episode_id', episodeId).order('created_at', { ascending: true })
    setTranscript(convData || [])

    // Assets
    const { data: sumData } = await supabase.from('summaries').select('*').eq('episode_id', episodeId).maybeSingle()
    const { data: chapData } = await supabase.from('episode_chapters').select('*').eq('episode_id', episodeId).order('start_time_seconds', { ascending: true })
    const { data: quoteData } = await supabase.from('episode_quotes').select('*').eq('episode_id', episodeId)
    const { data: socialData } = await supabase.from('episode_social_drafts').select('*').eq('episode_id', episodeId)
    const { data: renderData } = await supabase.from('podcast_renders').select('*').eq('episode_id', episodeId).order('created_at', { ascending: false }).limit(1).maybeSingle()

    setSummary(sumData)
    setChapters(chapData || [])
    setQuotes(quoteData || [])
    setSocials(socialData || [])
    if (renderData && renderData.render_status === 'completed') {
      setPodcastRender(renderData)
      setRenderingState('completed')
    }
    
    setLoading(false)
  }

  function audioBufferToWav(buffer: AudioBuffer) {
    const numOfChan = buffer.numberOfChannels
    const length = buffer.length * numOfChan * 2 + 44
    const bufferArray = new ArrayBuffer(length)
    const view = new DataView(bufferArray)
    const channels = []
    let sample = 0
    let offset = 0
    let pos = 0
  
    function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2 }
    function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4 }
  
    setUint32(0x46464952)
    setUint32(length - 8)
    setUint32(0x45564157)
    setUint32(0x20746d66)
    setUint32(16)
    setUint16(1)
    setUint16(numOfChan)
    setUint32(buffer.sampleRate)
    setUint32(buffer.sampleRate * 2 * numOfChan)
    setUint16(numOfChan * 2)
    setUint16(16)
    setUint32(0x61746164)
    setUint32(length - pos - 4)
  
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }
  
    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]))
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
        view.setInt16(pos, sample, true)
        pos += 2
      }
      offset++
    }
    return new Blob([bufferArray], { type: 'audio/wav' })
  }

  const handleRenderPodcast = async () => {
    setRenderingState('rendering')
    setRenderProgress(0)
    try {
      const { data: recordings } = await supabase.from('audio_recordings').select('*').eq('episode_id', episodeId).order('created_at', { ascending: true })
      if (!recordings || recordings.length === 0) {
        toast.error('No audio segments found. Ensure you have spoken during the interview.')
        setRenderingState('failed')
        return
      }
  
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      let totalLength = 0
      const buffers = []
      
      for (let i = 0; i < recordings.length; i++) {
        const rec = recordings[i]
        if (!rec.audio_url) continue
        try {
          setRenderProgress(Math.round(((i) / recordings.length) * 50))
          const response = await fetch(rec.audio_url)
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
          buffers.push(audioBuffer)
          totalLength += audioBuffer.length
        } catch(e) {
          console.error('Failed to decode segment', i, e)
        }
      }
  
      if (buffers.length === 0) throw new Error('No valid audio buffers')
  
      setRenderProgress(60)
      const sampleRate = buffers[0].sampleRate
      const offlineCtx = new OfflineAudioContext(1, totalLength, sampleRate)
      
      let offset = 0
      for (const buffer of buffers) {
        const source = offlineCtx.createBufferSource()
        const monoBuffer = offlineCtx.createBuffer(1, buffer.length, sampleRate)
        monoBuffer.copyToChannel(buffer.getChannelData(0), 0)
        source.buffer = monoBuffer
        source.connect(offlineCtx.destination)
        source.start(offset)
        offset += buffer.duration
      }
      
      setRenderProgress(80)
      const renderedBuffer = await offlineCtx.startRendering()
      
      setRenderProgress(90)
      const wavBlob = audioBufferToWav(renderedBuffer)
      
      const filename = `rendered/${episodeId}_${Date.now()}.wav`
      const { data: storageData, error: storageError } = await supabase.storage.from('interviews-audio').upload(filename, wavBlob, { contentType: 'audio/wav' })
      if (storageError) throw storageError
      
      const { data: publicUrlData } = supabase.storage.from('interviews-audio').getPublicUrl(storageData.path)
      const audioUrl = publicUrlData.publicUrl
      
      const { data: renderRow } = await supabase.from('podcast_renders').insert({
        episode_id: episodeId,
        audio_url: audioUrl,
        duration: renderedBuffer.duration,
        render_status: 'completed'
      }).select().single()
      
      setPodcastRender(renderRow)
      setRenderingState('completed')
      setRenderProgress(100)
      toast.success('Podcast rendering complete!')
    } catch(e) {
      console.error(e)
      toast.error('Failed to render podcast.')
      setRenderingState('failed')
    }
  }

  const handleProcess = async () => {
    setProcessing(true)
    toast.loading('Processing Podcast Assets... This may take up to 30 seconds.')
    try {
      const res = await fetch('/api/studio/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: episodeId })
      })
      if (!res.ok) throw new Error('Failed to process')
      toast.dismiss()
      toast.success('Post-production assets generated successfully!')
      fetchData()
    } catch (err) {
      toast.dismiss()
      toast.error('Failed to process assets. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const hasAssets = summary || chapters.length > 0 || quotes.length > 0 || socials.length > 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Production Studio</h1>
          <p className="text-muted-foreground mt-1">Review and manage post-production assets for <span className="font-semibold text-foreground">{episode?.title}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/dashboard/episodes`)}>
            Back to Episodes
          </Button>
          {hasAssets && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/episodes/${episodeId}/publishing`)} className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl">
              Open Publishing OS
            </Button>
          )}
          <Button onClick={handleProcess} disabled={processing || transcript.length === 0} className="rounded-xl shadow-sm">
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {hasAssets ? 'Regenerate Assets' : 'Generate Assets'}
          </Button>
        </div>
      </div>

      {transcript.length === 0 ? (
        <Card className="bg-secondary/30 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Play className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-lg font-semibold">No Transcript Available</p>
            <p className="text-sm text-muted-foreground">You must record this episode before entering the studio.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={hasAssets ? "shownotes" : "transcript"} className="w-full">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl mb-6 bg-secondary rounded-xl p-1">
            <TabsTrigger value="transcript" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Transcript</TabsTrigger>
            <TabsTrigger value="shownotes" disabled={!hasAssets} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Show Notes</TabsTrigger>
            <TabsTrigger value="chapters" disabled={!hasAssets} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Chapters</TabsTrigger>
            <TabsTrigger value="social" disabled={!hasAssets} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Social Media</TabsTrigger>
            <TabsTrigger value="quotes" disabled={!hasAssets} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Key Quotes</TabsTrigger>
            <TabsTrigger value="audio" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Audio Engine</TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="m-0">
            <Card className="max-w-3xl border border-zinc-200 shadow-sm rounded-[24px]">
              <CardHeader className="bg-zinc-50 border-b border-zinc-100 rounded-t-[24px] pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><Volume2 className="h-5 w-5 text-indigo-500" /> Podcast Audio Engine</CardTitle>
                <CardDescription>Render all audio segments into a single continuous stream.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {!podcastRender && renderingState === 'idle' && (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                    <Volume2 className="h-12 w-12 text-zinc-400 mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-800">Podcast Unrendered</h3>
                    <p className="text-sm text-zinc-500 text-center max-w-sm mt-2 mb-6">Combine all your recorded audio and TTS generations into one polished MP3/WAV file.</p>
                    <Button onClick={handleRenderPodcast} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6">
                      <Wand2 className="h-4 w-4 mr-2" /> Start Rendering Engine
                    </Button>
                  </div>
                )}
                {renderingState === 'rendering' && (
                  <div className="flex flex-col items-center justify-center p-12 border border-indigo-100 rounded-2xl bg-indigo-50/30">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold text-indigo-900">Rendering Audio Layers...</h3>
                    <p className="text-sm text-indigo-600 font-medium mt-2">{renderProgress}% Complete</p>
                    <div className="w-full max-w-md h-2 bg-indigo-100 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${renderProgress}%` }} />
                    </div>
                  </div>
                )}
                {podcastRender && renderingState === 'completed' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      <div>
                        <h4 className="font-semibold text-emerald-900">Render Successful</h4>
                        <p className="text-sm text-emerald-700">Your podcast is ready for playback and download.</p>
                      </div>
                    </div>
                    
                    <div className="p-6 border border-zinc-200 rounded-2xl bg-zinc-50 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Final Audio File</span>
                        <Badge variant="outline" className="bg-white">{Math.floor(podcastRender.duration / 60)}:{(Math.floor(podcastRender.duration) % 60).toString().padStart(2, '0')}</Badge>
                      </div>
                      
                      <audio controls className="w-full rounded-xl" src={podcastRender.audio_url}>
                        Your browser does not support the audio element.
                      </audio>

                      <div className="flex gap-3 pt-2">
                        <a href={podcastRender.audio_url} target="_blank" download className="flex-1">
                          <Button className="w-full rounded-xl shadow-sm" variant="default">
                            <Download className="h-4 w-4 mr-2" /> Download WAV
                          </Button>
                        </a>
                        <Button variant="outline" onClick={handleRenderPodcast} className="rounded-xl border-zinc-300">
                          <Wand2 className="h-4 w-4 mr-2" /> Rerender
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcript" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Raw Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] w-full rounded-md border p-6 bg-secondary/20">
                  <div className="space-y-4">
                    {transcript.map((msg, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-24 flex-shrink-0 text-sm font-semibold text-muted-foreground uppercase text-right pt-1">
                          {msg.role === 'host' ? episode?.hosts?.name : msg.role === 'guest' ? episode?.guests?.name : 'System'}
                        </div>
                        <div className="flex-1 text-[15px] leading-relaxed text-foreground">
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shownotes" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{summary?.summary}</p>
                </CardContent>
              </Card>
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-md">Suggested Titles</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {summary?.suggested_titles?.map((t: string, i: number) => (
                      <div key={i} className="text-sm p-3 bg-secondary rounded-lg font-medium border border-border">"{t}"</div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-md">Key Takeaways</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                      {summary?.key_takeaways?.map((t: string, i: number) => (
                        <li key={i} className="text-foreground">{t}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chapters" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><List className="h-5 w-5 text-indigo-500" /> Timestamped Chapters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chapters.map((chap, idx) => {
                    const mm = Math.floor(chap.start_time_seconds / 60).toString().padStart(2, '0')
                    const ss = (chap.start_time_seconds % 60).toString().padStart(2, '0')
                    return (
                      <div key={idx} className="flex gap-4 p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors">
                        <Badge variant="secondary" className="h-8 w-16 justify-center text-sm font-mono bg-indigo-50 text-indigo-700">{mm}:{ss}</Badge>
                        <div>
                          <h4 className="font-semibold text-foreground text-md">{chap.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{chap.summary}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {socials.map((social, idx) => (
                <Card key={idx} className="flex flex-col">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-md capitalize flex items-center justify-between">
                      <span className="flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> {social.platform} Draft</span>
                      <Badge variant="outline">{social.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1">
                    <textarea 
                      className="w-full h-full min-h-[200px] resize-none bg-transparent outline-none text-sm leading-relaxed text-foreground"
                      defaultValue={social.draft_content}
                      readOnly
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quotes" className="m-0">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quotes.map((quote, idx) => (
                <Card key={idx} className="relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5">
                    <Quote className="h-32 w-32" />
                  </div>
                  <CardHeader className="pb-2">
                    <Badge variant={quote.speaker_role === 'host' ? 'default' : 'secondary'} className="w-fit uppercase">
                      {quote.speaker_role === 'host' ? episode?.hosts?.name : episode?.guests?.name}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-serif italic text-foreground leading-snug">"{quote.quote_text}"</p>
                    <p className="text-xs text-muted-foreground mt-4 font-medium uppercase tracking-wider">Context: {quote.context}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
