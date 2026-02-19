import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacy_id, tier = 'pro' } = body

    if (!pharmacy_id) {
      return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 })
    }

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, slug, owner_email, owner_name')
      .eq('id', pharmacy_id)
      .single()

    if (error || !pharmacy) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

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
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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
