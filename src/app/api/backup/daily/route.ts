import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pharmacies, error: pharmaciesError } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, owner_email')
      .eq('status', 'active')

    if (pharmaciesError) {
      console.error('Error fetching pharmacies:', pharmaciesError)
      return NextResponse.json({ error: 'Error fetching pharmacies' }, { status: 500 })
    }

    const backupDate = new Date().toISOString().split('T')[0]
    const backupResults = []

    for (const pharmacy of pharmacies || []) {
      try {
        const [salesCount, productsCount, purchasesCount] = await Promise.all([
          supabaseAdmin.from('sales').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacy.id),
          supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacy.id),
          supabaseAdmin.from('purchases').select('*', { count: 'exact', head: true }).eq('pharmacy_id', pharmacy.id)
        ])

        const backupData = {
          pharmacy_id: pharmacy.id,
          pharmacy_name: pharmacy.name,
          backup_date: backupDate,
          sales_count: salesCount.count || 0,
          products_count: productsCount.count || 0,
          purchases_count: purchasesCount.count || 0
        }

        await supabaseAdmin
          .from('backup_schedules')
          .upsert({
            pharmacy_id: pharmacy.id,
            last_backup: new Date().toISOString(),
            backup_count: (supabaseAdmin.from('backup_schedules').select('*', { count: 'exact', head: true }) as any).then(res => res.count || 0) + 1,
            status: 'completed'
          }, { onConflict: 'pharmacy_id' })

        backupResults.push(backupData)
      } catch (error) {
        console.error(`Error backing up pharmacy ${pharmacy.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      backup_date: backupDate,
      pharmacies_processed: backupResults.length,
      details: backupResults
    })
  } catch (error) {
    console.error('Daily backup error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
