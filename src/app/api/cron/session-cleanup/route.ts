import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// Node runtime for database cleanup operations
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized session cleanup attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete expired reset tokens (older than 24 hours)
    const { error: tokenError } = await supabaseAdmin
      .from('users')
      .update({
        reset_token: null,
        reset_token_expires: null,
      })
      .lt('reset_token_expires', new Date(Date.now() - 86400000).toISOString())

    if (tokenError) {
      logger.error('Failed to clean up expired tokens', tokenError)
    }

    logger.info('Session cleanup completed')

    return NextResponse.json({
      message: 'Session cleanup completed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    logger.error('Session cleanup error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
