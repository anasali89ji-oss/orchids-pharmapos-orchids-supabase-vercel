'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import { SuperAdminProvider } from '@/lib/superadmin-context'
import { PharmacyProvider } from '@/lib/pharmacy-context'
import { useEffect, useState } from 'react'
import { startAutoSync, refreshProductCache } from '@/lib/sync-service'

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)

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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <SuperAdminProvider>
          <PharmacyProvider>
            <SyncManager />
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
      </AuthProvider>
    </ThemeProvider>
  )
}
