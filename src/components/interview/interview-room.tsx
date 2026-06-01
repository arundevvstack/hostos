'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Send, User, Mic, Brain, Lightbulb, AlertTriangle, MessageSquare, Play, Square, RotateCcw, Download, MicOff, Loader2, Ear } from 'lucide-react'
import { voiceManager } from '@/lib/voice/manager'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type InterviewRoomProps = {
  episode: any
  hostDna: any
  initialMemories: any[]
  initialHistory: any[]
  initialContradictions: any[]
  initialCuriosityTargets: any[]
}

export default function InterviewRoom({ 
  episode, 
  hostDna, 
  initialMemories, 
  initialHistory, 
  initialContradictions, 
  initialCuriosityTargets 
}: InterviewRoomProps) {
  
  const [memories, setMemories] = useState(initialMemories)
  const [contradictions, setContradictions] = useState(initialContradictions)
  const [curiosityTargets, setCuriosityTargets] = useState(initialCuriosityTargets)

  // Simple controlled state — no library quirks
  const [messages, setMessages] = useState<Message[]>(
    initialHistory.map(msg => ({
      id: msg.id,
      role: (msg.role === 'host' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: msg.content || '',
    }))
  )
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(episode.hosts?.voice_enabled ?? true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map())
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)
  const [isStandby, setIsStandby] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const shouldAutoSubmitRef = useRef(false)
  const speechRecognitionRef = useRef<any>(null)
  const wasStandbyRef = useRef(false)
  const hasSpokenRef = useRef(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Set up the voice provider chosen by the host
    const provider = episode.hosts?.voice_provider || 'browser'
    voiceManager.setEngine(provider as 'browser' | 'elevenlabs' | 'cartesia')
    return voiceManager.subscribe((id, urls) => {
      setPlayingId(id)
      // Force state update by creating a new map reference if size changes, or just setting it.
      // We clone the map to trigger re-render
      setAudioUrls(new Map(urls))
    })
  }, [episode.hosts?.voice_provider])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const setupRecorder = (stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      const chunks = audioChunksRef.current
      if (chunks.length === 0) {
        if (shouldAutoSubmitRef.current) submitMessage(input)
        return
      }

      const audioBlob = new Blob(chunks, { type: 'audio/webm' })
      
      // If the audio blob is tiny (likely just headers or complete silence), skip STT
      if (audioBlob.size < 1000 || !hasSpokenRef.current) { 
         if (shouldAutoSubmitRef.current) submitMessage(input)
         return
      }

      setIsTranscribing(true)
      
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('episodeId', episode.id)

      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error('Transcription failed')
        
        const data = await res.json()
        if (data.transcript) {
          setInput((prev) => {
            // Whisper can sometimes hallucinate repetitive stuff or return empty, handle basic trim
            const newText = prev ? prev + ' ' + data.transcript.trim() : data.transcript.trim()
            if (shouldAutoSubmitRef.current) {
              setTimeout(() => submitMessage(newText), 50)
            }
            return newText
          })
        } else if (shouldAutoSubmitRef.current) {
          submitMessage(input)
        }
      } catch (error) {
        console.error('STT Error:', error)
        if (shouldAutoSubmitRef.current) submitMessage(input)
      } finally {
        setIsTranscribing(false)
      }
    }

    mediaRecorder.start()
  }

  const startVAD = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioContext
    const analyser = audioContext.createAnalyser()
    analyser.minDecibels = -70 // lower threshold to capture quiet speech
    analyser.smoothingTimeConstant = 0.2
    analyserRef.current = analyser

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const checkSilence = () => {
      analyser.getByteFrequencyData(dataArray)
      const sum = dataArray.reduce((a, b) => a + b, 0)
      const average = sum / dataArray.length

      // Threshold: average volume > 10 is considered speaking
      if (average > 10) {
        silenceStartRef.current = null
        hasSpokenRef.current = true
      } else if (hasSpokenRef.current) {
        // Only start timing silence if they have spoken in this chunk
        if (silenceStartRef.current === null) {
          silenceStartRef.current = Date.now()
        } else if (Date.now() - silenceStartRef.current > 1500) {
          // 1.5s of silence detected! Trigger chunk!
          silenceStartRef.current = null
          
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop() // Triggers transcribe
            hasSpokenRef.current = false // reset for the new recorder
            setupRecorder(streamRef.current!) // Immediately restart
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(checkSilence)
    }
    
    checkSilence()
  }

  const startStandby = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        console.warn("Speech Recognition not supported in this browser.")
        return
      }
      
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      
      recognition.onresult = (event: any) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript
        }
        
        const hostName = episode.hosts?.name?.toLowerCase() || ''
        if (hostName && currentTranscript.toLowerCase().includes(hostName)) {
          // Wake word detected!
          recognition.stop()
          setIsStandby(false)
          startRecording()
        }
      }
      
      recognition.onerror = (event: any) => {
         console.error("Speech recognition error", event.error)
      }
      
      recognition.onend = () => {
        // Auto-restart if we are still supposed to be in standby
        if (wasStandbyRef.current) {
          try { recognition.start() } catch (e) {}
        }
      }
      
      speechRecognitionRef.current = recognition
      recognition.start()
      setIsStandby(true)
      wasStandbyRef.current = true
    } catch (err) {
      console.error("Failed to start standby", err)
    }
  }

  const stopStandby = () => {
    setIsStandby(false)
    wasStandbyRef.current = false
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      shouldAutoSubmitRef.current = false
      hasSpokenRef.current = false
      setIsAutoSubmitting(false)
      
      setupRecorder(stream)
      startVAD(stream)
      
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied or error:', err)
    }
  }

  const stopRecording = () => {
    shouldAutoSubmitRef.current = true
    setIsAutoSubmitting(true)
    setIsRecording(false)
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    } else {
      // If recorder was already stopped, just submit
      submitMessage(input)
    }
  }

  const submitMessage = async (textToSubmit: string) => {
    const trimmed = textToSubmit.trim()
    setIsAutoSubmitting(false)
    shouldAutoSubmitRef.current = false
    
    if (!trimmed || isLoading) {
      // If we abort early, check if we should return to standby
      if (wasStandbyRef.current && !isStandby) startStandby()
      return
    }

    voiceManager.stop()
    
    // Track if disabled
    if (!autoSpeak) {
      const current = parseInt(localStorage.getItem(`voice_disabled_${episode.id}`) || '0')
      localStorage.setItem(`voice_disabled_${episode.id}`, (current + 1).toString())
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          episodeId: episode.id,
          hostId: episode.host_id,
          currentPhase: episode.current_phase,
          episode,
          hostDna,
          memories,
        }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      // Stream the response text
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantId = crypto.randomUUID()
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          assistantContent += chunk
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
          )
        }
        
        if (autoSpeak) {
          const current = parseInt(localStorage.getItem(`voice_play_${episode.id}`) || '0')
          localStorage.setItem(`voice_play_${episode.id}`, (current + 1).toString())
          
          voiceManager.enqueue(assistantId, assistantContent, {
            voiceId: episode.hosts?.voice_id || undefined,
            rate: episode.hosts?.voice_rate || 1.0,
            pitch: episode.hosts?.voice_pitch || 1.0,
            volume: episode.hosts?.voice_volume || 1.0,
            personality_traits: episode.hosts?.personality_traits || [],
            tone_of_voice: episode.hosts?.tone_of_voice || ''
          })
        }
      }
    } catch (err) {
      console.error('Interview API error:', err)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setIsLoading(false)
      // Auto-resume standby mode if it was active
      if (wasStandbyRef.current && !isStandby) {
        startStandby()
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isRecording || isAutoSubmitting) {
      // If we submit while recording, trigger auto submit logic
      stopRecording()
    } else {
      submitMessage(input)
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full gap-6 bg-background p-6">
      {/* LEFT PANE: HOST CONTEXT */}
      <div className="w-[300px] flex flex-col gap-6 flex-shrink-0">
        <Card className="bg-card border-border shadow-sm flex-1 overflow-hidden flex flex-col rounded-[24px]">
          <CardHeader className="pb-4 pt-6 px-6 border-b border-border">
            <CardTitle className="text-[16px] font-bold flex items-center gap-2 text-foreground font-heading uppercase tracking-wide">
              <Mic className="h-4 w-4 text-primary" />
              Host Intelligence
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="space-y-8 p-6">
              <div className="flex items-center gap-4">
                <div className="h-[60px] w-[60px] bg-secondary border border-border rounded-[18px] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-[18px] text-foreground font-heading">{episode.hosts?.name}</h3>
                  <Badge variant="secondary" className="mt-1.5 bg-secondary text-primary font-semibold border-none px-2.5 py-0.5 rounded-[6px]">
                    {episode.hosts?.interview_style}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Current Phase</h4>
                <div className="bg-secondary/50 border border-border rounded-[14px] p-4 text-center">
                  <span className="font-mono text-primary font-bold text-[13px]">{episode.current_phase}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Host DNA Profile</h4>
                {hostDna ? (
                  <div className="space-y-4">
                    {Object.entries(hostDna).map(([key, value]) => {
                      if (key === 'host_id' || key === 'id') return null
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-[12px] mb-2 font-semibold">
                            <span className="text-foreground capitalize">{key.replace('_', ' ')}</span>
                            <span className="text-primary">{value as number}%</span>
                          </div>
                          <div className="h-[6px] bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${value}%` }} 
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground font-medium">No DNA profile configured.</p>
                )}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      {/* CENTER PANE: CONVERSATION ENGINE */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <div className="flex-1 flex flex-col bg-card border border-border shadow-sm rounded-[24px] overflow-hidden">
          <div className="py-5 px-8 border-b border-border flex flex-row items-center justify-between bg-card/80 backdrop-blur-xl z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-bold text-[18px] text-foreground font-heading tracking-tight">Live Transcript</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch 
                  id="auto-speak" 
                  checked={autoSpeak} 
                  onCheckedChange={setAutoSpeak} 
                  className="data-[state=checked]:bg-primary"
                />
                <label htmlFor="auto-speak" className="text-[13px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Auto-Speak Host
                </label>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Processing</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-background/30" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex flex-col h-full items-center justify-center text-muted-foreground space-y-4">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <p className="text-[15px] font-medium">Conversation hasn't started yet. Speak or type to begin.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="text-[12px] font-bold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                  {msg.role === 'user' ? episode.guests?.name : episode.hosts?.name}
                </div>
                <div 
                  className={`px-6 py-4 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-card border border-border text-foreground rounded-[20px] rounded-tr-[4px]' 
                      : 'bg-secondary border border-border text-foreground rounded-[20px] rounded-tl-[4px]'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-[1.6] font-medium">{msg.content}</p>
                </div>
                {msg.role === 'assistant' && !isLoading && (
                  <div className="flex gap-1 mt-2.5 px-1 bg-secondary/50 rounded-full p-1 border border-border">
                    {playingId === msg.id ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-card rounded-full transition-colors" onClick={() => voiceManager.stop()}>
                        <Square className="h-4 w-4 fill-current" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors" onClick={() => {
                        const current = parseInt(localStorage.getItem(`voice_play_${episode.id}`) || '0')
                        localStorage.setItem(`voice_play_${episode.id}`, (current + 1).toString())
                        
                        voiceManager.stop()
                        voiceManager.enqueue(msg.id, msg.content, {
                          voiceId: episode.hosts?.voice_id || undefined,
                          rate: episode.hosts?.voice_rate || 1.0,
                          pitch: episode.hosts?.voice_pitch || 1.0,
                          volume: episode.hosts?.voice_volume || 1.0,
                          personality_traits: episode.hosts?.personality_traits || [],
                          tone_of_voice: episode.hosts?.tone_of_voice || ''
                        })
                      }}>
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors" onClick={() => {
                      const current = parseInt(localStorage.getItem(`voice_replay_${episode.id}`) || '0')
                      localStorage.setItem(`voice_replay_${episode.id}`, (current + 1).toString())

                      voiceManager.stop()
                      voiceManager.enqueue(msg.id, msg.content, {
                        voiceId: episode.hosts?.voice_id || undefined,
                        rate: episode.hosts?.voice_rate || 1.0,
                        pitch: episode.hosts?.voice_pitch || 1.0,
                        volume: episode.hosts?.voice_volume || 1.0,
                        personality_traits: episode.hosts?.personality_traits || [],
                        tone_of_voice: episode.hosts?.tone_of_voice || ''
                      })
                    }}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    {audioUrls.has(msg.id) && (
                      <a href={audioUrls.get(msg.id)} download={`host-response-${msg.id.slice(0, 4)}.mp3`} title="Download Audio">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors" type="button">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Spotlight style input bar */}
          <div className="p-6 bg-card border-t border-border">
            <form onSubmit={handleSubmit} className="relative flex items-center shadow-sm rounded-full bg-background border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-1.5">
              <Input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isStandby ? `Standby: Say "${episode.hosts?.name}" to wake...` : isRecording ? "Listening..." : isAutoSubmitting ? "Finalizing transcription..." : isTranscribing ? "Transcribing..." : `Type as ${episode.guests?.name}...`}
                className={`flex-1 border-none shadow-none focus-visible:ring-0 text-foreground bg-transparent pl-5 pr-32 h-[48px] text-[15px] font-medium ${isRecording ? 'placeholder:text-destructive' : isStandby ? 'placeholder:text-primary' : 'placeholder:text-muted-foreground'}`}
                disabled={isLoading || isRecording || isAutoSubmitting || isStandby}
                autoComplete="off"
              />
              <div className="absolute right-2 flex items-center gap-2">
                {isStandby ? (
                  <Button 
                    type="button" 
                    onClick={stopStandby} 
                    size="icon" 
                    variant="ghost" 
                    className="h-10 w-10 text-primary bg-primary/10 hover:bg-primary/20 rounded-full animate-pulse"
                    title="Standby Mode Active"
                  >
                    <Ear className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={startStandby} 
                    size="icon" 
                    variant="ghost" 
                    className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                    disabled={isLoading || isRecording || isTranscribing}
                    title="Enable Standby Mode"
                  >
                    <Ear className="h-5 w-5" />
                  </Button>
                )}

                {(isTranscribing || isAutoSubmitting) ? (
                  <div className="h-10 w-10 flex items-center justify-center bg-secondary rounded-full">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                ) : isRecording ? (
                  <Button 
                    type="button" 
                    onClick={stopRecording} 
                    size="icon" 
                    variant="ghost" 
                    className="h-10 w-10 text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-full animate-pulse transition-colors"
                  >
                    <MicOff className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={startRecording} 
                    size="icon" 
                    variant="ghost" 
                    className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-secondary rounded-full transition-colors"
                    disabled={isLoading}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isLoading || isAutoSubmitting || (!input.trim() && !isRecording)} 
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-sm transition-colors"
                  size="icon"
                >
                  <Send className="h-4 w-4 text-white ml-0.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: EPISODE INTELLIGENCE */}
      <div className="w-[300px] flex flex-col gap-6 flex-shrink-0">
        <Card className="bg-card border-border shadow-sm flex-1 overflow-hidden flex flex-col rounded-[24px]">
          <CardHeader className="pb-4 pt-6 px-6 border-b border-border">
            <CardTitle className="text-[16px] font-bold flex items-center gap-2 text-foreground font-heading uppercase tracking-wide">
              <Brain className="h-4 w-4 text-[#8B5CF6]" />
              Episode Intelligence
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="space-y-8 p-6">
              <div>
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Guest Context</h4>
                <div className="bg-secondary/40 border border-border rounded-[16px] p-5 space-y-3 text-[13px] text-foreground shadow-sm font-medium">
                  <p><span className="text-muted-foreground mr-1">Name:</span> {episode.guests?.name}</p>
                  <p><span className="text-muted-foreground mr-1">Company:</span> {episode.guests?.company || 'N/A'}</p>
                  <p className="line-clamp-4 leading-relaxed"><span className="text-muted-foreground mr-1">Bio:</span> {episode.guests?.bio}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
                  Dynamic Memory
                </h4>
                {memories.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground italic font-medium">No facts extracted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {memories.slice(0, 5).map(mem => (
                      <div key={mem.id} className="bg-card border border-border shadow-sm rounded-[16px] p-4 text-[13px] text-foreground font-medium">
                        <Badge variant="outline" className="text-[10px] uppercase mb-3 border-border text-primary bg-secondary px-2">
                          {mem.memory_type}
                        </Badge>
                        <p className="leading-relaxed">{mem.memory_content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {curiosityTargets.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-[#8B5CF6]" />
                    Curiosity Targets
                  </h4>
                  <div className="space-y-3">
                    {curiosityTargets.map(target => (
                      <div key={target.id} className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-[16px] p-4 text-[13px] text-[#8B5CF6] font-semibold shadow-sm leading-relaxed">
                        {target.trigger_statement}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contradictions.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Detected Contradictions
                  </h4>
                  <div className="space-y-3">
                    {contradictions.map(cont => (
                      <div key={cont.id} className="bg-destructive/10 border border-destructive/20 rounded-[16px] p-4 text-[13px] text-destructive font-semibold shadow-sm">
                        High Severity Flag
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
