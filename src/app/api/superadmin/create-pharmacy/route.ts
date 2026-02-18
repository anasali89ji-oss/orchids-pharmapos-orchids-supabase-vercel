import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe, STRIPE_PRICES, SubscriptionTier } from '@/lib/stripe'

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

    const validTier = (tier as string) in STRIPE_PRICES ? (tier as SubscriptionTier) : 'pro'

    const { data: existing } = await supabaseAdmin
      .from('pharmacies')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Pharmacy slug already taken' }, { status: 409 })
    }

    const customer = await stripe.customers.create({
      email: owner_email,
      name: owner_name,
      metadata: { pharmacy_slug: slug, pharmacy_name: name },
    })

    const priceConfig = STRIPE_PRICES[validTier]

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
        stripe_customer_id: customer.id,
        subscription_status: 'pending',
        subscription_tier: validTier,
        monthly_amount: priceConfig.amount,
        plan: 'monthly',
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      await stripe.customers.del(customer.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      pharmacy,
      stripe_customer_id: customer.id,
      checkout_url: `/api/stripe/checkout?pharmacy_id=${pharmacy.id}&tier=${validTier}`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
