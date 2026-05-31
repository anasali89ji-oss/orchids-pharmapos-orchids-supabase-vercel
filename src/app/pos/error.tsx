'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function PosError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('POS error:', error) }, [error])
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load POS</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">{error.message}</p>
        <button onClick={reset}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    </div>
  )
}
