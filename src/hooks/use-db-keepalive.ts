'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

const DB_PING_INTERVAL = 4 * 60 * 1000 // 4 minutes
const IDLE_THRESHOLD = 2 * 60 * 1000   // Only ping if idle > 2 min

export function useDbKeepalive() {
  const { session } = useAuth()
  const lastActivityRef = useRef(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const trackActivity = () => { lastActivityRef.current = Date.now() }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, trackActivity, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, trackActivity))
  }, [])

  useEffect(() => {
    if (!session) return
    const supabase = createClient()

    const ping = async () => {
      const idleTime = Date.now() - lastActivityRef.current
      if (idleTime < IDLE_THRESHOLD) return
      try {
        await supabase.from('pharmacies').select('id').limit(1)
        console.debug('[DB Keepalive] Ping sent at', new Date().toISOString())
      } catch (err) {
        console.warn('[DB Keepalive] Ping failed:', err)
      }
    }

    intervalRef.current = setInterval(ping, DB_PING_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session])
}
