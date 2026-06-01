'use client'

import { useState, useEffect } from 'react'
import {
  FiBriefcase,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiEye,
  FiEdit2,
  FiPower,
  FiMail,
  FiPhone,
  FiMapPin,
  FiUsers,
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiActivity,
  FiExternalLink,
  FiX
} from 'react-icons/fi'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Pharmacy {
    id: string
    name: string
    slug: string
    owner_email: string
    owner_name: string
    phone: string | null
    address: string | null
    subscription_status: string
    subscription_tier: string
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    status: string
    is_suspended: boolean
    created_at: string
    billing_cycle_anchor: string | null
    user_count?: number
  }

interface NewPharmacyForm {
  name: string
  owner_name: string
  owner_email: string
  slug: string
  phone: string
  address: string
  subscription_tier: 'pro' | 'enterprise'
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<NewPharmacyForm>({
    name: '',
    owner_name: '',
    owner_email: '',
    slug: '',
    phone: '',
    address: '',
    subscription_tier: 'pro'
  })
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  const fetchPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*, users(count)')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get user counts
      const pharmaciesWithCounts = await Promise.all(
        (data || []).map(async (p) => {
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('pharmacy_id', p.id)
          return { ...p, user_count: count || 0 }
        })
      )

      setPharmacies(pharmaciesWithCounts)
    } catch (error) {
      console.error('Error fetching pharmacies:', error)
      toast.error('Failed to load pharmacies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPharmacies()
  }, [])

  const handleCreatePharmacy = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/superadmin/create-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create pharmacy')
      }

        toast.success('Pharmacy created successfully! Checkout link generated.')
        setShowAddModal(false)
        setFormData({
          name: '',
          owner_name: '',
          owner_email: '',
          slug: '',
          phone: '',
          address: '',
          subscription_tier: 'pro'
        })
        fetchPharmacies()

      // Open checkout URL in new tab
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Error creating pharmacy:', error)
      toast.error(error.message || 'Failed to create pharmacy')
    } finally {
      setCreating(false)
    }
  }

  const togglePharmacyStatus = async (pharmacy: Pharmacy) => {
    const newStatus = pharmacy.is_suspended ? 'operational' : 'suspended'
    const newSuspended = !pharmacy.is_suspended

    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({
          status: newStatus,
          is_suspended: newSuspended
        })
        .eq('id', pharmacy.id)

      if (error) throw error

      toast.success(`Pharmacy ${newSuspended ? 'suspended' : 'activated'} successfully`)
      fetchPharmacies()
    } catch (error) {
      console.error('Error updating pharmacy:', error)
      toast.error('Failed to update pharmacy status')
    }
  }

    const filteredPharmacies = pharmacies.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || p.subscription_status === statusFilter

      return matchesSearch && matchesStatus
    })

  const getStatusIcon = (status: string, isSuspended: boolean) => {
    if (isSuspended) return <FiXCircle className="h-5 w-5 text-red-500" />
    switch (status) {
      case 'active':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />
      case 'trialing':
        return <FiActivity className="h-5 w-5 text-yellow-500" />
      case 'past_due':
        return <FiAlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <FiActivity className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadgeClass = (status: string, isSuspended: boolean) => {
    if (isSuspended) return 'bg-red-100 text-red-800'
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trialing':
        return 'bg-yellow-100 text-yellow-800'
      case 'past_due':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800'
      case 'pro':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
          <p className="text-gray-500 mt-1">Manage all pharmacy accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <FiPlus className="h-4 w-4" />
          Add Pharmacy
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search pharmacies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trialing">Trial</option>
            <option value="past_due">Past Due</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Pharmacies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading pharmacies...</p>
          </div>
        ) : filteredPharmacies.length === 0 ? (
          <div className="p-12 text-center">
            <FiBriefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pharmacies found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Create your first pharmacy
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pharmacy</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPharmacies.map((pharmacy) => (
                  <tr key={pharmacy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                          {pharmacy.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{pharmacy.name}</p>
                          <p className="text-sm text-gray-500">{pharmacy.slug}</p>
                        </div>
                      </div>
                    </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiMail className="h-4 w-4 text-gray-400" />
                            {pharmacy.owner_email}
                          </div>
                          {pharmacy.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FiPhone className="h-4 w-4 text-gray-400" />
                              {pharmacy.phone}
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTierBadgeClass(pharmacy.subscription_tier)}`}>
                        {pharmacy.subscription_tier?.toUpperCase() || 'STARTER'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pharmacy.subscription_status, pharmacy.is_suspended)}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(pharmacy.subscription_status, pharmacy.is_suspended)}`}>
                          {pharmacy.is_suspended ? 'Suspended' : pharmacy.subscription_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiUsers className="h-4 w-4 text-gray-400" />
                        {pharmacy.user_count || 0}/50
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePharmacyStatus(pharmacy)}
                          className={`p-2 rounded-lg transition-colors ${
                            pharmacy.is_suspended
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                          title={pharmacy.is_suspended ? 'Activate' : 'Suspend'}
                        >
                          <FiPower className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Pharmacy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add New Pharmacy</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
              <form onSubmit={handleCreatePharmacy} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pharmacy Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. MediCare Pharmacy"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Email</label>
                  <input
                    type="email"
                    required
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    placeholder="owner@pharmacy.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="medicare-pharmacy"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">URL-friendly identifier (lowercase, hyphens only)</p>
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+92 300 1234567"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full pharmacy address..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Plan</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, subscription_tier: 'pro' })}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      formData.subscription_tier === 'pro'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">Pro</p>
                    <p className="text-sm text-gray-500">PKR 14,999/mo</p>
                    <p className="text-xs text-gray-400 mt-1">Up to 50 users</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, subscription_tier: 'enterprise' })}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      formData.subscription_tier === 'enterprise'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">Enterprise</p>
                    <p className="text-sm text-gray-500">PKR 24,999/mo</p>
                    <p className="text-xs text-gray-400 mt-1">Unlimited users</p>
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiPlus className="h-4 w-4" />
                      Create Pharmacy
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
