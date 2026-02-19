'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Return, Sale } from '@/types'
import { FiPlus, FiSearch, FiRotateCcw, FiPrinter, FiDownload } from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { isOnline } from '@/lib/sync-service'
import { getOfflineReturns, saveOfflineReturn, updateCachedProductStock } from '@/lib/offline-db'
import { generateReturnReceipt } from '@/lib/receipts'
import jsPDF from 'jspdf'

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({ receipt_number: '', reason: '', refund_amount: 0, refund_method: 'Cash' })
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [online, setOnline] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    setOnline(isOnline())
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => { fetchData() }, [online])

  const fetchData = async () => {
    const offlineReturns = (await getOfflineReturns()) as unknown as Return[]
    let onlineReturns: Return[] = []
    let onlineSales: Sale[] = []

    if (online) {
      const [returnsRes, salesRes] = await Promise.all([
        supabase.from('returns').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100)
      ])
      onlineReturns = returnsRes.data || []
      onlineSales = salesRes.data || []
    }

    setReturns([...offlineReturns, ...onlineReturns])
    setSales(onlineSales)
    setLoading(false)
  }

  const lookupSale = async () => {
    if (!formData.receipt_number) return
    if (!online) {
      toast.info('Offline mode: receipt lookup unavailable')
      return
    }
    const sale = sales.find(s => s.receipt_number === formData.receipt_number)
    if (sale) {
      setSelectedSale(sale)
      setFormData({ ...formData, refund_amount: Number(sale.grand_total) })
    } else {
      toast.error('Receipt not found')
      setSelectedSale(null)
    }
  }

  const processReturn = async () => {
    if (!formData.reason || formData.refund_amount <= 0 || !formData.receipt_number) {
      toast.error('Fill all required fields')
      return
    }

    if (online && !selectedSale) {
      toast.error('Receipt not found')
      return
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`
    const returnPayload = {
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      return_number: returnNumber,
      sale_id: selectedSale?.id || null,
      receipt_number: formData.receipt_number,
      customer_name: selectedSale?.customer_name || 'Offline Customer',
      items: selectedSale?.items || [],
      reason: formData.reason,
      refund_amount: formData.refund_amount,
      refund_method: formData.refund_method,
      status: 'Completed',
      created_at: new Date().toISOString(),
        synced: 0 as number
      }

        if (online && selectedSale) {
        const { error } = await supabase.from('returns').insert({
          return_number: returnNumber,
          sale_id: selectedSale.id,
          receipt_number: selectedSale.receipt_number,
          customer_name: selectedSale.customer_name,
          items: selectedSale.items,
          reason: formData.reason,
          refund_amount: formData.refund_amount,
          refund_method: formData.refund_method,
          status: 'Completed'
        })

        if (error) {
          toast.error('Failed to process return')
          return
        }

        for (const item of selectedSale.items as { id: string; quantity: number }[]) {
          const { data: product } = await supabase.from('products').select('stock').eq('id', item.id).single()
          if (product) {
            await supabase.from('products').update({ stock: product.stock + item.quantity }).eq('id', item.id)
          }
          await updateCachedProductStock(item.id, (product?.stock || 0) + item.quantity)
        }

        const { data: lastEntry } = await supabase.from('ledger').select('balance').order('created_at', { ascending: false }).limit(1).single()
        await supabase.from('ledger').insert({
          description: `Return: ${selectedSale.receipt_number}`,
          ref_id: returnNumber, credit: 0, debit: formData.refund_amount,
          balance: (lastEntry?.balance || 0) - formData.refund_amount, transaction_type: 'Return',
          customer_name: selectedSale.customer_name
        })
      } else {
        await saveOfflineReturn(returnPayload)
      }

      toast.success(online ? 'Return processed successfully' : 'Return saved offline')
      setModalOpen(false)
      setFormData({ receipt_number: '', reason: '', refund_amount: 0, refund_method: 'Cash' })
      setSelectedSale(null)
      fetchData()
    }

  const printReturnReceipt = async (ret: Return) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150]
    })
    await generateReturnReceipt(doc, ret as any, {
      storeName: 'PharmaPOS',
      storeAddress: 'Healthcare Street',
      storePhone: '+92-300-1234567'
    })
    doc.autoPrint()
    doc.output('print')
  }

  return (
    <DashboardLayout title="Returns" subtitle="Process product returns and refunds">
      <div className="space-y-6">
        <div className="flex justify-between">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-red-500">
              <p className="text-sm text-muted-foreground">Total Returns</p>
              <p className="text-2xl font-bold">{returns.length}</p>
            </div>
            <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-amber-500">
              <p className="text-sm text-muted-foreground">Total Refunded</p>
              <p className="text-2xl font-bold text-amber-600">PKR {returns.reduce((s, r) => s + Number(r.refund_amount), 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-green-500">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-green-600">{returns.filter(r => r.status === 'Pending').length}</p>
            </div>
          </div>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 h-fit">
            <FiPlus className="h-4 w-4" /> New Return
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? <div className="p-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div> :
            returns.length === 0 ? (
              <div className="py-16 text-center">
                <FiRotateCcw className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">No returns yet</p>
              </div>
            ) : (
              <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Return #</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Receipt #</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Reason</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Refund</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Status</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {returns.map(ret => (
                      <tr key={ret.id} className="table-row-hover">
                        <td className="py-4 px-4 font-mono text-sm">{ret.return_number}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{format(new Date(ret.created_at), 'MMM dd, yyyy')}</td>
                        <td className="py-4 px-4">{ret.receipt_number}</td>
                        <td className="py-4 px-4 font-medium">{ret.customer_name}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{ret.reason}</td>
                        <td className="py-4 px-4 text-right font-semibold text-red-600">PKR {Number(ret.refund_amount).toLocaleString()}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ret.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {ret.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button onClick={() => printReturnReceipt(ret)} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Process Return</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Receipt Number</label>
              <div className="flex gap-2">
                <input type="text" value={formData.receipt_number} onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm" placeholder="RCP-XXXXXX" />
                <button onClick={lookupSale} className="rounded-lg bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/80">
                  <FiSearch className="h-4 w-4" />
                </button>
              </div>
            </div>
            {selectedSale && (
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                <p className="font-medium text-green-800 dark:text-green-400">Sale Found</p>
                <p className="text-sm text-green-700 dark:text-green-500">Customer: {selectedSale.customer_name}</p>
                <p className="text-sm text-green-700 dark:text-green-500">Amount: PKR {Number(selectedSale.grand_total).toLocaleString()}</p>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Reason for Return</label>
              <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" rows={2} placeholder="Defective product, wrong item, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Refund Amount</label>
                <input type="number" value={formData.refund_amount} onChange={(e) => setFormData({ ...formData, refund_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Refund Method</label>
                <select value={formData.refund_method} onChange={(e) => setFormData({ ...formData, refund_method: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                  <option value="Cash">Cash</option>
                  <option value="Store Credit">Store Credit</option>
                </select>
              </div>
            </div>
          </div>
          <button onClick={processReturn} disabled={!selectedSale}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            Process Return
          </button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
