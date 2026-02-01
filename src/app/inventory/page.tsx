'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types'
import { 
  FiDownload, FiUpload, FiBox, FiAlertTriangle, FiClock, FiSearch, FiFilter
} from 'react-icons/fi'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out' | 'expiring'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    switch (filterStock) {
      case 'low': return p.stock > 0 && p.stock < p.min_stock
      case 'out': return p.stock === 0
      case 'expiring': {
        if (!p.expiry_date) return false
        const thirtyDaysFromNow = addDays(new Date(), 30)
        return new Date(p.expiry_date) <= thirtyDaysFromNow
      }
      default: return true
    }
  })

  const stats = {
    total: products.length,
    totalValue: products.reduce((sum, p) => sum + (p.stock * p.cost), 0),
    lowStock: products.filter(p => p.stock > 0 && p.stock < p.min_stock).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    expiringSoon: products.filter(p => {
      if (!p.expiry_date) return false
      return new Date(p.expiry_date) <= addDays(new Date(), 30)
    }).length
  }

  const exportCSV = () => {
    const headers = ['Name', 'Brand', 'Stock', 'Min Stock', 'Price', 'Cost', 'Batch', 'Expiry', 'Status']
    const rows = products.map(p => 
      [p.name, p.brand, p.stock, p.min_stock, p.price, p.cost, p.batch_number, p.expiry_date, p.status].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    toast.success('Inventory exported')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n')
      if (lines.length < 2) {
        toast.error('Invalid CSV file')
        return
      }

      let newCount = 0, updateCount = 0

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        if (cols.length < 4) continue

        const name = cols[0].trim().replace(/"/g, '')
        if (!name) continue

        const { data: existing } = await supabase
          .from('products')
          .select('id, stock')
          .ilike('name', name)
          .single()

        if (existing) {
          const newStock = existing.stock + (parseInt(cols[2]) || 0)
          await supabase.from('products').update({ stock: newStock }).eq('id', existing.id)
          updateCount++
        } else {
          await supabase.from('products').insert({
            name,
            brand: cols[1]?.trim().replace(/"/g, '') || 'Generic',
            stock: parseInt(cols[2]) || 0,
            price: parseFloat(cols[3]) || 0,
            cost: parseFloat(cols[4]) || 0,
            batch_number: cols[5]?.trim().replace(/"/g, '') || `BATCH-${Date.now()}`,
            expiry_date: cols[6]?.trim().replace(/"/g, '') || null,
            min_stock: 10
          })
          newCount++
        }
      }

      toast.success(`Import complete! ${newCount} new, ${updateCount} updated`)
      fetchProducts()
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <DashboardLayout title="Inventory Management" subtitle="Track and manage your stock">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm"
              />
            </div>
            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value as typeof filterStock)}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="all">All Products</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="expiring">Expiring Soon</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <FiUpload className="h-4 w-4" />
              Import CSV
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <FiDownload className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <FiBox className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-muted-foreground">Total Stock Value</p>
            <p className="text-2xl font-bold text-green-600">PKR {stats.totalValue.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <FiAlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-muted-foreground">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <FiClock className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-purple-600">{stats.expiringSoon}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Product</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Current Stock</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Min Stock</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Unit Cost</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Stock Value</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Batch</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Expiry</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((product, index) => {
                    const isExpiringSoon = product.expiry_date && new Date(product.expiry_date) <= addDays(new Date(), 30)
                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="table-row-hover"
                      >
                        <td className="py-4 px-4">
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                            product.stock === 0 ? 'bg-red-100 text-red-700' :
                            product.stock < product.min_stock ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center text-muted-foreground">{product.min_stock}</td>
                        <td className="py-4 px-4 text-right">PKR {product.cost.toFixed(0)}</td>
                        <td className="py-4 px-4 text-right font-medium">PKR {(product.stock * product.cost).toLocaleString()}</td>
                        <td className="py-4 px-4 text-center text-sm">{product.batch_number || '-'}</td>
                        <td className="py-4 px-4 text-center">
                          {product.expiry_date ? (
                            <span className={`text-sm ${isExpiringSoon ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {format(new Date(product.expiry_date), 'MMM yyyy')}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            product.stock === 0 ? 'bg-red-100 text-red-700' :
                            product.stock < product.min_stock ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {product.stock === 0 ? 'Out of Stock' : product.stock < product.min_stock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">No products match your criteria</div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
