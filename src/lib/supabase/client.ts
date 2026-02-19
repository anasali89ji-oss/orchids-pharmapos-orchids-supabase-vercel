import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        fetch: (url, options = {}) => {
          const headers = {
            ...options.headers,
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=60, max=1000'
          }
          return fetch(url, { ...options, headers })
        }
      }
    }
  )
}
