import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { verifySession } from '@/lib/verify-session'

// Node runtime
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Require authenticated session
    const auth = await verifySession(request)
    if (!auth.ok) return auth.response

    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      interval: 3600000, // 1 hour
      maxRequests: 10,
    })

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const { pharmacy_id, tier = 'pro' } = body

    if (!pharmacy_id) {
      logger.warn('Stripe checkout missing pharmacy_id', { body })
      return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 })
    }

    // Ensure caller belongs to this pharmacy (prevent IDOR)
    if (auth.pharmacyId && auth.pharmacyId !== pharmacy_id) {
      logger.warn('Checkout IDOR attempt', { caller: auth.userId, requested: pharmacy_id })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, slug, owner_email, owner_name')
      .eq('id', pharmacy_id)
      .single()

    if (error || !pharmacy) {
      logger.error('Pharmacy not found for checkout', error as Error, { pharmacy_id })
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    logger.info('Stripe checkout initiated', { pharmacy_id, tier })

    // Bank details are returned only to authenticated pharmacy owners, not in public GET
    return NextResponse.json({
      message: 'Manual payment processing required. Contact sales team.',
      details: {
        pharmacy: pharmacy.name,
        pharmacy_id: pharmacy.id,
        tier,
        contact_email: 'sales@pharmapos.com',
        payment_info: 'Bank details will be shared securely via email to the registered owner.',
      },
    })
  } catch (error: unknown) {
    logger.error('Stripe checkout error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  // Public info only — no bank details, no account numbers
  return NextResponse.json({
    message: 'Manual payment processing active. Contact support@pharmapos.com for payment details.',
    payment_methods: ['Bank Transfer', 'JazzCash', 'EasyPaisa'],
  })
}
