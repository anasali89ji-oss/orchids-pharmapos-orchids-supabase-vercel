'use client'

import { useState, useEffect } from 'react'
import {
  FiHome,
  FiUsers,
  FiCreditCard,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiActivity,
  FiMoreVertical,
  FiExternalLink,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle
} from 'react-icons/fi'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface DashboardStats {
  totalPharmacies: number
  activePharmacies: number
  trialingPharmacies: number
  pastDuePharmacies: number
  inactivePharmacies: number
  totalRevenue: number
  monthlyRevenue: number
  totalUsers: number
  recentPharmacies: any[]
  recentPayments: any[]
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280']

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPharmacies: 0,
    activePharmacies: 0,
    trialingPharmacies: 0,
    pastDuePharmacies: 0,
    inactivePharmacies: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    recentPharmacies: [],
    recentPayments: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const fetchDashboardStats = async () => {
    try {
      // Fetch pharmacies count by status
      const { data: pharmacies, error: pharmaciesError } = await supabase
        .from('pharmacies')
        .select('id, subscription_status, plan')

      if (pharmaciesError) throw pharmaciesError

      const activeCount = pharmacies?.filter(p => p.subscription_status === 'active').length || 0
      const trialingCount = pharmacies?.filter(p => p.subscription_status === 'trialing').length || 0
      const pastDueCount = pharmacies?.filter(p => p.subscription_status === 'past_due').length || 0
      const inactiveCount = pharmacies?.filter(p => !p.subscription_status || p.subscription_status === 'inactive').length || 0

      // Fetch users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      // Fetch recent payments
      const { data: payments, error: paymentsError } = await supabase
        .from('stripe_payments')
        .select('*, pharmacies(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (paymentsError && paymentsError.code !== 'PGRST116') {
        console.log('Payments table may not exist yet')
      }

      // Calculate revenue (mock data for now, would be calculated from actual payments)
      const totalRevenue = activeCount * 14999 + trialingCount * 14999
      const monthlyRevenue = (activeCount + trialingCount) * 14999

      // Fetch recent pharmacies
      const { data: recentPharmacies, error: recentError } = await supabase
        .from('pharmacies')
        .select('id, name, email, subscription_status, plan, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError) throw recentError

      setStats({
        totalPharmacies: pharmacies?.length || 0,
        activePharmacies: activeCount,
        trialingPharmacies: trialingCount,
        pastDuePharmacies: pastDueCount,
        inactivePharmacies: inactiveCount,
        totalRevenue,
        monthlyRevenue,
        totalUsers: usersCount || 0,
        recentPharmacies: recentPharmacies || [],
        recentPayments: payments || []
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const subscriptionData = [
    { name: 'Active', value: stats.activePharmacies, color: COLORS[0] },
    { name: 'Trial', value: stats.trialingPharmacies, color: COLORS[1] },
    { name: 'Past Due', value: stats.pastDuePharmacies, color: COLORS[2] },
    { name: 'Inactive', value: stats.inactivePharmacies, color: COLORS[3] },
  ].filter(item => item.value > 0)

  const revenueData = [
    { month: 'Jan', revenue: 45000 },
    { month: 'Feb', revenue: 52000 },
    { month: 'Mar', revenue: 48000 },
    { month: 'Apr', revenue: 61000 },
    { month: 'May', revenue: 58000 },
    { month: 'Jun', revenue: 72000 },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'operational':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />
      case 'trialing':
        return <FiActivity className="h-5 w-5 text-yellow-500" />
      case 'past_due':
        return <FiAlertCircle className="h-5 w-5 text-orange-500" />
      case 'inactive':
      case 'suspended':
        return <FiXCircle className="h-5 w-5 text-red-500" />
      default:
        return <FiActivity className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
      case 'operational':
        return 'bg-green-100 text-green-800'
      case 'trialing':
        return 'bg-yellow-100 text-yellow-800'
      case 'past_due':
        return 'bg-orange-100 text-orange-800'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Welcome to your Super Admin Panel</p>
        </div>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <FiActivity className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Pharmacies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Pharmacies</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPharmacies}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <FiHome className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-400 ml-1">from last month</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activePharmacies}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <FiDollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+8%</span>
            <span className="text-gray-400 ml-1">growth</span>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPKR(stats.monthlyRevenue)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <FiCreditCard className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+15%</span>
            <span className="text-gray-400 ml-1">vs last month</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <FiUsers className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <FiTrendingDown className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-red-600 font-medium">-3%</span>
            <span className="text-gray-400 ml-1">churn</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" tickFormatter={(value) => `PKR ${value / 1000}K`} />
                <Tooltip
                  formatter={(value: number) => [formatPKR(value), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {subscriptionData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pharmacies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Pharmacies</h3>
            <a href="/superadmin/pharmacies" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <FiExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="space-y-3">
            {stats.recentPharmacies.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pharmacies yet</p>
            ) : (
              stats.recentPharmacies.map((pharmacy) => (
                <div
                  key={pharmacy.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FiHome className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{pharmacy.name}</p>
                      <p className="text-sm text-gray-500">{pharmacy.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(pharmacy.subscription_status || pharmacy.status)}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(pharmacy.subscription_status || pharmacy.status)}`}>
                      {(pharmacy.subscription_status || pharmacy.status || 'inactive').charAt(0).toUpperCase() + (pharmacy.subscription_status || pharmacy.status || 'inactive').slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
            <a href="/superadmin/payments" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <FiExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="space-y-3">
            {stats.recentPayments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No payments yet</p>
            ) : (
              stats.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiDollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.pharmacies?.name || 'Unknown Pharmacy'}</p>
                      <p className="text-sm text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPKR(payment.amount / 100)}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
