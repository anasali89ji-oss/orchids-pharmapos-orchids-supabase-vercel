'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { generateSalesReport, generateInventoryReport, generatePurchaseReport, generateReturnReport, generateLedgerReport } from '@/lib/pdf-generator'
import { FiDownload, FiCalendar, FiTrendingUp, FiPackage, FiUsers, FiDollarSign, FiFileText, FiRefreshCw, FiRotateCcw } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/useRealtimeData'

const COLORS = ['#0d9488', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

type ReportType = 'sales' | 'inventory' | 'profit' | 'customers' | 'purchases' | 'returns' | 'ledger'

function ReportsContent() {
  const [reportType, setReportType] = useState<ReportType>('sales')
  const [dateRange, setDateRange] = useState({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') })
  const [salesData, setSalesData] = useState<{ date: string; amount: number }[]>([])
  const [inventoryData, setInventoryData] = useState<{ name: string; value: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; sold: number; revenue: number }[]>([])
  const [customerData, setCustomerData] = useState<{ name: string; purchases: number; total: number }[]>([])
  const [rawSales, setRawSales] = useState<Array<{ receipt_number: string; created_at: string; customer_name: string; items: Array<{ name: string; quantity: number }>; grand_total: number; payment_method: string; payment_status: string }>>([])
  const [rawProducts, setRawProducts] = useState<Array<{ name: string; brand: string; stock: number; min_stock: number; price: number; cost: number; expiry_date: string | null; status: string }>>([])
  const [rawPurchases, setRawPurchases] = useState<Array<{ purchase_number: string; created_at: string; supplier_name: string; items: Array<{ name: string; qty: number }>; total_amount: number; payment_status: string }>>([])
  const [rawReturns, setRawReturns] = useState<Array<{ return_number: string; created_at: string; receipt_number: string; customer_name: string; reason: string; refund_amount: number; refund_method: string; status: string }>>([])
  const [rawLedger, setRawLedger] = useState<Array<{ created_at: string; description: string; ref_id: string; credit: number; debit: number; balance: number; transaction_type: string }>>([])
  const [stats, setStats] = useState({ totalSales: 0, totalProfit: 0, avgSale: 0, totalCustomers: 0, totalPurchases: 0, totalReturns: 0 })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const supabase = createClient()

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    
    try {
      const [salesRes, productsRes, customersRes, purchasesRes, returnsRes, ledgerRes] = await Promise.all([
        supabase.from('sales').select('*').gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('purchases').select('*').gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59').order('created_at', { ascending: false }),
        supabase.from('returns').select('*').gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59').order('created_at', { ascending: false }),
        supabase.from('ledger').select('*').gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59').order('created_at', { ascending: false })
      ])

      const sales = salesRes.data || []
      const products = productsRes.data || []
      const customers = customersRes.data || []
      const purchases = purchasesRes.data || []
      const returns = returnsRes.data || []
      const ledger = ledgerRes.data || []

      setRawSales(sales as typeof rawSales)
      setRawProducts(products as typeof rawProducts)
      setRawPurchases(purchases as typeof rawPurchases)
      setRawReturns(returns as typeof rawReturns)
      setRawLedger(ledger as typeof rawLedger)

      const salesByDate: Record<string, number> = {}
      const days = eachDayOfInterval({ start: new Date(dateRange.start), end: new Date(dateRange.end) })
      days.forEach(d => { salesByDate[format(d, 'MMM dd')] = 0 })
      
      let totalSales = 0, totalProfit = 0
      const productSales: Record<string, { sold: number; revenue: number }> = {}

      sales.forEach((sale: { created_at: string; grand_total: number; items: Array<{ name: string; price: number; cost: number; quantity: number }> }) => {
        const date = format(new Date(sale.created_at), 'MMM dd')
        salesByDate[date] = (salesByDate[date] || 0) + Number(sale.grand_total)
        totalSales += Number(sale.grand_total)
        
        const items = sale.items as { name: string; price: number; cost: number; quantity: number }[]
        items.forEach(item => {
          totalProfit += (item.price - item.cost) * item.quantity
          if (!productSales[item.name]) productSales[item.name] = { sold: 0, revenue: 0 }
          productSales[item.name].sold += item.quantity
          productSales[item.name].revenue += item.price * item.quantity
        })
      })

      setSalesData(Object.entries(salesByDate).map(([date, amount]) => ({ date, amount })))
      
      setInventoryData([
        { name: 'In Stock', value: products.filter((p: { stock: number }) => p.stock > 10).length },
        { name: 'Low Stock', value: products.filter((p: { stock: number }) => p.stock > 0 && p.stock <= 10).length },
        { name: 'Out of Stock', value: products.filter((p: { stock: number }) => p.stock === 0).length }
      ])

      setTopProducts(Object.entries(productSales)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data })))

      setCustomerData(customers.slice(0, 10).map((c: { name: string; outstanding_balance: number }) => ({
        name: c.name, purchases: 0, total: c.outstanding_balance
      })))

      setStats({
        totalSales,
        totalProfit,
        avgSale: sales.length > 0 ? totalSales / sales.length : 0,
        totalCustomers: customers.length,
        totalPurchases: purchases.reduce((sum: number, p: { total_amount: number }) => sum + Number(p.total_amount), 0),
        totalReturns: returns.reduce((sum: number, r: { refund_amount: number }) => sum + Number(r.refund_amount), 0)
      })

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [dateRange, supabase])

  useEffect(() => { fetchReportData() }, [fetchReportData])
  useAutoRefresh(fetchReportData, 60000)

  const exportPDF = () => {
    try {
      switch (reportType) {
        case 'sales':
          generateSalesReport(rawSales, dateRange, 'PharmaPOS Medical Store')
          break
        case 'inventory':
          generateInventoryReport(rawProducts, 'PharmaPOS Medical Store')
          break
        case 'purchases':
          generatePurchaseReport(rawPurchases, dateRange, 'PharmaPOS Medical Store')
          break
        case 'returns':
          generateReturnReport(rawReturns, dateRange, 'PharmaPOS Medical Store')
          break
        case 'ledger':
          generateLedgerReport(rawLedger, dateRange, 'PharmaPOS Medical Store')
          break
        default:
          toast.error('PDF export not available for this report type')
          return
      }
      toast.success('PDF generated successfully')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const exportCSV = () => {
    let csv = ''
    const filename = `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`
    
    switch (reportType) {
      case 'sales':
        csv = 'Receipt #,Date,Customer,Items,Payment,Status,Amount\n' + 
          rawSales.map(s => `${s.receipt_number},${format(new Date(s.created_at), 'yyyy-MM-dd')},${s.customer_name},${s.items.length},${s.payment_method},${s.payment_status},${s.grand_total}`).join('\n')
        break
      case 'inventory':
        csv = 'Product,Brand,Stock,Min Stock,Cost,Price,Value,Expiry\n' + 
          rawProducts.map(p => `"${p.name}","${p.brand}",${p.stock},${p.min_stock},${p.cost},${p.price},${p.stock * p.cost},${p.expiry_date || ''}`).join('\n')
        break
      case 'profit':
        csv = 'Product,Units Sold,Revenue\n' + topProducts.map(p => `"${p.name}",${p.sold},${p.revenue}`).join('\n')
        break
      case 'purchases':
        csv = 'Purchase #,Date,Supplier,Items,Status,Amount\n' +
          rawPurchases.map(p => `${p.purchase_number},${format(new Date(p.created_at), 'yyyy-MM-dd')},${p.supplier_name},${p.items.length},${p.payment_status},${p.total_amount}`).join('\n')
        break
      case 'returns':
        csv = 'Return #,Date,Receipt,Customer,Reason,Status,Refund\n' +
          rawReturns.map(r => `${r.return_number},${format(new Date(r.created_at), 'yyyy-MM-dd')},${r.receipt_number},${r.customer_name},"${r.reason}",${r.status},${r.refund_amount}`).join('\n')
        break
      case 'ledger':
        csv = 'Date,Description,Ref,Type,Credit,Debit,Balance\n' +
          rawLedger.map(e => `${format(new Date(e.created_at), 'yyyy-MM-dd')},"${e.description}",${e.ref_id},${e.transaction_type},${e.credit},${e.debit},${e.balance}`).join('\n')
        break
      default:
        csv = 'Date,Amount\n' + salesData.map(d => `${d.date},${d.amount}`).join('\n')
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    toast.success('CSV exported successfully')
  }

  const reportTabs = [
    { id: 'sales', label: 'Sales', icon: FiTrendingUp },
    { id: 'inventory', label: 'Inventory', icon: FiPackage },
    { id: 'profit', label: 'Profit', icon: FiDollarSign },
    { id: 'purchases', label: 'Purchases', icon: FiFileText },
    { id: 'returns', label: 'Returns', icon: FiRotateCcw },
    { id: 'customers', label: 'Customers', icon: FiUsers },
    { id: 'ledger', label: 'Ledger', icon: FiDollarSign },
  ]

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="Generate comprehensive business reports">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {reportTabs.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setReportType(tab.id as ReportType)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    reportType === tab.id 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-sm'
                  }`}>
                  <Icon className="h-4 w-4" /> {tab.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 transition-all hover:border-primary/50">
              <FiCalendar className="h-4 w-4 text-muted-foreground" />
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="border-0 bg-transparent py-2 text-sm focus:outline-none cursor-pointer" />
              <span className="text-muted-foreground">to</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="border-0 bg-transparent py-2 text-sm focus:outline-none cursor-pointer" />
            </div>
            <button onClick={fetchReportData} disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted hover:shadow-sm disabled:opacity-50">
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted hover:shadow-sm">
              <FiDownload className="h-4 w-4" /> CSV
            </button>
            <button onClick={exportPDF}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg">
              <FiFileText className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Last updated: {format(lastRefresh, 'PPpp')} - Auto-refreshes every minute
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-teal-500 transition-all hover:shadow-md">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-bold text-teal-600">PKR {stats.totalSales.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-green-500 transition-all hover:shadow-md">
            <p className="text-sm text-muted-foreground">Total Profit</p>
            <p className="text-2xl font-bold text-green-600">PKR {stats.totalProfit.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-blue-500 transition-all hover:shadow-md">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-2xl font-bold text-blue-600">PKR {stats.totalPurchases.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-red-500 transition-all hover:shadow-md">
            <p className="text-sm text-muted-foreground">Total Returns</p>
            <p className="text-2xl font-bold text-red-600">PKR {stats.totalReturns.toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl bg-card p-16 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading report data...</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {reportType === 'sales' && (
              <div className="rounded-xl bg-card p-6 shadow-sm lg:col-span-2 transition-all hover:shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Sales Over Time</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                        formatter={(value) => {
                          const n = typeof value === 'number' ? value : Number(value ?? 0)
                          return [`PKR ${n.toLocaleString()}`, 'Sales'] as [string, string]
                        }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {reportType === 'inventory' && (
              <>
                <div className="rounded-xl bg-card p-6 shadow-sm transition-all hover:shadow-md">
                  <h3 className="mb-4 text-lg font-semibold">Stock Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={inventoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                          {inventoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center gap-4">
                    {inventoryData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        {item.name}: {item.value}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-card p-6 shadow-sm transition-all hover:shadow-md">
                  <h3 className="mb-4 text-lg font-semibold">Stock Summary</h3>
                  <div className="space-y-4">
                    {inventoryData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded" style={{ backgroundColor: COLORS[i] }} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="text-2xl font-bold">{item.value}</span>
                      </div>
                    ))}
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">Total Stock Value</p>
                      <p className="text-xl font-bold text-primary">PKR {rawProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {reportType === 'profit' && (
              <div className="rounded-xl bg-card p-6 shadow-sm lg:col-span-2 transition-all hover:shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Top Selling Products</h3>
                {topProducts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FiPackage className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-2">No sales data available for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left text-sm font-semibold text-muted-foreground">Rank</th>
                          <th className="py-3 text-left text-sm font-semibold text-muted-foreground">Product</th>
                          <th className="py-3 text-center text-sm font-semibold text-muted-foreground">Units Sold</th>
                          <th className="py-3 text-right text-sm font-semibold text-muted-foreground">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((product, i) => (
                          <tr key={product.name} className="border-b border-border transition-colors hover:bg-muted/50">
                            <td className="py-3">
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                                i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                              }`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-3 font-medium">{product.name}</td>
                            <td className="py-3 text-center">{product.sold}</td>
                            <td className="py-3 text-right font-semibold text-primary">PKR {product.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'purchases' && (
              <div className="rounded-xl bg-card p-6 shadow-sm lg:col-span-2 transition-all hover:shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Purchase History</h3>
                {rawPurchases.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No purchases in this period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Purchase #</th>
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Supplier</th>
                          <th className="py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Items</th>
                          <th className="py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Status</th>
                          <th className="py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawPurchases.slice(0, 20).map(p => (
                          <tr key={p.purchase_number} className="border-b border-border transition-colors hover:bg-muted/50">
                            <td className="py-3 font-mono text-sm">{p.purchase_number}</td>
                            <td className="py-3 text-sm">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                            <td className="py-3 font-medium">{p.supplier_name || 'Manual'}</td>
                            <td className="py-3 text-center">{p.items.length}</td>
                            <td className="py-3 text-center">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {p.payment_status}
                              </span>
                            </td>
                            <td className="py-3 text-right font-semibold">PKR {Number(p.total_amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'returns' && (
              <div className="rounded-xl bg-card p-6 shadow-sm lg:col-span-2 transition-all hover:shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Return History</h3>
                {rawReturns.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No returns in this period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Return #</th>
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Reason</th>
                          <th className="py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Status</th>
                          <th className="py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Refund</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawReturns.slice(0, 20).map(r => (
                          <tr key={r.return_number} className="border-b border-border transition-colors hover:bg-muted/50">
                            <td className="py-3 font-mono text-sm">{r.return_number}</td>
                            <td className="py-3 text-sm">{format(new Date(r.created_at), 'MMM dd, yyyy')}</td>
                            <td className="py-3 font-medium">{r.customer_name || 'Walk-in'}</td>
                            <td className="py-3 text-sm text-muted-foreground">{r.reason || '-'}</td>
                            <td className="py-3 text-center">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 text-right font-semibold text-red-600">PKR {Number(r.refund_amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'customers' && (
              <div className="rounded-xl bg-card p-6 shadow-sm lg:col-span-2 transition-all hover:shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Customer Overview</h3>
                {customerData.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No customer data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                          <th className="py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Outstanding Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.map(customer => (
                          <tr key={customer.name} className="border-b border-border transition-colors hover:bg-muted/50">
                            <td className="py-3 font-medium">{customer.name}</td>
                            <td className="py-3 text-right">
                              <span className={customer.total > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                                PKR {customer.total.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'ledger' && (
              <div className="rounded-xl bg-card p-6 shadow-sm lg:col-span-2 transition-all hover:shadow-md">
                <h3 className="mb-4 text-lg font-semibold">Ledger Entries</h3>
                {rawLedger.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No ledger entries in this period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                          <th className="py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Description</th>
                          <th className="py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Type</th>
                          <th className="py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Credit</th>
                          <th className="py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Debit</th>
                          <th className="py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawLedger.slice(0, 30).map((e, i) => (
                          <tr key={i} className="border-b border-border transition-colors hover:bg-muted/50">
                            <td className="py-3 text-sm">{format(new Date(e.created_at), 'MMM dd')}</td>
                            <td className="py-3 font-medium">{e.description}</td>
                            <td className="py-3 text-center">
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{e.transaction_type}</span>
                            </td>
                            <td className="py-3 text-right">
                              {Number(e.credit) > 0 ? <span className="text-green-600">+{Number(e.credit).toLocaleString()}</span> : '-'}
                            </td>
                            <td className="py-3 text-right">
                              {Number(e.debit) > 0 ? <span className="text-red-600">-{Number(e.debit).toLocaleString()}</span> : '-'}
                            </td>
                            <td className="py-3 text-right font-semibold">PKR {Number(e.balance).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function ReportsPage() {
  return (
    <ErrorBoundary>
      <ReportsContent />
    </ErrorBoundary>
  )
}
