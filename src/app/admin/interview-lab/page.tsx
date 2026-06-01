'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Beaker, Play, Loader2, Target, ShieldAlert, Lock, Unlock, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SyntheticLabDashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const appendLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])
  }

  const triggerRun = async (count: number, isRedTeam: boolean = false) => {
    setIsRunning(true)
    setLogs([])
    appendLog(`Starting ${isRedTeam ? 'Red Team Validation' : 'Synthetic Lab'} Run (${count} interviews)...`)
    
    // MVP Client-Side Orchestration Loop
    for (let i = 1; i <= count; i++) {
      appendLog(`[Interview ${i}/${count}] Initializing Episode...`)
      await new Promise(r => setTimeout(r, 800))
      appendLog(`[Interview ${i}/${count}] Guest (${isRedTeam ? 'Hostile Guest' : 'Startup Founder - Talkative'}) speaks...`)
      await new Promise(r => setTimeout(r, 1200))
      
      // Simulating stuck detection or drift in Red Team runs
      if (isRedTeam && i % 3 === 0) {
         appendLog(`[Interview ${i}/${count}] WARNING: Stuck Detection triggered. Host repeated strategy.`)
      }

      appendLog(`[Interview ${i}/${count}] Host responds...`)
      await new Promise(r => setTimeout(r, 1500))
      appendLog(`[Interview ${i}/${count}] Completed. AI Scores generated.`)
    }

    appendLog('All runs completed successfully.')
    setIsRunning(false)
  }

  // MVP Static State for Deployment Gate (In reality, fetch from DB)
  const syntheticPassCount = 0
  const redTeamPassCount = 0
  const avgMemory = 0
  const avgCuriosity = 0
  const avgPersonality = 0
  const avgFollowup = 0
  const avgEngagement = 0

  const isGateUnlocked = 
    syntheticPassCount >= 100 && 
    redTeamPassCount >= 50 &&
    avgMemory >= 70 &&
    avgCuriosity >= 75 &&
    avgPersonality >= 85 &&
    avgFollowup >= 70 &&
    avgEngagement >= 75

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Beaker className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Synthetic Interview Lab</h1>
            <p className="text-zinc-400 mt-2">Stress-test the intelligence engine using automated AI-vs-AI runs.</p>
          </div>
        </div>
        {isGateUnlocked ? (
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-4 py-2 text-sm flex items-center gap-2">
            <Unlock className="w-4 h-4" /> HUMAN PILOT UNLOCKED
          </Badge>
        ) : (
          <Badge className="bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" /> HUMAN PILOT BLOCKED
          </Badge>
        )}
      </div>

      {/* DEPLOYMENT GATE */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="border-b border-zinc-800 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" /> Deployment Gate: Criteria Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
          <div className="space-y-1">
            <span className="text-zinc-500 text-xs uppercase font-semibold">100 Synthetic Runs</span>
            <div className="flex items-center gap-2 text-lg font-bold text-red-400">
              <XCircle className="w-5 h-5" /> {syntheticPassCount}/100
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-500 text-xs uppercase font-semibold">50 Red Team Runs</span>
            <div className="flex items-center gap-2 text-lg font-bold text-red-400">
              <XCircle className="w-5 h-5" /> {redTeamPassCount}/50
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-500 text-xs uppercase font-semibold">KPI Thresholds</span>
            <div className="text-sm text-zinc-400">
              Mem: {avgMemory} | Cur: {avgCuriosity} | Prs: {avgPersonality}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-500 text-xs uppercase font-semibold">Action</span>
            <Button disabled={!isGateUnlocked} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Begin Human Pilot
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="space-y-6 lg:col-span-1">
          {/* STANDARD SYNTHETIC RUNNER */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">Standard Benchmarks</CardTitle>
              <CardDescription className="text-zinc-400">Normal conversation flows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => triggerRun(10)} disabled={isRunning} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white justify-start">
                <Play className="h-4 w-4 mr-2 text-blue-500" /> Run 10 Interviews
              </Button>
              <Button onClick={() => triggerRun(100)} disabled={isRunning} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white justify-start">
                <Play className="h-4 w-4 mr-2 text-emerald-500" /> Run 100 Interviews
              </Button>
            </CardContent>
          </Card>

          {/* RED TEAM RUNNER */}
          <Card className="bg-red-950/20 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                <ShieldAlert className="w-5 h-5" /> Red Team Attacks
              </CardTitle>
              <CardDescription className="text-zinc-400">Adversarial breakpoint testing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => triggerRun(10, true)} disabled={isRunning} className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 justify-start">
                <ShieldAlert className="h-4 w-4 mr-2 text-red-400" /> Inject 10 Red Team Guests
              </Button>
              <Button onClick={() => triggerRun(50, true)} disabled={isRunning} className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 justify-start">
                <ShieldAlert className="h-4 w-4 mr-2 text-red-500" /> Run 50 Red Team Gauntlet
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* LOGS PANEL */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2 flex flex-col h-[500px]">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-lg">Orchestration Logs & Failure Detection</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 bg-black/50 font-mono text-xs text-emerald-500/80">
            {logs.length === 0 ? (
              <span className="text-zinc-600">Waiting for runner...</span>
            ) : (
              <ul className="space-y-1">
                {logs.map((log, i) => (
                  <li key={i} className={log.includes('WARNING') ? 'text-red-400' : ''}>
                    {log}
                  </li>
                ))}
              </ul>
            )}
            {isRunning && (
              <div className="mt-4 flex items-center gap-2 text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Running...
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
