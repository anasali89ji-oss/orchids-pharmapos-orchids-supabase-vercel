import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

// Edge runtime compatible
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      interval: 3600000, // 1 hour
      maxRequests: 10,
    })

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const { pharmacy_id, reason } = body

    if (!pharmacy_id) {
      logger.warn('Stripe cancel missing pharmacy_id', { body })
      return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 })
    }

    // Update pharmacy subscription status
    const { error: updateError } = await supabaseAdmin
      .from('pharmacies')
      .update({
        subscription_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'User requested',
      })
      .eq('id', pharmacy_id)

    if (updateError) {
      logger.error('Failed to cancel subscription', updateError, { pharmacy_id })
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send cancellation email notification
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('owner_email, name')
      .eq('id', pharmacy_id)
      .single()

    if (pharmacy?.owner_email) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          type: 'subscription',
          title: 'Subscription Cancelled',
          message: `Your subscription for ${pharmacy.name} has been cancelled.`,
          severity: 'warning',
        })
    }

    logger.info('Subscription cancelled', { pharmacy_id, reason })

    return NextResponse.json({
      message: 'Subscription cancelled successfully',
      pharmacy_id,
    })
  } catch (error: unknown) {
    logger.error('Stripe cancel error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Manual subscription cancellation active',
    support_email: 'support@pharmapos.com',
    cancellation_policy: 'Monthly plans can be cancelled at any time. Access continues until the end of the billing period.',
  })
}
