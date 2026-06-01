'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { DashboardStats, Sale, Product } from '@/types'
import { 
  FiDollarSign, FiTrendingUp, FiPackage, FiAlertTriangle, 
  FiClock, FiShoppingCart, FiEye, FiPlus 
} from 'react-icons/fi'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import Link from 'next/link'
import { format, subDays, startOfDay, endOfDay, startOfMonth } from 'date-fns'

const COLORS = ['#0d9488', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayProfit: 0,
    totalProducts: 0,
    lowStockCount: 0,
    expiringCount: 0,
    pendingCredits: 0,
    cashOnHand: 0,
    monthlyRevenue: 0
  })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [salesTrend, setSalesTrend] = useState<{date: string, amount: number}[]>([])
  const [categorySales, setCategorySales] = useState<{name: string, value: number}[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    const today = new Date()
    const todayStart = startOfDay(today).toISOString()
    const todayEnd = endOfDay(today).toISOString()
    const monthStart = startOfMonth(today).toISOString()

    const [
      todaySalesRes,
      monthSalesRes,
      productsRes,
      lowStockRes,
      expiringRes,
      creditsRes,
      ledgerRes,
      recentSalesRes
    ] = await Promise.all([
      supabase.from('sales').select('grand_total, items').gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('sales').select('grand_total').gte('created_at', monthStart),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('products').select('*').lt('stock', 10).eq('status', 'active').limit(10),
      supabase.from('products').select('id', { count: 'exact' }).lte('expiry_date', format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')).gte('expiry_date', format(today, 'yyyy-MM-dd')),
      supabase.from('credits').select('remaining_amount').neq('status', 'Paid'),
      supabase.from('ledger').select('balance').order('created_at', { ascending: false }).limit(1),
      supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5)
    ])

    const todaySalesData = todaySalesRes.data || []
    const todaySales = todaySalesData.reduce((sum, s) => sum + Number(s.grand_total), 0)
    const todayProfit = todaySalesData.reduce((sum, s) => {
      const items = s.items as { price: number, cost: number, quantity: number }[]
      return sum + items.reduce((iSum, item) => iSum + (item.price - item.cost) * item.quantity, 0)
    }, 0)

    const monthlyRevenue = (monthSalesRes.data || []).reduce((sum, s) => sum + Number(s.grand_total), 0)
    const pendingCredits = (creditsRes.data || []).reduce((sum, c) => sum + Number(c.remaining_amount), 0)
    const cashOnHand = ledgerRes.data?.[0]?.balance || 0

    setStats({
      todaySales,
      todayProfit,
      totalProducts: productsRes.count || 0,
      lowStockCount: (lowStockRes.data || []).length,
      expiringCount: expiringRes.count || 0,
      pendingCredits,
      cashOnHand: Number(cashOnHand),
      monthlyRevenue
    })

    setLowStockProducts(lowStockRes.data || [])
    setRecentSales(recentSalesRes.data || [])

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i)
      return { date: format(date, 'MMM dd'), amount: 0 }
    })

    const { data: weekSales } = await supabase
      .from('sales')
      .select('grand_total, created_at')
      .gte('created_at', subDays(today, 7).toISOString())

    weekSales?.forEach(sale => {
      const saleDate = format(new Date(sale.created_at), 'MMM dd')
      const dayIndex = last7Days.findIndex(d => d.date === saleDate)
      if (dayIndex !== -1) {
        last7Days[dayIndex].amount += Number(sale.grand_total)
      }
    })
    setSalesTrend(last7Days)

    setCategorySales([
      { name: 'Tablets', value: 35 },
      { name: 'Syrups', value: 25 },
      { name: 'Injections', value: 20 },
      { name: 'Creams', value: 12 },
      { name: 'Others', value: 8 }
    ])

    setLoading(false)
  }

  const statCards = [
    { label: "Today's Sales", value: `PKR ${stats.todaySales.toLocaleString()}`, icon: FiDollarSign, color: 'stat-sales', change: '+12%' },
    { label: "Today's Profit", value: `PKR ${stats.todayProfit.toLocaleString()}`, icon: FiTrendingUp, color: 'stat-profit', change: '+8%' },
    { label: 'Total Products', value: stats.totalProducts.toString(), icon: FiPackage, color: 'stat-products', change: '' },
    { label: 'Low Stock Alerts', value: stats.lowStockCount.toString(), icon: FiAlertTriangle, color: 'stat-alerts', change: stats.lowStockCount > 0 ? 'Action needed' : 'All good' },
    { label: 'Expiring Soon', value: stats.expiringCount.toString(), icon: FiClock, color: 'stat-expiry', change: stats.expiringCount > 0 ? 'Review needed' : 'None' },
  ]

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome to your pharmacy management system">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-card loading-shimmer" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-xl bg-card loading-shimmer" />
          <div className="h-80 rounded-xl bg-card loading-shimmer" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to your pharmacy management system">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Overview</h2>
            <p className="text-muted-foreground">Your pharmacy performance at a glance</p>
          </div>
          <Link
            href="/pos"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg"
          >
            <FiPlus className="h-4 w-4" />
            New Sale
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`stat-card ${stat.color} rounded-xl bg-card p-5 shadow-sm`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                    {stat.change && (
                      <p className={`mt-1 text-xs font-medium ${stat.change.includes('+') ? 'text-green-600' : stat.change.includes('Action') || stat.change.includes('Review') ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 rounded-xl bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Sales Trend (Last 7 Days)</h3>
              <span className="text-sm text-muted-foreground">PKR {stats.monthlyRevenue.toLocaleString()} this month</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    formatter={(value) => {
                      const n = typeof value === 'number' ? value : Number(value ?? 0)
                      return [`PKR ${n.toLocaleString()}`, 'Sales'] as [string, string]
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl bg-card p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-foreground">Sales by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySales}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categorySales.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {categorySales.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  {item.name}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-xl bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Sales</h3>
              <Link href="/receipts" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <FiEye className="h-4 w-4" />
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recentSales.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FiShoppingCart className="mx-auto h-10 w-10 opacity-50" />
                  <p className="mt-2">No recent sales</p>
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">{sale.receipt_number}</p>
                      <p className="text-sm text-muted-foreground">{sale.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">PKR {Number(sale.grand_total).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(sale.created_at), 'MMM dd, h:mm a')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="rounded-xl bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Low Stock Alerts</h3>
              <Link href="/inventory" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <FiEye className="h-4 w-4" />
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {lowStockProducts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FiPackage className="mx-auto h-10 w-10 opacity-50" />
                  <p className="mt-2">All products are well stocked</p>
                </div>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        product.stock === 0 
                          ? 'bg-red-100 text-red-700' 
                          : product.stock < 5 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.stock} in stock
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="rounded-xl bg-card p-6 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-foreground">Financial Summary</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-teal-50 p-4 dark:bg-teal-950/30">
              <p className="text-sm text-teal-700 dark:text-teal-400">Cash on Hand</p>
              <p className="mt-1 text-2xl font-bold text-teal-900 dark:text-teal-100">PKR {stats.cashOnHand.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
              <p className="text-sm text-green-700 dark:text-green-400">Monthly Revenue</p>
              <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-100">PKR {stats.monthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="text-sm text-amber-700 dark:text-amber-400">Pending Credits</p>
              <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">PKR {stats.pendingCredits.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
              <p className="text-sm text-blue-700 dark:text-blue-400">Est. Stock Value</p>
              <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">PKR 0</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
