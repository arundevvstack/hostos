'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Mic, MicOff, Activity, Clock, Zap, Target, Wifi, HardDrive, CheckCircle2, AlertCircle, Loader2, BrainCircuit, Volume2, ShieldAlert, XCircle, ArrowRightLeft, Send, Play, Lightbulb } from 'lucide-react'
import { useMicVAD, utils } from '@ricky0123/vad-react'
import { LiveKitRoom, RoomAudioRenderer, useConnectionState } from '@livekit/components-react'
import '@livekit/components-styles'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isInterim?: boolean
}

type LatencyMetrics = {
  vadLatency: number
  sttLatency: number
  plannerLatency: number
  llmLatency: number
  totalLatency: number
}

type Diagnostics = {
  micStatus: 'requesting' | 'granted' | 'denied' | 'not_found' | 'idle'
  modelLoaded: boolean
  wasmLoaded: boolean
  workletLoaded: boolean
  sttConnected: boolean
}

type DuplexMetrics = {
  attempts: number
  accepted: number
  rejected: number
  selfEchoes: number
  backgroundNoise: number
  abortedStreams: number
  lastIntent: string
  lastConfidence: number
  lastYieldDecision: string
}

type FlowMetrics = {
  hostInterruptions: number
  guestInterruptions: number
  yieldSuccessRate: number
  recoveryEvents: number
  flowScore: number
  budgetUsed: number
  budgetMax: number
}

type InterviewRoomV2Props = {
  episode: any
}

export default function InterviewRoomV2Wrapper({ episode }: InterviewRoomV2Props) {
  const [token, setToken] = useState('')

  useEffect(() => {
    fetch(`/api/livekit/token?room=${episode.id}&participantName=Guest`)
      .then(res => res.json())
      .then(data => {
        if (data.token) setToken(data.token)
      })
  }, [episode.id])

  if (!token) {
    return <div className="flex h-[calc(100vh-64px)] items-center justify-center">Connecting to LiveKit Cloud...</div>
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={true}
    >
      <RoomAudioRenderer />
      <InterviewRoomV2 episode={episode} />
    </LiveKitRoom>
  )
}

function InterviewRoomV2({ episode }: InterviewRoomV2Props) {
  const router = useRouter()
  const [isEnding, setIsEnding] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [rightTab, setRightTab] = useState<'intelligence' | 'inspector' | 'duplex' | 'logs'>('intelligence')
  const [inputText, setInputText] = useState('')
  const [hostDna, setHostDna] = useState<any>(null)
  const [memories, setMemories] = useState<any[]>([])
  const [curiosityTargets, setCuriosityTargets] = useState<any[]>([])
  const [contradictions, setContradictions] = useState<any[]>([])
  const [interimText, setInterimText] = useState('')
  const [isMicMuted, setIsMicMuted] = useState(false)

  useEffect(() => {
    const fetchDna = async () => {
      if (episode.host_id) {
        const supabase = createClient()
        const { data } = await supabase
          .from('host_dna')
          .select('*')
          .eq('host_id', episode.host_id)
          .single()
        if (data) setHostDna(data)
      }
    }
    fetchDna()
  }, [episode.host_id])

  const fetchIntelligenceData = async () => {
    try {
      const supabase = createClient()
      const [memRes, curRes, conRes] = await Promise.all([
        supabase.from('conversation_memory').select('*').eq('episode_id', episode.id).order('created_at', { ascending: false }),
        supabase.from('curiosity_targets').select('*').eq('episode_id', episode.id).eq('status', 'pending'),
        supabase.from('contradictions').select('*').eq('episode_id', episode.id).eq('status', 'pending')
      ])
      if (memRes.data) setMemories(memRes.data)
      if (curRes.data) setCuriosityTargets(curRes.data)
      if (conRes.data) setContradictions(conRes.data)
    } catch (e) {
      console.error('Error fetching intelligence data:', e)
    }
  }

  useEffect(() => {
    fetchIntelligenceData()
    const interval = setInterval(fetchIntelligenceData, 5000)
    return () => clearInterval(interval)
  }, [episode.id])
  const connectionState = useConnectionState()
  
  // Audio Queue Refs
  const audioQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const duckingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Web Speech API Ref (Phase 8F Interim)
  const recognitionRef = useRef<any>(null)
  const lastNegotiationTimeRef = useRef<number>(0)
  
  // Phase 8D, 8E & 8F states
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const currentAiSentenceRef = useRef<string>('')
  const currentAssistantMsgIdRef = useRef<string>('')

  const [metrics, setMetrics] = useState<LatencyMetrics>({
    vadLatency: 0, sttLatency: 0, plannerLatency: 0, llmLatency: 0, totalLatency: 0
  })

  const [duplexMetrics, setDuplexMetrics] = useState<DuplexMetrics>({
    attempts: 0, accepted: 0, rejected: 0, selfEchoes: 0, backgroundNoise: 0, abortedStreams: 0,
    lastIntent: 'NONE', lastConfidence: 0, lastYieldDecision: 'IDLE'
  })

  const [flowMetrics, setFlowMetrics] = useState<FlowMetrics>({
    hostInterruptions: 0, guestInterruptions: 0, yieldSuccessRate: 100, recoveryEvents: 0, flowScore: 100, budgetUsed: 0, budgetMax: 5
  })

  const [health, setHealth] = useState({
    silenceDuration: 0, avgSpeakingDuration: 0, currentSpeechDuration: 0, turnCount: 0,
  })

  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    micStatus: 'idle', modelLoaded: false, wasmLoaded: false, workletLoaded: false, sttConnected: true,
  })

  const [debugState, setDebugState] = useState({
    plannerDecision: 'IDLE', currentPhase: 'INTRODUCTION', contextUsed: 'None', negotiationDecision: 'IDLE', negotiationTrigger: 'NONE'
  })

  // Pipeline status state
  const [pipelineState, setPipelineState] = useState<Record<string, 'Waiting' | 'Running' | 'Success' | 'Failed'>>({
    vad: 'Waiting',
    transcript: 'Waiting',
    planner: 'Waiting',
    memory: 'Waiting',
    knowledge: 'Waiting',
    promptAssembly: 'Waiting',
    llm: 'Waiting',
    tts: 'Waiting',
    audioQueue: 'Waiting',
    playback: 'Waiting',
  })

  // Test mode: 'normal' (Mode 3), 'emergency' (Mode 1), 'no_tts' (Mode 2)
  const [testMode, setTestMode] = useState<'normal' | 'emergency' | 'no_tts'>('normal')

  // Real-time audit logs
  const [auditLogs, setAuditLogs] = useState<string[]>([])
  
  // Raw Planner JSON
  const [rawPlannerJson, setRawPlannerJson] = useState<string>('{}')

  const addAuditLog = (stage: string, message: string) => {
    const timestamp = new Date().toISOString().substring(11, 19)
    setAuditLogs(prev => [...prev, `[${timestamp}] [${stage}] ${message}`])
  }

  const getStageColor = (status: 'Waiting' | 'Running' | 'Success' | 'Failed') => {
    switch (status) {
      case 'Waiting': return 'text-zinc-400 bg-zinc-50 border-zinc-200'
      case 'Running': return 'text-amber-600 bg-amber-50 border-amber-200 animate-pulse'
      case 'Success': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'Failed': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const speechStartTimeRef = useRef<number>(0)
  const vadEndTimeRef = useRef<number>(0)
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const checkMic = async () => {
      setDiagnostics(d => ({ ...d, micStatus: 'requesting' }))
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (stream) {
          setDiagnostics(d => ({ ...d, micStatus: 'granted' }))
          stream.getTracks().forEach(track => track.stop())
        }
      } catch (err: any) {
        setDiagnostics(d => ({ ...d, micStatus: 'denied' }))
      }
    }
    checkMic()

    // Initialize Web Speech API for Phase 8F Streaming STT
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (!event.results[i].isFinal) interim += event.results[i][0].transcript
        }
        if (interim.length > 20 && !isPlayingRef.current) {
          triggerTurnNegotiation(interim)
        }
      }
      recognitionRef.current = rec
    }
  }, [])

  // --------------------------------------------------------
  // Phase 8F: Turn Negotiation Engine
  // --------------------------------------------------------
  const triggerTurnNegotiation = async (interimTranscript: string) => {
    const now = performance.now()
    if (now - lastNegotiationTimeRef.current < 5000) return // Rate limit negotiation to every 5s
    lastNegotiationTimeRef.current = now

    try {
      const res = await fetch('/api/negotiate-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interimTranscript,
          transcriptHistory: messages,
          hostDna: episode.hosts?.host_dna,
          interruptBudget: { used: flowMetrics.budgetUsed, max: flowMetrics.budgetMax },
          isGuestSpeaking: true
        })
      })
      const data = await res.json()
      
      setDebugState(prev => ({
        ...prev,
        negotiationDecision: data.decision,
        negotiationTrigger: data.trigger
      }))

      if (data.decision === 'HOST_INTERRUPTS') {
        // Trigger Host Interruption
        setFlowMetrics(prev => ({ 
          ...prev, 
          hostInterruptions: prev.hostInterruptions + 1, 
          budgetUsed: prev.budgetUsed + 1,
          flowScore: Math.max(0, prev.flowScore - 5) // Slight penalty for interrupting
        }))
        
        setInterimText(`Host Interrupting: ${data.trigger}...`)
        
        // Force VAD speech end to stop listening
        if (recognitionRef.current) recognitionRef.current.stop()
        
        // Inject the interim transcript into history so the AI has context
        const newUserMsg: Message = { id: crypto.randomUUID(), role: 'user', content: interimTranscript + ' ... [Interrupted by Host]' }
        const newHistory = [...messages, newUserMsg]
        setMessages(newHistory)
        
        triggerPlanner(newHistory, data.trigger) // Special planner trigger
      }
    } catch (err) {
      console.error('Turn Negotiation Error:', err)
    }
  }

  // --------------------------------------------------------
  // Audio Playback & Ducking
  // --------------------------------------------------------
  const startDucking = () => {
    if (!currentAudioRef.current) return
    if (duckingIntervalRef.current) clearInterval(duckingIntervalRef.current)
    let vol = currentAudioRef.current.volume
    duckingIntervalRef.current = setInterval(() => {
      if (vol > 0.2 && currentAudioRef.current) {
        vol = Math.max(0.2, vol - 0.1)
        currentAudioRef.current.volume = vol
      } else {
        if (duckingIntervalRef.current) clearInterval(duckingIntervalRef.current)
      }
    }, 50)
  }

  const stopDucking = () => {
    if (!currentAudioRef.current) return
    if (duckingIntervalRef.current) clearInterval(duckingIntervalRef.current)
    let vol = currentAudioRef.current.volume
    duckingIntervalRef.current = setInterval(() => {
      if (vol < 1.0 && currentAudioRef.current) {
        vol = Math.min(1.0, vol + 0.1)
        currentAudioRef.current.volume = vol
      } else {
        if (duckingIntervalRef.current) clearInterval(duckingIntervalRef.current)
      }
    }, 50)
  }

  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      setIsAiSpeaking(false)
      currentAiSentenceRef.current = ''
      setPipelineState(prev => ({ ...prev, playback: 'Success' }))
      addAuditLog('Playback', 'Audio queue is empty. Playback finished.')
      return
    }
    
    isPlayingRef.current = true
    setIsAiSpeaking(true)

    const nextItem = audioQueueRef.current.shift()!
    const parsed = JSON.parse(nextItem)
    const { url, sentence, fallbackText } = parsed
    currentAiSentenceRef.current = sentence
    
    if (fallbackText) {
      addAuditLog('Playback', `Using browser speech synthesis for: "${fallbackText}"`)
      setPipelineState(prev => ({ ...prev, playback: 'Running' }))
      
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel() // Stop any previous speech
        const utterance = new SpeechSynthesisUtterance(fallbackText)
        
        const hostObj = episode.hosts || {}
        const rate = hostObj.voice_rate !== undefined ? Number(hostObj.voice_rate) : 1.0
        const pitch = hostObj.voice_pitch !== undefined ? Number(hostObj.voice_pitch) : 1.0
        const volume = hostObj.voice_volume !== undefined ? Number(hostObj.voice_volume) : 1.0
        const voiceId = hostObj.voice_id || ''

        utterance.rate = rate
        utterance.pitch = pitch
        utterance.volume = volume

        const voices = window.speechSynthesis.getVoices()
        if (voiceId) {
          const selectedVoice = voices.find(v => v.voiceURI === voiceId || v.name === voiceId)
          if (selectedVoice) {
            utterance.voice = selectedVoice
          } else {
            const englishVoice = voices.find(v => v.lang.startsWith('en'))
            if (englishVoice) utterance.voice = englishVoice
          }
        } else {
          const englishVoice = voices.find(v => v.lang.startsWith('en'))
          if (englishVoice) utterance.voice = englishVoice
        }
        
        utterance.onend = () => {
          addAuditLog('Playback', `SpeechSynthesis finished: "${fallbackText}"`)
          playNextInQueue()
        }
        utterance.onerror = (err) => {
          addAuditLog('Playback', `SpeechSynthesis error: ${err.error || err}`)
          playNextInQueue()
        }
        window.speechSynthesis.speak(utterance)
      } else {
        addAuditLog('Playback', `SpeechSynthesis not supported. Bypassing: "${fallbackText}"`)
        playNextInQueue()
      }
      return
    }

    addAuditLog('Playback', `Playing audio for sentence: "${sentence}"`)
    setPipelineState(prev => ({ ...prev, playback: 'Running' }))

    const audio = new Audio(url)
    currentAudioRef.current = audio
    audio.onended = () => {
      URL.revokeObjectURL(url)
      addAuditLog('Playback', `Finished playing: "${sentence}"`)
      playNextInQueue()
    }
    audio.onerror = () => {
      addAuditLog('Playback', `Playback error for: "${sentence}"`)
      setPipelineState(prev => ({ ...prev, playback: 'Failed' }))
      playNextInQueue()
    }
    audio.play().catch(e => {
      addAuditLog('Playback', `Playback play() failed: ${e.message || e}`)
      setPipelineState(prev => ({ ...prev, playback: 'Failed' }))
      playNextInQueue()
    })
  }

  const enqueueAudio = (blob: Blob, sentence: string) => {
    const url = URL.createObjectURL(blob)
    audioQueueRef.current.push(JSON.stringify({ url, sentence }))
    setPipelineState(prev => ({ ...prev, audioQueue: 'Success' }))
    addAuditLog('AudioQueue', `Enqueued audio blob. Queue length: ${audioQueueRef.current.length}`)
    if (!isPlayingRef.current) playNextInQueue()
  }

  const fetchTTS = async (text: string, signal?: AbortSignal) => {
    if (testMode === 'no_tts') {
      addAuditLog('TTS', `TTS generation bypassed for: "${text}"`)
      setPipelineState(prev => ({ ...prev, tts: 'Waiting' }))
      return
    }

    const hostObj = episode.hosts || {}
    const voiceProvider = hostObj.voice_provider || 'browser'
    const voiceId = hostObj.voice_id || ''

    if (voiceProvider === 'browser') {
      addAuditLog('TTS', `Using browser native speech engine for host: "${text}"`)
      audioQueueRef.current.push(JSON.stringify({ fallbackText: text, sentence: text }))
      if (!isPlayingRef.current) playNextInQueue()
      return
    }

    try {
      setPipelineState(prev => ({ ...prev, tts: 'Running' }))
      addAuditLog('TTS', `Generating audio with ElevenLabs voice (${voiceId}) for sentence: "${text}"`)
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: voiceId || undefined, episodeId: episode.id }),
        signal
      })
      if (!res.ok) throw new Error(`TTS API returned status ${res.status}`)
      const blob = await res.blob()
      setPipelineState(prev => ({ ...prev, tts: 'Success' }))
      addAuditLog('TTS', `Audio returned successfully from TTS for: "${text}"`)
      enqueueAudio(blob, text)
    } catch (e: any) {
      if (e.name === 'AbortError') {
        addAuditLog('TTS', `TTS generation aborted for: "${text}"`)
      } else {
        setPipelineState(prev => ({ ...prev, tts: 'Failed' }))
        addAuditLog('TTS', `ElevenLabs failed: ${e.message || e}. Enqueuing browser fallback speech synthesis...`)
        
        // Enqueue fallback text to be spoken by browser speechSynthesis in order
        audioQueueRef.current.push(JSON.stringify({ fallbackText: text, sentence: text }))
        if (!isPlayingRef.current) playNextInQueue()
      }
    }
  }

  // --------------------------------------------------------
  // Phase 8E & 8F: Yield Actions & Recovery Engine
  // --------------------------------------------------------
  const executeReplan = async (interruptText: string, requiresRecovery: boolean = false) => {
    const newUserMsg: Message = { id: crypto.randomUUID(), role: 'user', content: interruptText }
    
    if (requiresRecovery) {
      setFlowMetrics(prev => ({ ...prev, recoveryEvents: prev.recoveryEvents + 1 }))
    }

    setMessages(prev => {
      const newHistory = [...prev, newUserMsg]
      triggerPlanner(newHistory, requiresRecovery ? 'RECOVERY_REQUIRED' : undefined)
      return newHistory
    })
  }

  const handleYieldImmediately = (interruptText: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    audioQueueRef.current = []
    
    // Stop any browser speech synthesis immediately
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    if (currentAudioRef.current) {
      const audio = currentAudioRef.current
      let vol = audio.volume
      const fadeOut = setInterval(() => {
        if (vol > 0.1) { vol -= 0.1; audio.volume = vol } 
        else { clearInterval(fadeOut); audio.pause(); isPlayingRef.current = false; setIsAiSpeaking(false) }
      }, 20)
    } else {
      isPlayingRef.current = false; setIsAiSpeaking(false)
    }
    setInterimText('Recovering gracefully...')
    executeReplan(interruptText, true) // Force Recovery Engine
  }

  const handleYieldAfterSentence = (interruptText: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    audioQueueRef.current = []
    setInterimText('Replanning based on interruption...')
    executeReplan(interruptText, false)
  }

  // --------------------------------------------------------
  // Planner & Response Engine
  // --------------------------------------------------------
  const triggerEmergencyLLM = async (transcriptText: string) => {
    try {
      const llmStartTime = performance.now()
      addAuditLog('LLM', 'Sending direct LLM request (bypassing planner)...')
      
      const res = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptHistory: [...messages, { id: crypto.randomUUID(), role: 'user', content: transcriptText }],
          episode,
          plannerDecision: { decision: 'RESPOND', reasoning: 'Emergency Direct Mode enabled.' },
          currentPhase: debugState.currentPhase
        })
      })

      if (!res.ok) throw new Error(`LLM route returned status ${res.status}`)
      if (!res.body) throw new Error('No stream body received from LLM')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let firstTokenReceived = false
      
      const assistantMessageId = crypto.randomUUID()
      currentAssistantMsgIdRef.current = assistantMessageId
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }])

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunkValue = decoder.decode(value, { stream: !done })
          if (!firstTokenReceived && chunkValue.trim().length > 0) {
             firstTokenReceived = true
             const ttft = performance.now() - llmStartTime
             addAuditLog('LLM', `First token received (TTFT: ${Math.round(ttft)}ms). Streaming response...`)
             setPipelineState(prev => ({ ...prev, llm: 'Success' }))
          }
          setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: msg.content + chunkValue } : msg ))
        }
      }
      addAuditLog('LLM', 'Direct LLM stream completed successfully.')
    } catch (err: any) {
      setPipelineState(prev => ({ ...prev, llm: 'Failed' }))
      addAuditLog('LLM', `Direct LLM request failed: ${err.message || err}`)
    }
  }

  const triggerPlanner = async (currentHistory: Message[], forceTrigger?: string) => {
    try {
      setInterimText('Planning...')
      setPipelineState(prev => ({ ...prev, planner: 'Running', memory: 'Running', knowledge: 'Running', promptAssembly: 'Running' }))
      addAuditLog('Planner', 'Sending history to Response Planner...')
      const plannerStartTime = performance.now()
      const plannerRes = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptHistory: currentHistory, episode, currentPhase: debugState.currentPhase, forceTrigger })
      })
      const plannerLatency = performance.now() - plannerStartTime
      const plannerData = await plannerRes.json()
      
      setRawPlannerJson(JSON.stringify(plannerData, null, 2))

      if (!plannerRes.ok) throw new Error(plannerData.error || `Planner returned status ${plannerRes.status}`)
      
      const decision = plannerData.planner?.decision || 'WAIT'
      const reasoning = plannerData.planner?.reasoning || 'No reasoning provided.'
      
      setDebugState(prev => ({
        ...prev, plannerDecision: decision, contextUsed: `Memories: ${plannerData.contextUsed?.memoryCount}, Knowledge: ${plannerData.contextUsed?.knowledgeCount}`
      }))
      setMetrics(prev => ({ ...prev, plannerLatency: Math.round(plannerLatency) }))
      setInterimText('')

      setPipelineState(prev => ({
        ...prev,
        planner: 'Success',
        memory: 'Success',
        knowledge: 'Success',
        promptAssembly: 'Success'
      }))
      addAuditLog('Planner', `Planner Decision: ${decision}. Reason: ${reasoning} (Planner latency: ${Math.round(plannerLatency)}ms)`)

      if (decision !== 'WAIT' || forceTrigger) {
        if (testMode === 'no_tts') {
          setPipelineState(prev => ({ ...prev, llm: 'Running', tts: 'Waiting', audioQueue: 'Waiting', playback: 'Waiting' }))
        } else {
          setPipelineState(prev => ({ ...prev, llm: 'Running' }))
        }
        addAuditLog('LLM', 'Response approved by planner. Triggering response stream...')
        await generateAIResponse(currentHistory, plannerData.planner, forceTrigger)
      } else {
        addAuditLog('LLM', 'Planner decided to WAIT. AI Host will not respond.')
        setPipelineState(prev => ({
          ...prev,
          llm: 'Waiting',
          tts: 'Waiting',
          audioQueue: 'Waiting',
          playback: 'Waiting'
        }))
      }
    } catch (err: any) {
      setInterimText('')
      setPipelineState(prev => ({ ...prev, planner: 'Failed', memory: 'Failed', knowledge: 'Failed', promptAssembly: 'Failed' }))
      addAuditLog('Planner', `Planner Error: ${err.message || err}`)
    }
  }

  const generateAIResponse = async (transcriptHistory: Message[], plannerDecision: any, forceTrigger?: string) => {
    try {
      const llmStartTime = performance.now()
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal
      
      addAuditLog('LLM', 'Requesting response stream from LLM...')
      const res = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptHistory,
          episode,
          plannerDecision,
          currentPhase: debugState.currentPhase,
          forceTrigger
        }),
        signal
      })

      if (!res.ok) throw new Error(`LLM route returned status ${res.status}`)
      if (!res.body) throw new Error('No stream body received from LLM')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let firstTokenReceived = false
      let currentSentenceBuffer = ''
      
      const assistantMessageId = crypto.randomUUID()
      currentAssistantMsgIdRef.current = assistantMessageId
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }])

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunkValue = decoder.decode(value, { stream: !done })
          if (!firstTokenReceived && chunkValue.trim().length > 0) {
             firstTokenReceived = true
             const ttft = performance.now() - llmStartTime
             addAuditLog('LLM', `First token received (TTFT: ${Math.round(ttft)}ms). Streaming response...`)
             setPipelineState(prev => ({ ...prev, llm: 'Success' }))
             setMetrics(prev => ({ ...prev, llmLatency: Math.round(ttft) }))
          }
          setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: msg.content + chunkValue } : msg ))

          currentSentenceBuffer += chunkValue
          const match = currentSentenceBuffer.match(/([^.!?]+[.!?]+)(.*)/)
          if (match) {
             const sentence = match[1].trim()
             currentSentenceBuffer = match[2] || ''
             if (sentence.length > 0) {
               addAuditLog('Sentence Chunker', `Extracted sentence: "${sentence}"`)
               fetchTTS(sentence, signal)
             }
          }
        }
      }
      addAuditLog('LLM', 'LLM response stream completed.')
      if (currentSentenceBuffer.trim().length > 0 && !signal.aborted) {
        addAuditLog('Sentence Chunker', `Extracted final sentence: "${currentSentenceBuffer.trim()}"`)
        fetchTTS(currentSentenceBuffer.trim(), signal)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addAuditLog('LLM', 'LLM Response stream aborted.')
      } else {
        setPipelineState(prev => ({ ...prev, llm: 'Failed' }))
        addAuditLog('LLM', `LLM Stream Error: ${err.message || err}`)
      }
    }
  }

  // --------------------------------------------------------
  // VAD Engine
  // --------------------------------------------------------
  const vad = useMicVAD({
    startOnLoad: true,
    model: "legacy",
    baseAssetPath: "/",
    onnxWASMBasePath: "/",
    redemptionMs: 300,
    ortConfig: (ort: any) => {
      ort.env.wasm.numThreads = 1;
    },
    onSpeechStart: () => {
      speechStartTimeRef.current = performance.now()
      if (recognitionRef.current) {
        try { recognitionRef.current.start() } catch (e) {}
      }

      if (isPlayingRef.current) {
        setInterimText('Interrupt Monitor Active...')
        setDuplexMetrics(prev => ({ ...prev, attempts: prev.attempts + 1 }))
        startDucking()
      } else {
        setInterimText('Listening...')
      }
      
      speakingIntervalRef.current = setInterval(() => {
        setHealth(prev => ({ ...prev, currentSpeechDuration: prev.currentSpeechDuration + 100 }))
      }, 100)
    },
    onSpeechEnd: async (audio: Float32Array) => {
      if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current)
      if (recognitionRef.current) recognitionRef.current.stop()

      const vadEndTime = performance.now()
      const vadLatency = vadEndTime - speechStartTimeRef.current
      
      setPipelineState(prev => ({ ...prev, vad: 'Success', transcript: 'Running' }))
      addAuditLog('VAD', `Speech End detected (Speech duration: ${Math.round(vadLatency)}ms). Processing audio buffer.`)

      if (isPlayingRef.current) {
        stopDucking()
        setInterimText('Classifying Interrupt...')
      } else {
        setInterimText('Transcribing...')
      }

      try {
        const turnStartTime = performance.now()
        const sttStartTime = performance.now()
        const wavBuffer = utils.encodeWAV(audio)
        const formData = new FormData()
        formData.append('audio', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav')
        formData.append('episodeId', episode.id)

        addAuditLog('STT', 'Sending audio blob to Groq Whisper transcription API...')
        const sttRes = await fetch('/api/transcribe', { method: 'POST', body: formData })
        const sttLatency = performance.now() - sttStartTime
        
        if (!sttRes.ok) throw new Error(`Transcription failed with status ${sttRes.status}`)
        const sttData = await sttRes.json()
        if (!sttData.transcript) { 
          setInterimText('')
          setPipelineState(prev => ({ ...prev, transcript: 'Waiting' }))
          addAuditLog('STT', 'Transcription returned an empty string.')
          return 
        }

        const transcriptText = sttData.transcript
        setPipelineState(prev => ({ ...prev, transcript: 'Success' }))
        addAuditLog('STT', `Transcribed: "${transcriptText}" (STT latency: ${Math.round(sttLatency)}ms)`)
        setMetrics(prev => ({ ...prev, vadLatency: Math.round(vadLatency), sttLatency: Math.round(sttLatency), totalLatency: Math.round(performance.now() - turnStartTime) }))

        // Phase 8E Branch: Yield Engine
        if (isPlayingRef.current) {
          addAuditLog('Yield Engine', 'Interruption detected during AI playback. Invoking interrupt classifier...')
          const classifierRes = await fetch('/api/classify-interrupt', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interruptText: transcriptText, hostContext: currentAiSentenceRef.current })
          })
          const classifierData = await classifierRes.json()
          
          const intent = classifierData.classification?.intent || 'Background Noise'
          const yieldDecision = classifierData.classification?.yield_decision || 'CONTINUE'
          
          addAuditLog('Yield Engine', `Interruption Classified: ${intent}. Yield Decision: ${yieldDecision}`)
          
          setDuplexMetrics(prev => ({
            ...prev, lastIntent: intent, lastYieldDecision: yieldDecision,
            selfEchoes: intent === 'Self Echo' ? prev.selfEchoes + 1 : prev.selfEchoes,
            backgroundNoise: intent === 'Background Noise' ? prev.backgroundNoise + 1 : prev.backgroundNoise,
            accepted: (yieldDecision !== 'CONTINUE') ? prev.accepted + 1 : prev.accepted,
            rejected: (yieldDecision === 'CONTINUE') ? prev.rejected + 1 : prev.rejected
          }))
          
          if (yieldDecision !== 'CONTINUE') {
            setFlowMetrics(prev => ({ ...prev, guestInterruptions: prev.guestInterruptions + 1, flowScore: Math.min(100, prev.flowScore + 2) }))
          }

          if (yieldDecision === 'YIELD_IMMEDIATELY') handleYieldImmediately(transcriptText)
          else if (yieldDecision === 'YIELD_AFTER_SENTENCE') handleYieldAfterSentence(transcriptText)
          else setInterimText('')
          
          return
        }

        // Normal Flow
        const newUserMsg: Message = { id: crypto.randomUUID(), role: 'user', content: transcriptText }
        const newHistory = [...messages, newUserMsg]
        setMessages(newHistory)
        
        if (testMode === 'emergency') {
          setPipelineState(prev => ({
            ...prev,
            planner: 'Waiting',
            memory: 'Waiting',
            knowledge: 'Waiting',
            promptAssembly: 'Success',
            llm: 'Running'
          }))
          addAuditLog('Emergency Mode', 'Bypassing Planner/Memory/Knowledge. Routing direct to LLM.')
          await triggerEmergencyLLM(transcriptText)
        } else {
          await triggerPlanner(newHistory)
        }

      } catch (err: any) { 
        setInterimText('') 
        setPipelineState(prev => ({ ...prev, transcript: 'Failed' }))
        addAuditLog('STT', `STT Error: ${err.message || err}`)
      }
    }
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, interimText])

  const toggleMic = () => {
    if (isMicMuted) vad.start()
    else vad.pause()
    setIsMicMuted(!isMicMuted)
  }

  const handleEndPodcast = async () => {
    setIsEnding(true)
    addAuditLog('System', 'Ending podcast session...')
    
    // Stop mic VAD
    try {
      vad.pause()
    } catch (e) {}
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
    }

    // Stop audio playback
    audioQueueRef.current = []
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
      } catch (e) {}
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('episodes')
        .update({ status: 'Completed' })
        .eq('id', episode.id)

      if (error) throw error
      addAuditLog('System', 'Session status updated to Completed.')
      router.push(`/dashboard/episodes/${episode.id}/studio`)
    } catch (err: any) {
      console.error('Error ending podcast:', err)
      addAuditLog('System', `Failed to end session: ${err.message || err}`)
      router.push(`/dashboard/episodes/${episode.id}/studio`)
    } finally {
      setIsEnding(false)
    }
  }

  const replayMessage = (content: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(content)
      const hostObj = episode.hosts || {}
      utterance.rate = hostObj.voice_rate !== undefined ? Number(hostObj.voice_rate) : 1.0
      utterance.pitch = hostObj.voice_pitch !== undefined ? Number(hostObj.voice_pitch) : 1.0
      utterance.volume = hostObj.voice_volume !== undefined ? Number(hostObj.voice_volume) : 1.0
      
      const voices = window.speechSynthesis.getVoices()
      const voiceId = hostObj.voice_id || ''
      if (voiceId) {
        const selectedVoice = voices.find(v => v.voiceURI === voiceId || v.name === voiceId)
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleTextInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed || isEnding) return

    addAuditLog('System', `Guest typed: "${trimmed}"`)
    const newUserMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const newHistory = [...messages, newUserMsg]
    setMessages(newHistory)
    setInputText('')

    if (testMode === 'emergency') {
      setPipelineState(prev => ({
        ...prev,
        planner: 'Waiting',
        memory: 'Waiting',
        knowledge: 'Waiting',
        promptAssembly: 'Success',
        llm: 'Running'
      }))
      addAuditLog('Emergency Mode', 'Bypassing Planner. Routing direct to LLM.')
      await triggerEmergencyLLM(trimmed)
    } else {
      await triggerPlanner(newHistory)
    }
  }

  const turnState = (vad.userSpeaking && isAiSpeaking) ? 'Guest Interrupting'
    : debugState.negotiationDecision === 'HOST_INTERRUPTS' ? 'Host Interrupting'
    : isAiSpeaking ? 'AI Speaking'
    : vad.userSpeaking ? 'Guest Speaking' 
    : interimText.includes('Classifying') ? 'Classifying'
    : interimText.includes('Recovering') ? 'Recovering'
    : interimText.includes('Replanning') ? 'Replanning'
    : interimText === 'Transcribing...' ? 'Transcribing'
    : interimText === 'Planning...' ? 'Planning'
    : 'Listening'

  const turnColor = turnState === 'Guest Interrupting' ? 'bg-red-500'
    : turnState === 'Host Interrupting' ? 'bg-orange-500'
    : turnState.includes('Recovering') || turnState === 'Replanning' ? 'bg-purple-600'
    : isAiSpeaking ? 'bg-purple-500'
    : turnState === 'Guest Speaking' ? 'bg-emerald-500' 
    : (turnState.includes('Transcribing') || turnState.includes('Planning') || turnState.includes('Classifying')) ? 'bg-amber-500' 
    : 'bg-blue-500'

  const DiagnosticRow = ({ label, status, isGood }: { label: string, status: string, isGood: boolean }) => (
    <div className="flex justify-between items-center bg-secondary/50 p-2.5 rounded-lg border border-border">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-foreground uppercase truncate max-w-[100px]">{status}</span>
        {isGood ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : status === 'requesting' || status === 'loading' ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-64px)] w-full gap-6 bg-[#F8F8F7] p-6 overflow-hidden font-sans">
      
      {/* LEFT COLUMN: CONTROL & DIALOGUE METRICS */}
      <div className="w-[360px] flex flex-col gap-6 flex-shrink-0 overflow-y-auto pr-1 scrollbar-thin">
        
        {/* Unified Turn Control Center */}
        <Card className="bg-white border border-[#E5E7EB] shadow-sm flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-md flex-shrink-0">
          {/* Header */}
          <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-gradient-to-r from-red-50/50 to-white">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isMicMuted ? 'bg-zinc-400' : 'bg-red-500'
                }`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isMicMuted ? 'bg-zinc-400' : 'bg-[#C1121F]'
                }`} />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C]">
                Turn Negotiation
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border-red-200 bg-red-50/50 text-[#C1121F]">
              {turnState}
            </Badge>
          </div>
          
          <CardContent className="p-6 flex flex-col items-center">
            {/* Mic Status Toggle Switch */}
            <div className="flex items-center justify-between w-full p-3 mb-6 rounded-xl border border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${isMicMuted ? 'bg-zinc-300' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-xs font-semibold text-zinc-700">Microphone Status</span>
              </div>
              <button
                onClick={toggleMic}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isMicMuted ? 'bg-zinc-250' : 'bg-[#C1121F]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isMicMuted ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* VAD Error Banner */}
            {vad.errored && (
              <div className="w-full p-4 mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider block">VAD Error</span>
                  <p className="text-[11px] font-medium leading-relaxed">{vad.errored}</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    className="h-8 text-[10px] font-bold px-3 border-red-200 hover:bg-red-100 text-[#C1121F] bg-white mt-2 rounded-lg"
                  >
                    Reload Page
                  </Button>
                </div>
              </div>
            )}

            {/* VAD Loading Spinner */}
            {vad.loading && !vad.errored && (
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-6 p-3 bg-zinc-50 rounded-xl border border-zinc-150 w-full justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#C1121F]" />
                <span>Loading VAD Models...</span>
              </div>
            )}

            {/* Pulsing Visualizer Circle */}
            <div className="relative h-44 w-44 rounded-full flex items-center justify-center mb-6 bg-gradient-to-tr from-zinc-50 to-zinc-100/50 shadow-inner">
              <div className={`absolute inset-0 rounded-full blur-xl opacity-30 transition-all duration-500 ${
                turnState === 'Guest Speaking' ? 'bg-emerald-500 animate-pulse' :
                turnState === 'Guest Interrupting' ? 'bg-red-500 animate-ping' :
                isAiSpeaking ? 'bg-[#C1121F] animate-pulse' : 'bg-blue-400 animate-pulse'
              }`} />
              
              <div className={`absolute inset-4 rounded-full opacity-10 transition-all duration-300 ${
                turnState === 'Guest Speaking' ? 'bg-emerald-400' :
                turnState === 'Guest Interrupting' ? 'bg-red-400' :
                isAiSpeaking ? 'bg-red-500' : 'bg-blue-300'
              }`} />
              
              <button 
                onClick={toggleMic}
                className={`h-32 w-32 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-xl transition-all duration-500 transform active:scale-95 ${
                  isMicMuted ? 'bg-zinc-800 text-white' :
                  turnState === 'Guest Speaking' ? 'bg-emerald-600 text-white' :
                  turnState === 'Guest Interrupting' ? 'bg-[#C1121F] text-white animate-bounce' :
                  isAiSpeaking ? 'bg-indigo-600 text-white' : 'bg-[#1C1C1C] text-white'
                }`}
              >
                {isMicMuted ? <MicOff className="h-10 w-10 text-white" />
                 : turnState === 'Guest Interrupting' ? <ShieldAlert className="h-10 w-10 text-white" /> 
                 : turnState === 'Host Interrupting' ? <ArrowRightLeft className="h-10 w-10 text-white animate-spin" />
                 : turnState.includes('Recover') || turnState === 'Replanning' ? <BrainCircuit className="h-10 w-10 text-white animate-pulse" />
                 : isAiSpeaking ? <Volume2 className="h-10 w-10 text-white animate-pulse" /> 
                 : <Mic className="h-10 w-10 text-white" />}
                
                <span className="text-[9px] font-bold uppercase tracking-widest mt-2.5 opacity-90 font-mono">
                  {isMicMuted ? 'MIC OFF' :
                   turnState === 'Guest Speaking' ? 'GUEST SPEAK' :
                   turnState === 'Guest Interrupting' ? 'INTERRUPT' :
                   isAiSpeaking ? 'HOST SPEAKS' : 'LISTENING'}
                </span>
              </button>
            </div>

            {/* Premium Animated Audio Wave Visualizer */}
            <div className="flex gap-1.5 justify-center items-end h-8 mb-6 w-full px-4">
              {[...Array(15)].map((_, i) => {
                const isActive = (turnState === 'Guest Speaking' || isAiSpeaking) && !isMicMuted
                const delay = `${i * 0.05}s`
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      turnState === 'Guest Speaking' ? 'bg-emerald-500' :
                      isAiSpeaking ? 'bg-indigo-500' : 'bg-red-500/80'
                    } ${isActive ? 'animate-pulse' : 'h-1.5 opacity-40'}`}
                    style={{
                      height: isActive ? `${Math.max(6, Math.floor(Math.random() * 26))}px` : '6px',
                      animationDelay: delay,
                      animationDuration: '0.4s'
                    }}
                  />
                )
              })}
            </div>

            {/* Mic Toggle Button */}
            <Button 
              onClick={toggleMic} 
              variant={isMicMuted ? 'destructive' : 'outline'} 
              className={`w-full rounded-2xl h-12 font-bold shadow-sm transition-all duration-300 border-zinc-200 ${
                isMicMuted ? 'bg-[#C1121F] hover:bg-red-700 text-white' : 'bg-white hover:bg-zinc-50 text-[#1C1C1C]'
              }`}
            >
              {isMicMuted ? (
                <><MicOff className="mr-2 h-4 w-4" /> Turn Microphone ON</>
              ) : (
                <><Mic className="mr-2 h-4 w-4 text-[#C1121F]" /> Turn Microphone OFF</>
              )}
            </Button>

            {/* End Podcast Session Button */}
            <Button
              onClick={handleEndPodcast}
              disabled={isEnding}
              className="w-full rounded-2xl h-12 font-bold shadow-sm transition-all duration-300 bg-zinc-900 hover:bg-zinc-800 text-white mt-3"
            >
              {isEnding ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ending Session...</>
              ) : (
                <><XCircle className="mr-2 h-4 w-4 text-red-500 animate-pulse" /> End Podcast Session</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Host DNA Profile Card */}
        {hostDna && (
          <Card className="bg-white border border-[#E5E7EB] shadow-sm flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-md flex-shrink-0">
            <div className="p-5 border-b border-[#E5E7EB] bg-gradient-to-r from-red-50/50 to-white flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-[#C1121F]" />
                Host DNA Profile
              </h3>
              <Badge className="bg-zinc-100 text-zinc-800 text-[10px] font-bold border border-zinc-200 font-mono">
                Active
              </Badge>
            </div>
            
            <CardContent className="p-5 space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-500">
                <span>Trait Matrix</span>
                <span className="text-[10px] uppercase font-mono bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded">
                  Phase: {episode.current_phase || 'Intro'}
                </span>
              </div>
              <div className="space-y-3.5">
                {Object.entries(hostDna).map(([key, value]) => {
                  if (key === 'host_id' || key === 'id' || key === 'created_at' || key === 'updated_at' || typeof value !== 'number') return null
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-zinc-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-[#C1121F] font-mono">{value}%</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-[#C1121F] rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${value}%` }} 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consolidated Conversation Flow card */}
        <Card className="bg-white border border-[#E5E7EB] shadow-sm flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-md flex-shrink-0">
          <div className="p-5 border-b border-[#E5E7EB] bg-gradient-to-r from-zinc-50/50 to-white flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-[#C1121F]" />
              Conversation Flow
            </h3>
            <Badge className="bg-zinc-100 text-zinc-800 text-[10px] font-bold border border-zinc-200 font-mono">
              Score: {flowMetrics.flowScore}%
            </Badge>
          </div>
          
          <CardContent className="p-5 space-y-4">
            {/* Flow score circular progress */}
            <div className="flex items-center justify-between bg-[#FDEBEC]/30 p-4 rounded-2xl border border-red-100">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Flow Index</span>
                <div className="text-2xl font-bold text-[#C1121F] font-mono">{flowMetrics.flowScore}/100</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[#C1121F]/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-[#C1121F]" />
              </div>
            </div>

            {/* Grid of metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-zinc-100 rounded-xl p-3 bg-zinc-50/50 text-center">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Host Interrupts</span>
                <span className="text-lg font-bold text-[#1C1C1C] font-mono block mt-1">{flowMetrics.hostInterruptions}</span>
              </div>
              <div className="border border-zinc-100 rounded-xl p-3 bg-zinc-50/50 text-center">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Guest Interrupts</span>
                <span className="text-lg font-bold text-[#1C1C1C] font-mono block mt-1">{flowMetrics.guestInterruptions}</span>
              </div>
              <div className="border border-zinc-100 rounded-xl p-3 bg-zinc-50/50 text-center">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Recovery Events</span>
                <span className="text-lg font-bold text-[#1C1C1C] font-mono block mt-1">{flowMetrics.recoveryEvents}</span>
              </div>
              <div className="border border-zinc-100 rounded-xl p-3 bg-zinc-50/50 text-center">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Budget Used</span>
                <span className="text-lg font-bold text-[#1C1C1C] font-mono block mt-1">{flowMetrics.budgetUsed}/{flowMetrics.budgetMax}</span>
              </div>
            </div>
            
            <div className="border border-zinc-100 rounded-2xl p-4 bg-zinc-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Decision:</span>
                <span className={`font-mono font-bold uppercase ${
                  debugState.negotiationDecision === 'HOST_INTERRUPTS' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {debugState.negotiationDecision}
                </span>
              </div>
              <div className="h-px w-full bg-zinc-200/60" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Trigger:</span>
                <span className="font-mono font-bold text-zinc-700 truncate max-w-[170px]">{debugState.negotiationTrigger}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CENTER COLUMN: LIVE TIMELINE */}
      <div className="flex-1 flex flex-col bg-white border border-[#E5E7EB] shadow-sm rounded-[24px] overflow-hidden min-w-0 min-h-0 transition-all duration-300 hover:shadow-md">
        {/* Timeline Header */}
        <div className="py-5 px-8 border-b border-[#E5E7EB] flex flex-row items-center justify-between bg-white backdrop-blur-xl z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-[#C1121F] flex items-center justify-center border border-red-100">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#1C1C1C] tracking-tight">Dialogue Timeline</h2>
              <p className="text-[11px] text-zinc-400 font-medium">Real-time turn taking transcripts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch 
                id="auto-speak"
                checked={testMode !== 'no_tts'}
                onCheckedChange={(checked) => {
                  setTestMode(checked ? 'normal' : 'no_tts')
                  addAuditLog('System', checked ? 'Enabled Auto-Speak Host.' : 'Disabled Auto-Speak Host.')
                }}
                className="data-[state=checked]:bg-[#C1121F]"
              />
              <label htmlFor="auto-speak" className="text-[11px] font-bold text-zinc-500 cursor-pointer hover:text-zinc-800 transition-colors uppercase tracking-wider">
                Auto-Speak Host
              </label>
            </div>
            
            {connectionState === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-50 text-zinc-500 border border-zinc-200">
                <span className="h-2 w-2 rounded-full bg-zinc-400" /> Connecting...
              </span>
            )}
          </div>
        </div>
        
        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin bg-zinc-50/20" ref={scrollRef}>
          <div className="p-8 space-y-6">
            {messages.length === 0 && !interimText && (
              <div className="flex flex-col items-center justify-center text-zinc-400 space-y-4 py-24">
                <div className="h-16 w-16 bg-[#F8F8F7] border border-zinc-200 rounded-2xl flex items-center justify-center text-[#C1121F] shadow-xs">
                  <Mic className="h-7 w-7" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-[#1C1C1C]">Continuous Audio Stream Active</p>
                  <p className="text-xs text-zinc-400 max-w-[280px]">Start speaking or use the text input below to begin.</p>
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => {
              const isAbortedMsg = msg.role === 'assistant' && idx < messages.length - 1 && messages[idx+1].role === 'user' && !messages.some((m, i) => i > idx && m.role === 'assistant')
              return (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'ml-auto items-end max-w-[80%]' : 'mr-auto items-start max-w-[80%]'}`}>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1.5 px-2 uppercase tracking-wider font-mono">
                    {msg.role === 'user' ? (episode.guests?.name || 'Guest') : (episode.hosts?.name || 'AI Host')}
                  </div>
                  <div className={`px-5 py-3.5 shadow-xs border text-[14px] leading-relaxed rounded-[20px] transition-all duration-300 hover:shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-zinc-50 border-zinc-200 text-[#1C1C1C] rounded-tr-xs' 
                      : 'bg-red-50/40 border-red-100 text-[#1C1C1C] rounded-tl-xs'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}{msg.role === 'assistant' && msg.content && isAbortedMsg && (
                      <span className="text-[#C1121F] font-bold block mt-2 text-xs italic">
                        [Interrupted by guest]
                      </span>
                    )}</p>
                  </div>
                  
                  {msg.role === 'assistant' && !isEnding && (
                    <div className="flex gap-1 mt-2.5 px-1 bg-zinc-50 rounded-full p-1 border border-zinc-200 w-fit">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 rounded-full transition-colors p-0" 
                        onClick={() => replayMessage(msg.content)}
                        title="Replay Voice"
                      >
                        <Play className="h-3 w-3 fill-current ml-0.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 rounded-full transition-colors p-0" 
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.speechSynthesis) {
                            window.speechSynthesis.cancel()
                          }
                        }}
                        title="Stop Voice"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

            {interimText && (
              <div className="flex flex-col ml-auto items-end max-w-[80%] opacity-70">
                <div className="text-[10px] font-bold text-[#C1121F] mb-1.5 px-2 uppercase tracking-wider animate-pulse font-mono">
                  Streaming Transcript
                </div>
                <div className="px-5 py-3.5 bg-zinc-50/50 border border-zinc-200 text-zinc-500 rounded-[20px] rounded-tr-xs italic shadow-xs">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C1121F]" />
                    <span>{interimText}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Text Fallback Input Bar */}
        <div className="p-5 bg-white border-t border-[#E5E7EB]">
          <form onSubmit={handleTextInputSubmit} className="relative flex items-center shadow-xs rounded-full bg-zinc-50 border border-zinc-200 overflow-hidden focus-within:ring-2 focus-within:ring-red-100 focus-within:border-[#C1121F] transition-all p-1.5">
            <input 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Type message to host as ${episode.guests?.name || 'Guest'}...`}
              className="flex-1 border-none shadow-none focus:outline-none bg-transparent pl-5 pr-16 h-[44px] text-[13px] text-[#1C1C1C] placeholder:text-zinc-400"
              disabled={isEnding}
              autoComplete="off"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <Button 
                type="submit" 
                disabled={isEnding || !inputText.trim()} 
                className="h-9 w-9 rounded-full bg-[#C1121F] hover:bg-red-700 shadow-sm transition-all duration-300 flex items-center justify-center p-0"
              >
                <Send className="h-3.5 w-3.5 text-white ml-0.5" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: DEVELOPER INTELLIGENCE PANEL */}
      <div className="w-[360px] flex flex-col gap-6 flex-shrink-0 overflow-y-auto pr-1 scrollbar-thin">
        
        {/* Unified Tabbed Console */}
        <Card className="bg-white border border-[#E5E7EB] shadow-sm flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-md flex-1">
          {/* Tabs header */}
          <div className="bg-[#F8F8F7] p-2 border-b border-[#E5E7EB] flex gap-1 z-10 sticky top-0 overflow-x-auto scrollbar-none">
            {['intelligence', 'inspector', 'duplex', 'logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab as any)}
                className={`flex-1 text-center py-2 text-[11px] font-bold rounded-xl transition-all duration-200 capitalize ${
                  rightTab === tab ? 'bg-white text-[#C1121F] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <CardContent className="p-5 flex-1 flex flex-col overflow-hidden min-h-0">
            {/* DYNAMIC TAB COMPONENT */}
            {rightTab === 'intelligence' && (
              <div className="space-y-6 flex-1 flex flex-col overflow-y-auto scrollbar-thin pr-1">
                {/* Guest Context */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-[20px] p-4 text-xs space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Guest Context</span>
                  <div className="space-y-1.5 text-zinc-700 font-medium">
                    <p><span className="text-zinc-400 font-semibold mr-1">Name:</span> {episode.guests?.name}</p>
                    <p><span className="text-zinc-400 font-semibold mr-1">Company:</span> {episode.guests?.company || 'N/A'}</p>
                    <p className="line-clamp-3 leading-relaxed"><span className="text-zinc-400 font-semibold mr-1">Bio:</span> {episode.guests?.bio}</p>
                  </div>
                </div>

                {/* Dynamic Memory */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Dynamic Memory ({memories.length})
                  </span>
                  {memories.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic font-medium p-3 border border-dashed border-zinc-200 rounded-xl text-center">No facts extracted yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                      {memories.map(mem => (
                        <div key={mem.id} className="bg-white border border-zinc-150 shadow-sm rounded-xl p-3 text-xs text-zinc-700 font-medium">
                          <Badge variant="outline" className="text-[9px] uppercase mb-1.5 border-zinc-200 text-[#C1121F] bg-red-50/50 px-2 py-0">
                            {mem.memory_type}
                          </Badge>
                          <p className="leading-relaxed">{mem.memory_content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Curiosity Targets */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <BrainCircuit className="h-3.5 w-3.5 text-purple-500" />
                    Curiosity Loops ({curiosityTargets.length})
                  </span>
                  {curiosityTargets.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic font-medium p-3 border border-dashed border-zinc-200 rounded-xl text-center">No active curiosity targets.</p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                      {curiosityTargets.map(target => (
                        <div key={target.id} className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700 font-semibold shadow-xs leading-relaxed">
                          {target.trigger_statement}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contradictions */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                    Detected Contradictions ({contradictions.length})
                  </span>
                  {contradictions.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic font-medium p-3 border border-dashed border-zinc-200 rounded-xl text-center">No contradictions flagged.</p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                      {contradictions.map(cont => (
                        <div key={cont.id} className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 font-semibold shadow-xs">
                          {cont.contradiction_text || 'High Severity Flag'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {rightTab === 'inspector' && (
              <div className="space-y-5 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pipeline Checklist</h4>
                  <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 bg-zinc-50 text-zinc-500 font-mono">
                    Mode: {testMode}
                  </Badge>
                </div>
                
                {/* 10-Stage Pipeline Checklist */}
                <div className="space-y-1.5 border border-zinc-150 p-3 rounded-2xl bg-zinc-50/30 overflow-y-auto max-h-[300px] scrollbar-thin">
                  {[
                    { id: 'vad', label: 'VAD Engine' },
                    { id: 'transcript', label: 'STT Ingestion' },
                    { id: 'planner', label: 'Response Planner' },
                    { id: 'memory', label: 'Memory Injection' },
                    { id: 'knowledge', label: 'Knowledge Retrieval' },
                    { id: 'promptAssembly', label: 'Prompt Compiler' },
                    { id: 'llm', label: 'LLM Stream' },
                    { id: 'tts', label: 'ElevenLabs TTS' },
                    { id: 'audioQueue', label: 'Playback Queue' },
                    { id: 'playback', label: 'WASM Audio Player' }
                  ].map(stage => (
                    <div key={stage.id} className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-b-0">
                      <span className="text-[11px] font-semibold text-zinc-600">{stage.label}</span>
                      <Badge variant="outline" className={`text-[9px] font-bold rounded-md px-2 py-0.5 border ${getStageColor(pipelineState[stage.id])}`}>
                        {pipelineState[stage.id]}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Segmented Mode Picker */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Test Mode Bypass</span>
                  <div className="grid grid-cols-3 gap-1 bg-[#F8F8F7] p-1 rounded-xl border border-zinc-200">
                    <button 
                      onClick={() => {
                        setTestMode('emergency')
                        addAuditLog('System', 'Switched to EMERGENCY TEST MODE (Bypasses Planner, Memory, Knowledge, TTS)')
                      }}
                      className={`text-[9px] font-bold py-1.5 rounded-lg transition-all ${
                        testMode === 'emergency' ? 'bg-[#C1121F] text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      Emergency
                    </button>
                    <button 
                      onClick={() => {
                        setTestMode('no_tts')
                        addAuditLog('System', 'Switched to SECOND TEST MODE (Bypasses TTS)')
                      }}
                      className={`text-[9px] font-bold py-1.5 rounded-lg transition-all ${
                        testMode === 'no_tts' ? 'bg-[#C1121F] text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      No TTS
                    </button>
                    <button 
                      onClick={() => {
                        setTestMode('normal')
                        addAuditLog('System', 'Switched to NORMAL MODE (Full Pipeline)')
                      }}
                      className={`text-[9px] font-bold py-1.5 rounded-lg transition-all ${
                        testMode === 'normal' ? 'bg-[#C1121F] text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      Full Loop
                    </button>
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'logs' && (
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block">Audits & Telemetry Logs</span>
                  <ScrollArea className="flex-1 border border-zinc-200 rounded-2xl bg-[#F8F8F7] p-3 font-mono text-[9px] leading-relaxed text-zinc-600 shadow-inner">
                    <div className="space-y-1.5">
                      {auditLogs.map((log, idx) => (
                        <div key={idx} className="pb-1.5 border-b border-zinc-200/50 last:border-b-0 break-words">{log}</div>
                      ))}
                      {auditLogs.length === 0 && <div className="text-zinc-400 italic text-center py-10">No pipeline logs captured. Speak into mic to start.</div>}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="space-y-2 h-[120px] flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block">Raw Planner JSON</span>
                  <pre className="h-[100px] overflow-auto border border-zinc-200 rounded-2xl bg-zinc-900 text-emerald-400 p-3 font-mono text-[9px] break-all whitespace-pre-wrap shadow-inner scrollbar-thin">
                    {rawPlannerJson}
                  </pre>
                </div>
              </div>
            )}

            {rightTab === 'duplex' && (
              <div className="space-y-4 flex-1 flex flex-col overflow-y-auto scrollbar-thin pr-1">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Yield Engine Diagnostics</h4>
                  <Badge className="bg-red-50 hover:bg-red-100 text-[#C1121F] border border-red-200 text-[10px] font-bold rounded-full">
                    Turn Duplex
                  </Badge>
                </div>

                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl bg-zinc-50/20 px-4">
                  <div className="flex justify-between items-center py-3 text-xs">
                    <span className="text-zinc-500 font-semibold">Duplex Attempts</span>
                    <span className="font-mono font-bold text-[#1C1C1C]">{duplexMetrics.attempts}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 text-xs">
                    <span className="text-zinc-500 font-semibold">Accepted Yields</span>
                    <span className="font-mono font-bold text-emerald-600">{duplexMetrics.accepted}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 text-xs">
                    <span className="text-zinc-500 font-semibold">Aborted Host streams</span>
                    <span className="font-mono font-bold text-orange-600">{duplexMetrics.abortedStreams}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 text-xs">
                    <span className="text-zinc-500 font-semibold">Self-Echo check blocks</span>
                    <span className="font-mono font-bold text-indigo-600">{duplexMetrics.selfEchoes}</span>
                  </div>
                </div>

                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Last Guest Intent:</span>
                    <span className={`font-mono font-bold uppercase ${
                      duplexMetrics.lastIntent === 'Self Echo' ? 'text-red-600' : 'text-[#C1121F]'
                    }`}>
                      {duplexMetrics.lastIntent}
                    </span>
                  </div>
                  <div className="h-px w-full bg-zinc-200/60" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Yield Decision:</span>
                    <span className={`font-mono font-bold uppercase ${
                      duplexMetrics.lastYieldDecision === 'CONTINUE' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {duplexMetrics.lastYieldDecision}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* consolidated Response Engine Details */}
        <Card className="bg-white border border-[#E5E7EB] shadow-sm flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-md flex-shrink-0">
          <div className="p-5 border-b border-[#E5E7EB] bg-gradient-to-r from-zinc-50/50 to-white flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-[#C1121F]" />
              Response Engine
            </h3>
            <Badge variant="outline" className="text-[9px] font-mono border-zinc-200 text-zinc-500 bg-zinc-50">
              Active
            </Badge>
          </div>
          
          <CardContent className="p-5 space-y-3">
            <div className="bg-zinc-50/50 border border-zinc-150 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Planner Decision:</span>
                <span className={`font-mono font-bold uppercase ${
                  debugState.plannerDecision === 'WAIT' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {debugState.plannerDecision}
                </span>
              </div>
              <div className="h-px w-full bg-zinc-200/60" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Current Phase:</span>
                <span className="font-mono font-bold text-zinc-700 truncate max-w-[150px]">{debugState.currentPhase}</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
