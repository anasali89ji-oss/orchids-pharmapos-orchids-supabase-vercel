import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { error: expiryError } = await supabase
      .from('inventory_batches')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expiry_date', sevenDaysAgo.toISOString())

    if (expiryError) {
      console.error('Expiry check error:', expiryError)
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error: logsError } = await supabase
      .from('system_error_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (logsError) {
      console.error('Log cleanup error:', logsError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Session cleanup completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Session cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
