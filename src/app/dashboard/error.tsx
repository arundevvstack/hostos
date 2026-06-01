'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to system console or remote logger
    console.error('Dashboard Error Caught:', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center p-6 bg-background rounded-3xl border border-border shadow-sm max-w-2xl mx-auto my-12">
      <div className="h-16 w-16 bg-secondary text-primary flex items-center justify-center rounded-2xl mb-6">
        <AlertTriangle className="h-8 w-8" />
      </div>
      
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Something went wrong!
      </h2>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred in this section of the HostAI dashboard. We've captured the diagnostics and are monitoring this closely.
      </p>

      {/* Diagnostic Panel */}
      <div className="w-full text-left bg-muted border border-border rounded-xl p-4 mb-8 max-h-[250px] overflow-auto font-mono text-xs text-foreground">
        <div className="font-semibold text-primary mb-1">
          Error Message:
        </div>
        <div className="mb-3 break-all">
          {error.message || 'Unknown Error'}
        </div>
        
        {error.digest && (
          <div className="mb-2">
            <span className="font-semibold text-primary">Digest:</span> {error.digest}
          </div>
        )}

        {error.stack && (
          <div>
            <div className="font-semibold text-primary mb-1">Call Stack:</div>
            <pre className="whitespace-pre-wrap">{error.stack}</pre>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <Button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-xl h-11 px-5"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        
        <Button
          onClick={() => window.location.href = '/dashboard'}
          variant="outline"
          className="flex items-center gap-2 rounded-xl h-11 px-5 border-border"
        >
          <Home className="h-4 w-4" />
          Go Dashboard Home
        </Button>
      </div>
    </div>
  )
}
