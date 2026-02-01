'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types'
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUsers, FiPhone, FiMail, FiStar } from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', city: '', customer_type: 'regular', credit_limit: 0, notes: ''
  })
  const supabase = createClient()

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const openAdd = () => {
    setEditingCustomer(null)
    setFormData({ name: '', phone: '', email: '', address: '', city: '', customer_type: 'regular', credit_limit: 0, notes: '' })
    setModalOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditingCustomer(c)
    setFormData({
      name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '',
      city: c.city || '', customer_type: c.customer_type, credit_limit: c.credit_limit, notes: c.notes || ''
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) { toast.error('Name is required'); return }

    if (editingCustomer) {
      const { error } = await supabase.from('customers').update(formData).eq('id', editingCustomer.id)
      if (error) { toast.error('Failed to update'); return }
      toast.success('Customer updated')
    } else {
      const { error } = await supabase.from('customers').insert(formData)
      if (error) { toast.error('Failed to add'); return }
      toast.success('Customer added')
    }
    setModalOpen(false)
    fetchCustomers()
  }

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setCustomers(prev => prev.filter(c => c.id !== id))
    toast.success('Customer deleted')
  }

  return (
    <DashboardLayout title="Customers" subtitle="Manage your customer relationships">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search customers..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm" />
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <FiPlus className="h-4 w-4" /> Add Customer
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-amber-500">
            <p className="text-sm text-muted-foreground">VIP Customers</p>
            <p className="text-2xl font-bold text-amber-600">{customers.filter(c => c.customer_type === 'vip').length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold text-purple-600">PKR {customers.reduce((s, c) => s + c.outstanding_balance, 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? <div className="p-8 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div> :
            filtered.length === 0 ? (
              <div className="py-16 text-center">
                <FiUsers className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">No customers found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Contact</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Type</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Points</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Outstanding</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(customer => (
                    <tr key={customer.id} className="table-row-hover">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{customer.name}</p>
                            {customer.city && <p className="text-xs text-muted-foreground">{customer.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {customer.phone && <div className="flex items-center gap-1 text-sm text-muted-foreground"><FiPhone className="h-3 w-3" />{customer.phone}</div>}
                        {customer.email && <div className="flex items-center gap-1 text-sm text-muted-foreground"><FiMail className="h-3 w-3" />{customer.email}</div>}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          customer.customer_type === 'vip' ? 'bg-amber-100 text-amber-700' :
                          customer.customer_type === 'wholesale' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {customer.customer_type === 'vip' && <FiStar className="mr-1 inline h-3 w-3" />}
                          {customer.customer_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-medium">{customer.loyalty_points}</td>
                      <td className="py-4 px-4 text-right">
                        <span className={customer.outstanding_balance > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                          PKR {customer.outstanding_balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(customer)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><FiEdit2 className="h-4 w-4" /></button>
                          <button onClick={() => deleteCustomer(customer.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
                        </div>
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
          <DialogHeader><DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" required /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Phone</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">City</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Customer Type</label>
                <select value={formData.customer_type} onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                  <option value="wholesale">Wholesale</option>
                </select></div>
              <div><label className="mb-1.5 block text-sm font-medium">Credit Limit (PKR)</label>
                <input type="number" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium">Address</label>
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" rows={2} /></div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {editingCustomer ? 'Update' : 'Add'} Customer
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
