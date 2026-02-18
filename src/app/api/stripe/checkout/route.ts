import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe, STRIPE_PRICES, SubscriptionTier } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacy_id, tier = 'pro' } = body

    if (!pharmacy_id) {
      return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 })
    }

    const validTier = (tier as string) in STRIPE_PRICES ? (tier as SubscriptionTier) : 'pro'
    const priceId = STRIPE_PRICES[validTier].monthly

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, slug, owner_email, stripe_customer_id')
      .eq('id', pharmacy_id)
      .single()

    if (error || !pharmacy) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    let customerId = pharmacy.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: pharmacy.owner_email,
        metadata: { pharmacy_id: pharmacy.id, pharmacy_slug: pharmacy.slug },
      })
      customerId = customer.id

      await supabaseAdmin
        .from('pharmacies')
        .update({ stripe_customer_id: customerId })
        .eq('id', pharmacy.id)
    }

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          pharmacy_id: pharmacy.id,
          pharmacy_slug: pharmacy.slug,
          tier: validTier,
        },
      },
      return_url: `${origin}/superadmin/pharmacies?session_id={CHECKOUT_SESSION_ID}&pharmacy_id=${pharmacy.id}`,
      metadata: {
        pharmacy_id: pharmacy.id,
        tier: validTier,
      },
    })

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      subscription_id: session.subscription,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
