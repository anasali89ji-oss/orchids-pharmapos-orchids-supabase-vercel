import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'pharmapos-cron-secret-2026'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

      const supabase = await createClient()

    const { data, error } = await supabase
      .from('pharmacies')
      .select('id, name, slug')
      .limit(1)

    if (error) {
      console.error('Connection ping failed:', error)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Connection ping error:', error)
    return NextResponse.json({ error: 'Connection ping failed' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
