'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Supplier } from '@/types'
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiTruck, FiPhone, FiMail, FiMapPin } from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    name: '', contact_person: '', email: '', phone: '', address: '', city: '', payment_terms: '', notes: ''
  })
  const supabase = createClient()

  useEffect(() => { fetchSuppliers() }, [])

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data || [])
    setLoading(false)
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openAdd = () => {
    setEditingSupplier(null)
    setFormData({ name: '', contact_person: '', email: '', phone: '', address: '', city: '', payment_terms: '', notes: '' })
    setModalOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s)
    setFormData({
      name: s.name, contact_person: s.contact_person || '', email: s.email || '',
      phone: s.phone || '', address: s.address || '', city: s.city || '',
      payment_terms: s.payment_terms || '', notes: s.notes || ''
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) { toast.error('Name is required'); return }

    if (editingSupplier) {
      const { error } = await supabase.from('suppliers').update(formData).eq('id', editingSupplier.id)
      if (error) { toast.error('Failed to update'); return }
      toast.success('Supplier updated')
    } else {
      const { error } = await supabase.from('suppliers').insert(formData)
      if (error) { toast.error('Failed to add'); return }
      toast.success('Supplier added')
    }
    setModalOpen(false)
    fetchSuppliers()
  }

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setSuppliers(prev => prev.filter(s => s.id !== id))
    toast.success('Supplier deleted')
  }

  return (
    <DashboardLayout title="Suppliers" subtitle="Manage your product suppliers">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm"
            />
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <FiPlus className="h-4 w-4" /> Add Supplier
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? [...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-card loading-shimmer" />) :
            filtered.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <FiTruck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">No suppliers found</p>
              </div>
            ) : filtered.map(supplier => (
              <div key={supplier.id} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <FiTruck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                      {supplier.contact_person && <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${supplier.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {supplier.status}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {supplier.phone && <div className="flex items-center gap-2 text-muted-foreground"><FiPhone className="h-4 w-4" />{supplier.phone}</div>}
                  {supplier.email && <div className="flex items-center gap-2 text-muted-foreground"><FiMail className="h-4 w-4" />{supplier.email}</div>}
                  {supplier.city && <div className="flex items-center gap-2 text-muted-foreground"><FiMapPin className="h-4 w-4" />{supplier.city}</div>}
                </div>
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <button onClick={() => openEdit(supplier)} className="flex-1 rounded-lg border border-border py-2 text-xs font-medium hover:bg-muted">Edit</button>
                  <button onClick={() => deleteSupplier(supplier.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" required /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Contact Person</label>
                <input type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Phone</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">City</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Payment Terms</label>
                <input type="text" value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium">Address</label>
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" rows={2} /></div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {editingSupplier ? 'Update' : 'Add'} Supplier
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
