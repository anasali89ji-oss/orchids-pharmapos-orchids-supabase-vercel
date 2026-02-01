'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Purchase, Product, Supplier } from '@/types'
import { FiPlus, FiSearch, FiShoppingBag, FiTruck, FiDollarSign } from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'manual' | 'supplier'>('manual')
  const [formData, setFormData] = useState({ name: '', qty: 0, cost: 0, price: 0, batch: '', expiry: '', supplier_id: '' })
  const [orderItems, setOrderItems] = useState<{ name: string; qty: number; cost: number; total: number }[]>([])
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [purchasesRes, productsRes, suppliersRes] = await Promise.all([
      supabase.from('purchases').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('*').eq('status', 'active')
    ])
    setPurchases(purchasesRes.data || [])
    setProducts(productsRes.data || [])
    setSuppliers(suppliersRes.data || [])
    setLoading(false)
  }

  const openManualModal = () => {
    setModalType('manual')
    setFormData({ name: '', qty: 0, cost: 0, price: 0, batch: '', expiry: '', supplier_id: '' })
    setModalOpen(true)
  }

  const openSupplierModal = () => {
    setModalType('supplier')
    setOrderItems([])
    setFormData({ name: '', qty: 0, cost: 0, price: 0, batch: '', expiry: '', supplier_id: '' })
    setModalOpen(true)
  }

  const addToOrder = () => {
    if (!formData.name || formData.qty <= 0 || formData.cost <= 0) {
      toast.error('Fill item details'); return
    }
    setOrderItems([...orderItems, { name: formData.name, qty: formData.qty, cost: formData.cost, total: formData.qty * formData.cost }])
    setFormData({ ...formData, name: '', qty: 0, cost: 0 })
  }

  const processManualPurchase = async () => {
    if (!formData.name || formData.qty <= 0 || formData.cost <= 0) {
      toast.error('Fill all required fields'); return
    }

    const { data: existing } = await supabase.from('products').select('id, stock').ilike('name', formData.name).single()
    
    if (existing) {
      await supabase.from('products').update({ stock: existing.stock + formData.qty, cost: formData.cost }).eq('id', existing.id)
    } else {
      await supabase.from('products').insert({
        name: formData.name, brand: 'Manual', stock: formData.qty, cost: formData.cost,
        price: formData.price || formData.cost * 1.2, batch_number: formData.batch, expiry_date: formData.expiry || null, min_stock: 10
      })
    }

    const totalCost = formData.qty * formData.cost
    await supabase.from('purchases').insert({
      purchase_number: `PUR-${Date.now().toString().slice(-6)}`,
      purchase_type: 'manual', supplier_name: 'Manual Purchase',
      items: [{ name: formData.name, qty: formData.qty, cost: formData.cost, total: totalCost }],
      subtotal: totalCost, total_amount: totalCost, payment_status: 'Paid', amount_paid: totalCost
    })

    const { data: lastEntry } = await supabase.from('ledger').select('balance').order('created_at', { ascending: false }).limit(1).single()
    await supabase.from('ledger').insert({
      description: `Purchase: ${formData.name} (x${formData.qty})`,
      ref_id: `PUR-${Date.now().toString().slice(-6)}`, credit: 0, debit: totalCost,
      balance: (lastEntry?.balance || 0) - totalCost, transaction_type: 'Purchase'
    })

    toast.success('Purchase recorded')
    setModalOpen(false)
    fetchData()
  }

  const processSupplierOrder = async () => {
    if (orderItems.length === 0 || !formData.supplier_id) {
      toast.error('Add items and select supplier'); return
    }

    const supplier = suppliers.find(s => s.id === formData.supplier_id)
    const totalAmount = orderItems.reduce((s, i) => s + i.total, 0)

    for (const item of orderItems) {
      const { data: existing } = await supabase.from('products').select('id, stock').ilike('name', item.name).single()
      if (existing) {
        await supabase.from('products').update({ stock: existing.stock + item.qty, cost: item.cost }).eq('id', existing.id)
      }
    }

    await supabase.from('purchases').insert({
      purchase_number: `PO-${Date.now().toString().slice(-6)}`,
      purchase_type: 'supplier_order', supplier_id: formData.supplier_id, supplier_name: supplier?.name,
      items: orderItems, subtotal: totalAmount, total_amount: totalAmount, payment_status: 'Unpaid'
    })

    const { data: lastEntry } = await supabase.from('ledger').select('balance').order('created_at', { ascending: false }).limit(1).single()
    await supabase.from('ledger').insert({
      description: `Supplier Order: ${supplier?.name}`,
      ref_id: `PO-${Date.now().toString().slice(-6)}`, credit: 0, debit: totalAmount,
      balance: (lastEntry?.balance || 0) - totalAmount, transaction_type: 'Purchase', supplier_name: supplier?.name
    })

    toast.success('Order placed')
    setModalOpen(false)
    fetchData()
  }

  const totalPurchases = purchases.reduce((s, p) => s + Number(p.total_amount), 0)

  return (
    <DashboardLayout title="Purchases" subtitle="Manage stock purchases and supplier orders">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <button onClick={openManualModal} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700">
            <FiPlus className="h-4 w-4" /> Quick Manual Purchase
          </button>
          <button onClick={openSupplierModal} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <FiTruck className="h-4 w-4" /> Supplier Order
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-2xl font-bold">{purchases.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold text-green-600">PKR {totalPurchases.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-amber-500">
            <p className="text-sm text-muted-foreground">Unpaid</p>
            <p className="text-2xl font-bold text-amber-600">PKR {purchases.filter(p => p.payment_status !== 'Paid').reduce((s, p) => s + Number(p.total_amount), 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? <div className="p-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div> :
            purchases.length === 0 ? (
              <div className="py-16 text-center">
                <FiShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">No purchases yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Purchase #</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Supplier</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Type</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Items</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchases.map(purchase => (
                    <tr key={purchase.id} className="table-row-hover">
                      <td className="py-4 px-4 font-mono text-sm">{purchase.purchase_number}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{format(new Date(purchase.created_at), 'MMM dd, yyyy')}</td>
                      <td className="py-4 px-4 font-medium">{purchase.supplier_name || '-'}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${purchase.purchase_type === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {purchase.purchase_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">{(purchase.items as { name: string }[]).length}</td>
                      <td className="py-4 px-4 text-right font-semibold">PKR {Number(purchase.total_amount).toLocaleString()}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${purchase.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {purchase.payment_status}
                        </span>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{modalType === 'manual' ? 'Quick Manual Purchase' : 'New Supplier Order'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {modalType === 'supplier' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Select Supplier *</label>
                <select value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                  <option value="">-- Select --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="mb-3 font-medium">{modalType === 'manual' ? 'Product Details' : 'Add Item'}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs">Product Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" list="products-list" />
                  <datalist id="products-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                </div>
                <div><label className="mb-1 block text-xs">Quantity</label>
                  <input type="number" value={formData.qty || ''} onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-xs">Cost (Per Unit)</label>
                  <input type="number" value={formData.cost || ''} onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
                {modalType === 'manual' && (
                  <>
                    <div><label className="mb-1 block text-xs">Selling Price</label>
                      <input type="number" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
                    <div><label className="mb-1 block text-xs">Batch</label>
                      <input type="text" value={formData.batch} onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
                    <div><label className="mb-1 block text-xs">Expiry</label>
                      <input type="date" value={formData.expiry} onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
                  </>
                )}
              </div>
              {modalType === 'supplier' && (
                <button onClick={addToOrder} className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">+ Add Item</button>
              )}
            </div>
            {modalType === 'supplier' && orderItems.length > 0 && (
              <div className="rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50"><th className="p-2 text-left">Item</th><th className="p-2">Qty</th><th className="p-2">Cost</th><th className="p-2 text-right">Total</th></tr></thead>
                  <tbody>{orderItems.map((item, i) => (
                    <tr key={i} className="border-b"><td className="p-2">{item.name}</td><td className="p-2 text-center">{item.qty}</td><td className="p-2 text-center">{item.cost}</td><td className="p-2 text-right">{item.total.toFixed(0)}</td></tr>
                  ))}</tbody>
                </table>
                <div className="p-2 text-right font-semibold">Total: PKR {orderItems.reduce((s, i) => s + i.total, 0).toFixed(0)}</div>
              </div>
            )}
          </div>
          <button onClick={modalType === 'manual' ? processManualPurchase : processSupplierOrder}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {modalType === 'manual' ? 'Confirm Purchase' : 'Place Order & Update Stock'}
          </button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
