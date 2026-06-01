'use client'

import React, { useEffect, useState } from 'react'
import { Play, Pause, Volume2, Mic } from 'lucide-react'

interface MockBrandedPlayerProps {
  title?: string
  hostName?: string
  duration?: number
  format?: 'landscape' | 'portrait' | 'square'
  className?: string
}

export function MockBrandedPlayer({
  title = 'AI Podcast Episode',
  hostName = 'HostAI Studio',
  duration = 60,
  format = 'landscape',
  className = ''
}: MockBrandedPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setIsPlaying(false)
            return 0
          }
          return p + (100 / (duration * 10)) // Update every 100ms
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration])

  const togglePlay = () => setIsPlaying(!isPlaying)

  const formatClass = 
    format === 'portrait' ? 'aspect-[9/16] max-w-[320px]' :
    format === 'square' ? 'aspect-square max-w-[400px]' :
    'aspect-video w-full'

  return (
    <div className={`relative bg-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col ${formatClass} mx-auto ${className}`}>
      
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(circle at 50% 50%, #3b82f6 0%, transparent 60%)',
             backgroundSize: '100% 100%',
             animation: isPlaying ? 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
           }}
      />

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        
        {/* Fake Avatar */}
        <div className={`relative mb-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg
          ${isPlaying ? 'animate-bounce-slow' : ''}
          ${format === 'portrait' ? 'w-24 h-24' : 'w-32 h-32'}
        `}>
          <Mic className="w-1/2 h-1/2 text-white opacity-80" />
          {isPlaying && (
            <div className="absolute -inset-2 border-2 border-blue-400 rounded-full animate-ping opacity-20" />
          )}
        </div>

        {/* Branding Overlays */}
        <div className="space-y-2 max-w-full px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wider">HOSTAI STUDIO</span>
          </div>
          
          <h3 className="text-white font-bold text-xl md:text-2xl line-clamp-2 leading-tight">
            {title}
          </h3>
          <p className="text-blue-300 font-medium text-sm">
            {hostName}
          </p>
        </div>

      </div>

      {/* Mock Controls Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none group">
        <button 
          onClick={togglePlay}
          className={`pointer-events-auto w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all transform hover:scale-110 hover:bg-white/20 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </button>
      </div>

      {/* Timestamp & Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
        <div className="flex items-center justify-between text-white/80 text-xs font-mono mb-2 px-1">
          <span>{new Date((progress / 100) * duration * 1000).toISOString().substr(14, 5)}</span>
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4" />
            <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">
          <div 
            className="h-full bg-blue-500 transition-all duration-100 ease-linear relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow" />
          </div>
        </div>
      </div>

    </div>
  )
}
