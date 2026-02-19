import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data, recipientEmail, pharmacyName } = body

    if (!recipientEmail || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

      const supabase = await createClient()

    let subject = ''
    let htmlBody = ''
    let plainText = ''

    switch (type) {
      case 'sales_report':
        subject = `Daily Sales Report - ${pharmacyName || 'PharmaPOS'}`
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d9488;">Daily Sales Report</h2>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <h3>Summary</h3>
            <ul>
              <li>Total Sales: ${data?.totalSales || 0} PKR</li>
              <li>Total Transactions: ${data?.transactions || 0}</li>
              <li>Average Sale: ${data?.avgSale || 0} PKR</li>
              <li>Total Profit: ${data?.totalProfit || 0} PKR</li>
            </ul>
            <p style="color: #666; margin-top: 30px;">This is an automated email from PharmaPOS.</p>
          </div>
        `
        plainText = `Daily Sales Report\nDate: ${new Date().toLocaleDateString()}\n\nTotal Sales: ${data?.totalSales || 0} PKR\nTotal Transactions: ${data?.transactions || 0}\nAverage Sale: ${data?.avgSale || 0} PKR\nTotal Profit: ${data?.totalProfit || 0} PKR`
        break

      case 'inventory_report':
        subject = `Inventory Report - ${pharmacyName || 'PharmaPOS'}`
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d9488;">Inventory Report</h2>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <h3>Summary</h3>
            <ul>
              <li>Total Products: ${data?.totalProducts || 0}</li>
              <li>Low Stock Items: ${data?.lowStock || 0}</li>
              <li>Out of Stock: ${data?.outOfStock || 0}</li>
              <li>Total Value: ${data?.totalValue || 0} PKR</li>
            </ul>
            ${data?.lowStockItems?.length > 0 ? `<h4>Products needing attention:</h4><ul>${data.lowStockItems.map((item: any) => `<li>${item.name} - Stock: ${item.stock}</li>`).join('')}</ul>` : ''}
            <p style="color: #666; margin-top: 30px;">This is an automated email from PharmaPOS.</p>
          </div>
        `
        plainText = `Inventory Report\nDate: ${new Date().toLocaleDateString()}\n\nTotal Products: ${data?.totalProducts || 0}\nLow Stock Items: ${data?.lowStock || 0}\nOut of Stock: ${data?.outOfStock || 0}\nTotal Value: ${data?.totalValue || 0} PKR`
        break

      case 'low_stock_alert':
        subject = `Low Stock Alert - ${pharmacyName || 'PharmaPOS'}`
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Low Stock Alert</h2>
            <p>Some products are running low on stock.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <ul>
              ${data?.items?.map((item: any) => `<li><strong>${item.name}</strong> - Stock: ${item.stock} (Min: ${item.min_stock})</li>`).join('') || '<li>No low stock items</li>'}
            </ul>
            <p style="color: #666; margin-top: 30px;">Please restock these items soon.</p>
          </div>
        `
        plainText = `Low Stock Alert\n\n${data?.items?.map((item: any) => `${item.name} - Stock: ${item.stock} (Min: ${item.min_stock})`).join('\n') || 'No low stock items'}`
        break

      case 'payment_reminder':
        subject = `Payment Reminder - ${pharmacyName || 'PharmaPOS'}`
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d9488;">Payment Reminder</h2>
            <p>Monthly subscription payment is due.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <h3>Payment Details</h3>
            <ul>
              <li>Amount: ${data?.amount || 0} PKR</li>
              <li>Due Date: ${data?.dueDate || 'N/A'}</li>
              <li>Plan: ${data?.plan || 'Professional'}</li>
            </ul>
            <h4>Bank Transfer Details:</h4>
            <p>Bank: HBL Bank</p>
            <p>Account: 1234-5678-9012</p>
            <p>IBAN: PK36HABB0000001234567890</p>
            <p style="color: #666; margin-top: 30px;">Please send payment receipt to billing@pharmapos.com</p>
          </div>
        `
        plainText = `Payment Reminder\n\nAmount: ${data?.amount || 0} PKR\nDue Date: ${data?.dueDate || 'N/A'}\nPlan: ${data?.plan || 'Professional'}\n\nBank: HBL Bank\nAccount: 1234-5678-9012\nIBAN: PK36HABB0000001234567890`
        break

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    const notificationRecord = {
      type,
      recipient_email: recipientEmail,
      subject,
      sent_at: new Date().toISOString(),
      status: 'sent',
      pharmacy_id: body.pharmacyId
    }

    await supabase.from('email_notifications').insert(notificationRecord)

    return NextResponse.json({ 
      success: true, 
      message: 'Email notification queued successfully',
      record: notificationRecord
    })

  } catch (error) {
    console.error('Email notification error:', error)
    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
