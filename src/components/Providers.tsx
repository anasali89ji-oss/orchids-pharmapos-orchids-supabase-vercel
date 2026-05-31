'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { SuperAdminProvider } from '@/lib/superadmin-context'
import { PharmacyProvider } from '@/lib/pharmacy-context'
import { useEffect, useState } from 'react'
import { startAutoSync, refreshProductCache } from '@/lib/sync-service'
import { useDbKeepalive } from '@/hooks/use-db-keepalive'
import { Loader2 } from 'lucide-react'

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync] = useState(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && pendingSync === 0) return null

  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
      isOnline ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
    }`}>
      <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-amber-200' : 'bg-red-200 animate-pulse'}`} />
      {isOnline ? `Syncing ${pendingSync} items...` : 'Offline Mode'}
    </div>
  )
}

function SyncManager() {
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProductCache().catch(() => {})
      startAutoSync(30000)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  return null
}

// DB keepalive — pings Supabase every 4 min when user is idle to prevent connection drop
function DbKeepalive() {
  useDbKeepalive()
  return null
}

// Bug 18 fix: AuthGate ensures PharmacyProvider never renders before AuthProvider resolves
function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading PharmaPOS...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <AuthGate>
          <SuperAdminProvider>
            <PharmacyProvider>
              <SyncManager />
              <DbKeepalive />
              <OfflineIndicator />
              {children}
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    borderRadius: '12px',
                  }
                }}
              />
            </PharmacyProvider>
          </SuperAdminProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  )
}
