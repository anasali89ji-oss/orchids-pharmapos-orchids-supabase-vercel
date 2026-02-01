'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { HeldSale, CartItem } from '@/types'
import { FiPauseCircle, FiRefreshCw, FiTrash2, FiSearch, FiShoppingCart, FiClock } from 'react-icons/fi'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isOnline } from '@/lib/sync-service'
import { getOfflineHeldSales, deleteOfflineHeldSale } from '@/lib/offline-db'

export default function HeldSalesPage() {
  const [heldSales, setHeldSales] = useState<HeldSale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [online, setOnline] = useState(true)
  const router = useRouter()
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

  useEffect(() => {
    fetchHeldSales()
  }, [online])

  const fetchHeldSales = async () => {
    try {
      const offlineSales = (await getOfflineHeldSales()) as unknown as HeldSale[]
      let onlineSales: HeldSale[] = []

      if (online) {
        const { data } = await supabase
          .from('held_sales')
          .select('*')
          .order('created_at', { ascending: false })

        onlineSales = data || []
      }

      const combined = [...offlineSales, ...onlineSales]
      setHeldSales(combined)
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = heldSales.filter(sale =>
    sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.id.includes(searchQuery)
  )

  const restoreSale = async (sale: HeldSale) => {
    localStorage.setItem('restored_cart', JSON.stringify(sale.items))
    localStorage.setItem('restored_customer', sale.customer_name)

    const isOfflineSale = sale.id.startsWith('offline-') || !online

    if (isOfflineSale) {
      await deleteOfflineHeldSale(sale.id)
    } else {
      await supabase.from('held_sales').delete().eq('id', sale.id)
    }

    toast.success('Sale restored to cart')
    router.push('/pos')
  }

  const deleteSale = async (id: string) => {
    const isOfflineSale = id.startsWith('offline-') || !online

    if (isOfflineSale) {
      await deleteOfflineHeldSale(id)
    } else {
      const { error } = await supabase.from('held_sales').delete().eq('id', id)
      if (error) {
        toast.error('Failed to delete')
        return
      }
    }

    setHeldSales(prev => prev.filter(s => s.id !== id))
    toast.success('Sale deleted')
  }

  return (
    <DashboardLayout title="Held Sales" subtitle="Manage suspended transactions">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by customer or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Link
            href="/pos"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
          >
            <FiShoppingCart className="h-4 w-4" />
            Go to POS
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <FiPauseCircle className="h-5 w-5 flex-shrink-0" />
            <span>Sales held here are removed from the cart but not saved to sales history until restored.</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted loading-shimmer" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="py-16 text-center">
              <FiClock className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No held sales found</p>
              <p className="mt-1 text-sm text-muted-foreground">Hold a sale from POS to see it here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hold ID</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date Held</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Value</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSales.map((sale, index) => (
                    <motion.tr
                      key={sale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="table-row-hover"
                    >
                      <td className="py-4 px-4">
                        <span className="rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">
                          {sale.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {format(new Date(sale.created_at), 'MMM dd, yyyy h:mm a')}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-foreground">{sale.customer_name}</span>
                        {sale.note && sale.note !== sale.customer_name && (
                          <p className="text-xs text-muted-foreground">{sale.note}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          {(sale.items as CartItem[]).length} items
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-primary">PKR {sale.total.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => restoreSale(sale)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            <FiRefreshCw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                          <button
                            onClick={() => deleteSale(sale.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-950/50 dark:text-red-400"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
