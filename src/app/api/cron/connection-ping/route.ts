import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Node runtime for database operations
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized cron ping attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    const { error } = await supabase.from('pharmacies').select('id').limit(1)

    if (error) {
      logger.error('Connection ping failed', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.debug('Connection ping successful', { source: 'cron' })

    return NextResponse.json({
      message: 'Connection ping successful',
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    logger.error('Connection ping error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
