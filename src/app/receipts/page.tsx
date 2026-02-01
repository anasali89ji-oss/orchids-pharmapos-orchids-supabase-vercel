'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Sale } from '@/types'
import { FiSearch, FiFileText, FiPrinter, FiDownload, FiCalendar } from 'react-icons/fi'
import { format } from 'date-fns'

export default function ReceiptsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null)
  const supabase = createClient()

  useEffect(() => { fetchSales() }, [])

  const fetchSales = async () => {
    const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false })
    setSales(data || [])
    setLoading(false)
  }

  const filtered = sales.filter(s => {
    const matchesSearch = s.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDate = !dateFilter || s.created_at.startsWith(dateFilter)
    return matchesSearch && matchesDate
  })

  const totalSales = filtered.reduce((s, sale) => s + Number(sale.grand_total), 0)
  const cashSales = filtered.filter(s => s.payment_method === 'Cash').reduce((s, sale) => s + Number(sale.grand_total), 0)
  const creditSales = filtered.filter(s => s.payment_method === 'Credit').reduce((s, sale) => s + Number(sale.grand_total), 0)

  const printReceipt = (sale: Sale) => {
    setSelectedReceipt(sale)
    setTimeout(() => window.print(), 100)
  }

  const exportCSV = () => {
    const headers = ['Receipt #', 'Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Payment', 'Status']
    const rows = filtered.map(s => 
      [s.receipt_number, format(new Date(s.created_at), 'yyyy-MM-dd'), s.customer_name, 
       (s.items as { name: string }[]).length, s.subtotal, s.tax, s.grand_total, s.payment_method, s.payment_status].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipts_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <DashboardLayout title="Receipts" subtitle="View and manage all sales receipts">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search receipts..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm" />
            </div>
            <div className="relative">
              <FiCalendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm" />
            </div>
          </div>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <FiDownload className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-muted-foreground">Total Receipts</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-bold text-green-600">PKR {totalSales.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-teal-500">
            <p className="text-sm text-muted-foreground">Cash Sales</p>
            <p className="text-2xl font-bold text-teal-600">PKR {cashSales.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-amber-500">
            <p className="text-sm text-muted-foreground">Credit Sales</p>
            <p className="text-2xl font-bold text-amber-600">PKR {creditSales.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? <div className="p-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div> :
            filtered.length === 0 ? (
              <div className="py-16 text-center">
                <FiFileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">No receipts found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Receipt #</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Items</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Total</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Payment</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Status</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(sale => (
                    <tr key={sale.id} className="table-row-hover">
                      <td className="py-4 px-4 font-mono text-sm">{sale.receipt_number}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{format(new Date(sale.created_at), 'MMM dd, yyyy h:mm a')}</td>
                      <td className="py-4 px-4 font-medium">{sale.customer_name}</td>
                      <td className="py-4 px-4 text-center">{(sale.items as { name: string }[]).length}</td>
                      <td className="py-4 px-4 text-right font-semibold text-primary">PKR {Number(sale.grand_total).toLocaleString()}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sale.payment_method === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sale.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sale.payment_status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button onClick={() => printReceipt(sale)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                          <FiPrinter className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      {selectedReceipt && (
        <div className="hidden print:block fixed inset-0 bg-white p-8">
          <div className="max-w-sm mx-auto font-mono text-sm">
            <div className="text-center border-b-2 border-dashed pb-4 mb-4">
              <h1 className="text-2xl font-bold">PharmaPOS</h1>
              <p>{selectedReceipt.receipt_number}</p>
              <p>{format(new Date(selectedReceipt.created_at), 'PPpp')}</p>
            </div>
            <p><strong>Customer:</strong> {selectedReceipt.customer_name}</p>
            <p><strong>Payment:</strong> {selectedReceipt.payment_method}</p>
            <div className="border-t border-b border-dashed py-4 my-4">
              {(selectedReceipt.items as { name: string; quantity: number; total: number }[]).map((item, i) => (
                <div key={i} className="flex justify-between"><span>{item.name} x{item.quantity}</span><span>{item.total}</span></div>
              ))}
            </div>
            <div className="text-right">
              <p>Subtotal: PKR {selectedReceipt.subtotal}</p>
              <p>Tax: PKR {selectedReceipt.tax}</p>
              <p className="text-lg font-bold">Total: PKR {selectedReceipt.grand_total}</p>
            </div>
            <p className="text-center mt-4 text-xs">Thank you for your purchase!</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
