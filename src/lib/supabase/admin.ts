import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
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
})

export function createAdminClient() {
  return supabaseAdmin
}
