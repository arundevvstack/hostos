'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Beaker, Play, Loader2, Target, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SyntheticLabDashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const appendLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])
  }

  // MVP Client-Side Orchestration Loop
  const triggerRun = async (count: number) => {
    setIsRunning(true)
    setLogs([])
    appendLog(`Starting Synthetic Lab Run (${count} interviews)...`)
    
    // In a full implementation, this would call a server action that:
    // 1. Creates a synthetic_runs record.
    // 2. Selects a random Host and creates an episode.
    // 3. Selects a random synthetic_personas and synthetic_scenarios.
    // 4. Loops X times.
    // 5. Within each loop, calls /api/lab/run-guest, then /api/interview.
    
    // Simulating the runner for UI purposes
    for (let i = 1; i <= count; i++) {
      appendLog(`[Interview ${i}/${count}] Initializing Episode...`)
      await new Promise(r => setTimeout(r, 1000))
      appendLog(`[Interview ${i}/${count}] Guest (Startup Founder - Evasive) speaks...`)
      await new Promise(r => setTimeout(r, 1500))
      appendLog(`[Interview ${i}/${count}] Host (Investor DNA) responds...`)
      await new Promise(r => setTimeout(r, 2000))
      appendLog(`[Interview ${i}/${count}] Completed. AI Scores generated.`)
    }

    appendLog('All runs completed successfully.')
    setIsRunning(false)
  }

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div className="flex items-center gap-4">
        <Beaker className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold">Synthetic Interview Lab</h1>
          <p className="text-zinc-400 mt-2">Stress-test the intelligence engine using automated AI-vs-AI runs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* RUNNER CONTROL PANEL */}
        <Card className="bg-zinc-900 border-zinc-800 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Automated Runner</CardTitle>
            <CardDescription className="text-zinc-400">Trigger massive test batches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => triggerRun(1)} disabled={isRunning} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white justify-start">
              <Play className="h-4 w-4 mr-2 text-emerald-500" />
              Run 1 Interview
            </Button>
            <Button onClick={() => triggerRun(10)} disabled={isRunning} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white justify-start">
              <Play className="h-4 w-4 mr-2 text-blue-500" />
              Run 10 Interviews
            </Button>
            <Button onClick={() => triggerRun(50)} disabled={isRunning} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white justify-start">
              <Play className="h-4 w-4 mr-2 text-purple-500" />
              Run 50 Interviews
            </Button>
            <Button onClick={() => triggerRun(100)} disabled={isRunning} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white justify-start">
              <Play className="h-4 w-4 mr-2 text-red-500" />
              Run 100 Interviews
            </Button>

            {isRunning && (
              <div className="mt-6 flex items-center justify-center gap-2 text-blue-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Orchestration in progress...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LOGS PANEL */}
        <Card className="bg-zinc-900 border-zinc-800 md:col-span-2 flex flex-col h-[400px]">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-lg">Orchestration Logs</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 bg-black/50 font-mono text-xs text-emerald-500/80">
            {logs.length === 0 ? (
              <span className="text-zinc-600">Waiting for runner...</span>
            ) : (
              <ul className="space-y-1">
                {logs.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
