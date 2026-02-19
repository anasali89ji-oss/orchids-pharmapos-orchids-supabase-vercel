import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { pharmacy_id, cancel_immediately = false } = await request.json()

    if (!pharmacy_id) {
      return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 })
    }

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, subscription_status, subscription_tier, owner_email')
      .eq('id', pharmacy_id)
      .single()

    if (error || !pharmacy) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const updateData = cancel_immediately
      ? {
          subscription_status: 'canceled',
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : {
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        }

    await supabaseAdmin
      .from('pharmacies')
      .update(updateData)
      .eq('id', pharmacy_id)

    await supabaseAdmin.from('email_notifications').insert({
      type: 'subscription_cancellation',
      recipient_email: pharmacy.owner_email,
      subject: `Subscription Cancellation - ${pharmacy.name}`,
      sent_at: new Date().toISOString(),
      status: 'sent',
      pharmacy_id: pharmacy_id
    })

    return NextResponse.json({
      message: cancel_immediately ? 'Subscription canceled immediately' : 'Subscription marked for cancellation at period end',
      pharmacy_name: pharmacy.name,
      status: cancel_immediately ? 'canceled' : 'cancel_at_period_end',
      contact_sales: 'For subscription changes, contact sales@pharmapos.com'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
