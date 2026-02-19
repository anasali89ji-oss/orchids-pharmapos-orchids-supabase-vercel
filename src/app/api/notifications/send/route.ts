import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

// Node runtime for sending notifications
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, {
      interval: 60000, // 1 minute
      maxRequests: 50,
    })

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const { 
      type, 
      title, 
      message, 
      severity = 'info', 
      pharmacy_id,
      user_id 
    } = body

    if (!title || !message) {
      logger.warn('Send notification validation failed', { body })
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      )
    }

    const validTypes = ['subscription', 'low_stock', 'expiry', 'credit', 'system', 'alert']
    if (type && !validTypes.includes(type)) {
      logger.warn('Invalid notification type', { type })
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        type,
        title,
        message,
        severity,
        pharmacy_id,
        user_id,
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to send notification', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info('Notification sent successfully', { notification_id: notification.id, type })

    return NextResponse.json({
      notification,
      message: 'Notification sent successfully',
    })
  } catch (error: unknown) {
    logger.error('Send notification error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
