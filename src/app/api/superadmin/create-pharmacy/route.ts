import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TIER_PRICES: Record<string, number> = {
  basic: 9999,
  pro: 14999,
  enterprise: 24999,
}

export async function POST(request: Request) {
  try {
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
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      pharmacy,
      message: 'Pharmacy created successfully. Contact super admin for payment setup.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
