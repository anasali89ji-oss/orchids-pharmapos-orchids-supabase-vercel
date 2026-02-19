import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

// Edge runtime compatible (Stripe SDK not used directly)
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
    const { pharmacy_id, tier = 'pro' } = body

    if (!pharmacy_id) {
      logger.warn('Stripe checkout missing pharmacy_id', { body })
      return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 })
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

    return NextResponse.json({
      message: 'Manual payment processing required. Contact sales team.',
      details: {
        pharmacy: pharmacy.name,
        pharmacy_id: pharmacy.id,
        tier: tier,
        contact_email: 'sales@pharmapos.com',
        bank_details: {
          bank: 'HBL Bank',
          account: '1234-5678-9012',
          iban: 'PK36HABB0000001234567890',
          account_title: 'PharmaPOS Solutions'
        }
      }
    })
  } catch (error: unknown) {
    logger.error('Stripe checkout error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, {
    interval: 60000, // 1 minute
    maxRequests: 100,
  })

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response
  }

  return NextResponse.json({
    message: 'Manual payment processing active',
    payment_methods: [
      {
        method: 'Bank Transfer',
        bank: 'HBL Bank',
        account: '1234-5678-9012',
        iban: 'PK36HABB0000001234567890'
      },
      {
        method: 'JazzCash',
        account: '0300-1234567'
      },
      {
        method: 'EasyPaisa',
        account: '0321-7654321'
      }
    ]
  })
}
