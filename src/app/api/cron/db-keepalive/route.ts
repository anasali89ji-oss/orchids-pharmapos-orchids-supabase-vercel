import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  try {
    const { error } = await supabaseAdmin.from('pharmacies').select('id').limit(1)
    if (error) throw error

    const latency = Date.now() - start
    logger.info('DB keepalive ping successful', { latency_ms: latency })

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      latency_ms: latency
    })
  } catch (error) {
    logger.error('DB keepalive failed', error as Error)
    return NextResponse.json({ error: 'Ping failed' }, { status: 500 })
  }
}
