'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { 
  FiBell, FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiInfo, 
  FiTrash2, FiCheck, FiPackage, FiClock, FiDollarSign, FiRefreshCw,
  FiFilter, FiX
} from 'react-icons/fi'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  severity: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  related_id?: string
  related_type?: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface SystemAlert {
  type: 'low_stock' | 'expiring' | 'pending_credit' | 'system'
  title: string
  message: string
  severity: 'warning' | 'error' | 'info'
  count?: number
  items?: Array<{ id: string; name: string; value: string | number }>
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'sales' | 'inventory' | 'system'>('all')
  const [generatingAlerts, setGeneratingAlerts] = useState(false)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    
    setNotifications(notifs || [])
    
    await generateSystemAlerts()
    setLoading(false)
  }, [supabase])

  const generateSystemAlerts = async () => {
    setGeneratingAlerts(true)
    const alerts: SystemAlert[] = []
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('id, name, stock, min_stock')
      .lt('stock', 10)
      .gt('stock', 0)
      .eq('status', 'active')

    if (lowStockProducts && lowStockProducts.length > 0) {
      alerts.push({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${lowStockProducts.length} products are running low on stock`,
        severity: 'warning',
        count: lowStockProducts.length,
        items: lowStockProducts.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          value: `${p.stock} remaining`
        }))
      })
    }

    const { data: outOfStock } = await supabase
      .from('products')
      .select('id, name')
      .eq('stock', 0)
      .eq('status', 'active')

    if (outOfStock && outOfStock.length > 0) {
      alerts.push({
        type: 'low_stock',
        title: 'Out of Stock',
        message: `${outOfStock.length} products are completely out of stock`,
        severity: 'error',
        count: outOfStock.length,
        items: outOfStock.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          value: 'Out of stock'
        }))
      })
    }

    const { data: expiringProducts } = await supabase
      .from('products')
      .select('id, name, expiry_date')
      .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('expiry_date', today.toISOString().split('T')[0])
      .eq('status', 'active')

    if (expiringProducts && expiringProducts.length > 0) {
      alerts.push({
        type: 'expiring',
        title: 'Expiry Warning',
        message: `${expiringProducts.length} products will expire within 30 days`,
        severity: 'warning',
        count: expiringProducts.length,
        items: expiringProducts.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          value: format(new Date(p.expiry_date), 'MMM dd, yyyy')
        }))
      })
    }

    const { data: expiredProducts } = await supabase
      .from('products')
      .select('id, name, expiry_date')
      .lt('expiry_date', today.toISOString().split('T')[0])
      .eq('status', 'active')

    if (expiredProducts && expiredProducts.length > 0) {
      alerts.push({
        type: 'expiring',
        title: 'Expired Products',
        message: `${expiredProducts.length} products have already expired`,
        severity: 'error',
        count: expiredProducts.length,
        items: expiredProducts.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          value: `Expired ${format(new Date(p.expiry_date), 'MMM dd')}`
        }))
      })
    }

    const { data: pendingCredits } = await supabase
      .from('credits')
      .select('id, customer_name, remaining_amount')
      .neq('status', 'Paid')

    if (pendingCredits && pendingCredits.length > 0) {
      const totalPending = pendingCredits.reduce((sum, c) => sum + Number(c.remaining_amount), 0)
      alerts.push({
        type: 'pending_credit',
        title: 'Pending Credits',
        message: `PKR ${totalPending.toLocaleString()} pending from ${pendingCredits.length} customers`,
        severity: 'warning',
        count: pendingCredits.length,
        items: pendingCredits.slice(0, 5).map(c => ({
          id: c.id,
          name: c.customer_name,
          value: `PKR ${Number(c.remaining_amount).toLocaleString()}`
        }))
      })
    }

    setSystemAlerts(alerts)
    setGeneratingAlerts(false)
  }

  useEffect(() => { fetchData() }, [fetchData])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('All notifications marked as read')
  }

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success('Notification deleted')
  }

  const clearAllNotifications = async () => {
    await supabase.from('notifications').delete().neq('id', '')
    setNotifications([])
    toast.success('All notifications cleared')
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'sales') return n.type === 'sale' || n.type === 'credit'
    if (filter === 'inventory') return n.type === 'stock' || n.type === 'expiry'
    if (filter === 'system') return n.type === 'system'
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <FiAlertCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <FiAlertTriangle className="h-5 w-5 text-amber-500" />
      case 'success': return <FiCheckCircle className="h-5 w-5 text-green-500" />
      default: return <FiInfo className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
      case 'warning': return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      case 'success': return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
      default: return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return <FiPackage className="h-5 w-5" />
      case 'expiring': return <FiClock className="h-5 w-5" />
      case 'pending_credit': return <FiDollarSign className="h-5 w-5" />
      default: return <FiBell className="h-5 w-5" />
    }
  }

  return (
    <DashboardLayout title="Notifications" subtitle="System alerts and activity log">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">System Alerts</h3>
                {generatingAlerts && (
                  <FiRefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <button 
                onClick={generateSystemAlerts}
                disabled={generatingAlerts}
                className="text-sm text-primary hover:underline"
              >
                Refresh Alerts
              </button>
            </div>

            {systemAlerts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FiCheckCircle className="mx-auto h-12 w-12 text-green-500 opacity-50" />
                <p className="mt-2 font-medium">All Systems Normal</p>
                <p className="text-sm">No critical alerts at this time</p>
              </div>
            ) : (
              <div className="space-y-4">
                {systemAlerts.map((alert, index) => (
                  <motion.div
                    key={`${alert.type}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-xl border p-4 ${getSeverityBg(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${
                        alert.severity === 'error' ? 'bg-red-100 text-red-600' :
                        alert.severity === 'warning' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {getTypeIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{alert.title}</h4>
                          {alert.count && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              alert.severity === 'error' ? 'bg-red-100 text-red-700' :
                              alert.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {alert.count} items
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        
                        {alert.items && alert.items.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {alert.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm rounded-lg bg-background/50 px-3 py-2">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-muted-foreground">{item.value}</span>
                              </div>
                            ))}
                            {alert.count && alert.count > 5 && (
                              <p className="text-xs text-muted-foreground text-center pt-2">
                                and {alert.count - 5} more...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Activity Log</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-sm text-primary hover:underline">
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAllNotifications} className="text-sm text-red-500 hover:underline">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'sales', label: 'Sales' },
                { id: 'inventory', label: 'Inventory' },
                { id: 'system', label: 'System' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as typeof filter)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    filter === f.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted loading-shimmer" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FiBell className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2 font-medium">No notifications</p>
                <p className="text-sm">Activity will appear here</p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                  {filteredNotifications.map((notif, index) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.02 }}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all hover:shadow-sm ${
                        notif.is_read ? 'bg-background border-border' : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      {getSeverityIcon(notif.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium ${!notif.is_read ? 'text-primary' : ''}`}>
                            {notif.title}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notif.is_read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Mark as read"
                          >
                            <FiCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-950/30 p-4">
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">Critical Alerts</span>
                </div>
                <span className="text-xl font-bold text-red-600">
                  {systemAlerts.filter(a => a.severity === 'error').length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-3">
                  <FiAlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">Warnings</span>
                </div>
                <span className="text-xl font-bold text-amber-600">
                  {systemAlerts.filter(a => a.severity === 'warning').length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
                <div className="flex items-center gap-3">
                  <FiBell className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Unread</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{unreadCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Alert Actions</h3>
            <div className="space-y-3">
              <a href="/inventory" className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-primary/5">
                <FiPackage className="h-5 w-5 text-primary" />
                <span className="font-medium">Manage Inventory</span>
              </a>
              <a href="/products" className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-primary/5">
                <FiClock className="h-5 w-5 text-primary" />
                <span className="font-medium">Check Expiry Dates</span>
              </a>
              <a href="/accounting" className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-primary/5">
                <FiDollarSign className="h-5 w-5 text-primary" />
                <span className="font-medium">View Credit Sales</span>
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-6">
            <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">Email Notifications</h3>
            <p className="text-sm text-amber-700 dark:text-amber-500 mb-4">
              Get alerts sent to your email for critical inventory and sales events.
            </p>
            <a href="/settings" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors">
              Configure Email Settings
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function NotificationsPage() {
  return (
    <ErrorBoundary>
      <NotificationsContent />
    </ErrorBoundary>
  )
}
