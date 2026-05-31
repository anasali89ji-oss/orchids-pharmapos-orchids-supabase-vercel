import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized cron ping attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const start = Date.now()

    const [ping1, ping2] = await Promise.all([
      supabase.from('pharmacies').select('id').limit(1),
      supabase.from('users').select('id').limit(1)
    ])

    if (ping1.error || ping2.error) {
      logger.error('Connection ping failed', { p1: ping1.error, p2: ping2.error })
      return NextResponse.json(
        { error: ping1.error?.message || ping2.error?.message },
        { status: 500 }
      )
    }

    const latency = Date.now() - start
    logger.info('Connection ping successful', { latency_ms: latency })

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      latency_ms: latency
    })
  } catch (error: unknown) {
    logger.error('Connection ping fatal error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
