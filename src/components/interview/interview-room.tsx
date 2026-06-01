'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, User, Mic, Brain, Lightbulb, AlertTriangle, MessageSquare } from 'lucide-react'
import { useChat } from 'ai/react'

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
  
  // Local state for right panel dynamic feed
  const [memories, setMemories] = useState(initialMemories)
  const [contradictions, setContradictions] = useState(initialContradictions)
  const [curiosityTargets, setCuriosityTargets] = useState(initialCuriosityTargets)

  // Vercel AI SDK hook.
  // We will call an API route we haven't built yet: /api/interview
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/interview',
    body: {
      episodeId: episode.id,
      hostId: episode.host_id,
      currentPhase: episode.current_phase,
    },
    // Populate with existing conversation
    initialMessages: initialHistory.map(msg => ({
      id: msg.id,
      role: msg.role === 'host' ? 'assistant' : 'user',
      content: msg.message,
    })),
    onFinish: () => {
      // Here we might want to refresh the memory/intelligence panels
      // by either fetching from DB again or using a websocket.
      // For MVP, we can leave it as is or trigger a fast refresh.
    }
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex h-full w-full gap-4">
      {/* LEFT PANE: HOST CONTEXT */}
      <div className="w-1/4 flex flex-col gap-4">
        <Card className="bg-zinc-900 border-zinc-800 flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-500" />
              Host Intelligence
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-8 w-8 text-zinc-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white">{episode.hosts?.name}</h3>
                  <Badge variant="secondary" className="mt-1 bg-zinc-800 text-zinc-300">
                    {episode.hosts?.interview_style}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Current Phase</h4>
                <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-3">
                  <span className="font-mono text-blue-400 font-semibold">{episode.current_phase}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Host DNA Profile</h4>
                {hostDna ? (
                  <div className="space-y-3">
                    {Object.entries(hostDna).map(([key, value]) => {
                      if (key === 'host_id' || key === 'id') return null
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-300 capitalize">{key.replace('_', ' ')}</span>
                            <span className="text-zinc-500">{value as number}/100</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full" 
                              style={{ width: `${value}%` }} 
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No DNA profile configured.</p>
                )}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      {/* CENTER PANE: CONVERSATION ENGINE */}
      <div className="w-2/4 flex flex-col">
        <Card className="bg-zinc-900 border-zinc-800 flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-400" />
              Live Transcript
            </CardTitle>
            {isLoading && (
              <span className="text-xs text-blue-400 animate-pulse">AI is thinking...</span>
            )}
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
                Conversation hasn't started yet. Type a message as the guest.
              </div>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="text-xs text-zinc-500 mb-1 px-1">
                  {msg.role === 'user' ? episode.guests?.name : episode.hosts?.name}
                </div>
                <div 
                  className={`px-4 py-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm' 
                      : 'bg-blue-900/40 border border-blue-800/30 text-blue-50 rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input 
                value={input}
                onChange={handleInputChange}
                placeholder={`Type as ${episode.guests?.name}...`}
                className="bg-zinc-950 border-zinc-800"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* RIGHT PANE: EPISODE INTELLIGENCE */}
      <div className="w-1/4 flex flex-col gap-4">
        <Card className="bg-zinc-900 border-zinc-800 flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Episode Intelligence
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="space-y-6 pt-4">
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Guest Context</h4>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2 text-sm text-zinc-300">
                  <p><span className="text-zinc-500">Name:</span> {episode.guests?.name}</p>
                  <p><span className="text-zinc-500">Company:</span> {episode.guests?.company || 'N/A'}</p>
                  <p className="line-clamp-3"><span className="text-zinc-500">Bio:</span> {episode.guests?.bio}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Dynamic Memory
                </h4>
                {memories.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No facts extracted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {memories.slice(0, 5).map(mem => (
                      <div key={mem.id} className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300">
                        <Badge variant="outline" className="text-[10px] uppercase mb-1 border-zinc-700 text-zinc-500">
                          {mem.memory_type}
                        </Badge>
                        <p>{mem.memory_content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {curiosityTargets.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Curiosity Targets
                  </h4>
                  <div className="space-y-2">
                    {curiosityTargets.map(target => (
                      <div key={target.id} className="bg-purple-950/20 border border-purple-900/30 rounded p-2 text-xs text-purple-200">
                        "{target.trigger_statement}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contradictions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Detected Contradictions
                  </h4>
                  <div className="space-y-2">
                    {contradictions.map(cont => (
                      <div key={cont.id} className="bg-orange-950/20 border border-orange-900/30 rounded p-2 text-xs text-orange-200">
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
