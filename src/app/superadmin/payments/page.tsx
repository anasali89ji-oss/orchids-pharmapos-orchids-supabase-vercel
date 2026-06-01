'use client'

import { useState, useEffect } from 'react'
import {
  FiCreditCard,
  FiDownload,
  FiFilter,
  FiSearch,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiClock,
  FiCalendar,
  FiBriefcase,
  FiDatabase,
  FiMoreVertical,
  FiEye
} from 'react-icons/fi'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Payment {
  id: string
  pharmacy_id: string
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  stripe_subscription_id: string | null
  amount: number
  currency: string
  status: string
  payment_type: string
  description: string | null
  failure_reason: string | null
  period_start: string | null
  period_end: string | null
  created_at: string
  pharmacies: {
    name: string
    email: string
  }
}

interface PaymentStats {
  totalRevenue: number
  pendingRevenue: number
  failedRevenue: number
  succeededCount: number
  pendingCount: number
  failedCount: number
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    pendingRevenue: 0,
    failedRevenue: 0,
    succeededCount: 0,
    pendingCount: 0,
    failedCount: 0
  })
  const supabase = createClient()

    const formatPKR = (amount: number) => {
      return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from('stripe_payments')
        .select('*, pharmacies(name, email)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (typeFilter !== 'all') {
        query = query.eq('payment_type', typeFilter)
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start)
      }

      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end + 'T23:59:59')
      }

      const { data, error } = await query.limit(100)

      if (error) {
        if (error.code === 'PGRST116') {
          setPayments([])
        } else {
          throw error
        }
      } else {
        setPayments(data || [])
      }

      // Calculate stats
      const allPayments = data || []
      setStats({
        totalRevenue: allPayments
          .filter(p => p.status === 'succeeded')
          .reduce((acc, p) => acc + p.amount, 0),
        pendingRevenue: allPayments
          .filter(p => p.status === 'pending')
          .reduce((acc, p) => acc + p.amount, 0),
        failedRevenue: allPayments
          .filter(p => p.status === 'failed')
          .reduce((acc, p) => acc + p.amount, 0),
        succeededCount: allPayments.filter(p => p.status === 'succeeded').length,
        pendingCount: allPayments.filter(p => p.status === 'pending').length,
        failedCount: allPayments.filter(p => p.status === 'failed').length
      })
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [statusFilter, typeFilter, dateRange])

    const exportToCSV = () => {
      const headers = ['Date', 'Pharmacy', 'Email', 'Type', 'Status', 'Amount', 'Description']
      const rows = filteredPayments.map(p => [
        new Date(p.created_at).toLocaleDateString(),
        `"${p.pharmacies?.name || 'Unknown'}"`,
        p.pharmacies?.email || '',
        p.payment_type,
        p.status,
        (p.amount).toFixed(2),
        `"${p.description || ''}"`
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Payments exported successfully')
    }

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.pharmacies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pharmacies?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.stripe_invoice_id?.includes(searchTerm)

    return matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
      case 'processing':
        return <FiClock className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <FiXCircle className="h-5 w-5 text-red-500" />
      case 'refunded':
        return <FiCreditCard className="h-5 w-5 text-blue-500" />
      default:
        return <FiCreditCard className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">View and manage subscription payments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPayments}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FiDatabase className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <FiDownload className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPKR(stats.totalRevenue)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <FiDollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-4 flex items-center gap-1">
            <FiCheckCircle className="h-4 w-4" />
            {stats.succeededCount} successful payments
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPKR(stats.pendingRevenue)}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-xl">
              <FiClock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-yellow-600 mt-4 flex items-center gap-1">
            <FiClock className="h-4 w-4" />
            {stats.pendingCount} pending payments
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPKR(stats.failedRevenue)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <FiAlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-red-600 mt-4 flex items-center gap-1">
            <FiXCircle className="h-4 w-4" />
            {stats.failedCount} failed payments
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <FiCreditCard className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">All transactions recorded</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="monthly_subscription">Monthly</option>
              <option value="annual_subscription">Annual</option>
              <option value="one_time_setup">Setup Fee</option>
              <option value="addon">Add-on</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4 border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            <FiCalendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Date Range:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <FiCreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payments found</p>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pharmacy</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(payment.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <FiBriefcase className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {payment.pharmacies?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.pharmacies?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
                        {payment.payment_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      {payment.failure_reason && (
                        <p className="text-xs text-red-600 mt-1">{payment.failure_reason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPKR(payment.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {payment.period_start && payment.period_end ? (
                        <div className="text-xs text-gray-500">
                          <div>{new Date(payment.period_start).toLocaleDateString()}</div>
                          <div>to {new Date(payment.period_end).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Placeholder */}
      {filteredPayments.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredPayments.length} of {payments.length} payments
          </p>
        </div>
      )}
    </div>
  )
}
