import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

// Node runtime for database operations
export const runtime = 'nodejs'

const TIER_PRICES: Record<string, number> = {
  basic: 9999,
  pro: 14999,
  enterprise: 24999,
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, {
      interval: 3600000, // 1 hour
      maxRequests: 20,
    })

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const {
      name,
      slug,
      owner_email,
      owner_name,
      phone,
      address,
      city,
      license_number,
      tier = 'pro',
    } = body

    if (!name || !slug || !owner_email || !owner_name) {
      logger.warn('Create pharmacy validation failed', { body })
      return NextResponse.json(
        { error: 'name, slug, owner_email, and owner_name are required' },
        { status: 400 }
      )
    }

    const validTier = tier in TIER_PRICES ? tier : 'pro'

    const { data: existing } = await supabaseAdmin
      .from('pharmacies')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      logger.warn('Pharmacy slug already exists', { slug })
      return NextResponse.json({ error: 'Pharmacy slug already taken' }, { status: 409 })
    }

    const priceConfig = TIER_PRICES[validTier]

    const { data: pharmacy, error: insertError } = await supabaseAdmin
      .from('pharmacies')
      .insert({
        name,
        slug,
        owner_email,
        owner_name,
        phone: phone || null,
        address: address || null,
        city: city || null,
        license_number: license_number || null,
        subscription_status: 'active',
        subscription_tier: validTier,
        monthly_amount: priceConfig,
        plan: 'monthly',
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to create pharmacy', insertError, { body })
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    logger.info('Pharmacy created successfully', { pharmacy_id: pharmacy.id, slug })

    return NextResponse.json({
      pharmacy,
      message: 'Pharmacy created successfully. Contact super admin for payment setup.',
    })
  } catch (error: unknown) {
    logger.error('Create pharmacy error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
