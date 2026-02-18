import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const { pharmacy_id, cancel_immediately = false } = await request.json()

    if (!pharmacy_id) {
      return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 })
    }

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, stripe_subscription_id, subscription_status')
      .eq('id', pharmacy_id)
      .single()

    if (error || !pharmacy) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    if (!pharmacy.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    let subscription

    if (cancel_immediately) {
      subscription = await stripe.subscriptions.cancel(pharmacy.stripe_subscription_id)

      await supabaseAdmin
        .from('pharmacies')
        .update({
          subscription_status: 'canceled',
          cancel_at_period_end: false,
          status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pharmacy_id)
    } else {
      subscription = await stripe.subscriptions.update(pharmacy.stripe_subscription_id, {
        cancel_at_period_end: true,
      })

      await supabaseAdmin
        .from('pharmacies')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pharmacy_id)
    }

    return NextResponse.json({
      subscription_id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
