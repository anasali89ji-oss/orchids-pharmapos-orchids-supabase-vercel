'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Settings } from '@/types'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { 
FiSave, FiGlobe, FiDollarSign, FiMoon, FiSun, FiShield, FiDatabase, 
FiBell, FiFileText, FiClock, FiPackage, FiUsers, FiPercent, FiDownload,
FiCreditCard, FiZap, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { format } from 'date-fns'

type TabType = 'general' | 'financial' | 'inventory' | 'receipts' | 'notifications' | 'backup' | 'security' | 'billing'

function SettingsContent() {
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [settings, setSettings] = useState<Partial<Settings>>({
    store_name: 'PharmaPOS', store_address: '', store_phone: '', store_email: '',
    currency: 'PKR', tax_rate: 5, opening_balance: 0, receipt_header: '', receipt_footer: '',
    low_stock_threshold: 10, expiry_warning_days: 30, language: 'en'
  })
  const [taxRates, setTaxRates] = useState([
    { id: 1, name: 'Standard GST', rate: 5, default: true },
    { id: 2, name: 'Reduced GST', rate: 2.5, default: false },
    { id: 3, name: 'Zero Rate', rate: 0, default: false }
  ])
  const [notifications, setNotifications] = useState({
    lowStock: true, dailyReport: false, expiryAlert: true, salesAlert: false,
    emailNotifications: false, email: ''
  })
  const [security, setSecurity] = useState({
    sessionTimeout: 30, requirePassword: true, twoFactor: false, autoLogout: true
  })
  const [subscription, setSubscription] = useState({
    plan: 'starter',
    status: 'active',
    currentPeriodEnd: null as string | null,
    stripeCustomerId: null as string | null,
    stripeSubscriptionId: null as string | null
  })
  const [pharmacyId, setPharmacyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    if (data) setSettings(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { data: existing } = await supabase.from('settings').select('id').limit(1).single()
      
      if (existing) {
        await supabase.from('settings').update(settings).eq('id', existing.id)
      } else {
        await supabase.from('settings').insert(settings)
      }
      
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const exportData = async (type: string) => {
    toast.loading(`Exporting ${type}...`)
    try {
      let data, filename
      switch (type) {
        case 'products':
          const { data: products } = await supabase.from('products').select('*')
          data = products
          filename = 'products_backup.json'
          break
        case 'customers':
          const { data: customers } = await supabase.from('customers').select('*')
          data = customers
          filename = 'customers_backup.json'
          break
        case 'sales':
          const { data: sales } = await supabase.from('sales').select('*')
          data = sales
          filename = 'sales_backup.json'
          break
        case 'all':
          const [productsRes, customersRes, salesRes, ledgerRes] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('customers').select('*'),
            supabase.from('sales').select('*'),
            supabase.from('ledger').select('*')
          ])
          data = {
            products: productsRes.data,
            customers: customersRes.data,
            sales: salesRes.data,
            ledger: ledgerRes.data,
            exportedAt: new Date().toISOString()
          }
          filename = `pharmapos_full_backup_${format(new Date(), 'yyyy-MM-dd')}.json`
          break
        default:
          return
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      toast.dismiss()
      toast.success(`${type} exported successfully`)
    } catch (error) {
      toast.dismiss()
      toast.error('Export failed')
    }
  }

const tabs = [
  { id: 'general', label: 'General', icon: FiGlobe },
  { id: 'financial', label: 'Financial', icon: FiDollarSign },
  { id: 'inventory', label: 'Inventory', icon: FiPackage },
  { id: 'receipts', label: 'Receipts', icon: FiFileText },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'backup', label: 'Backup', icon: FiDatabase },
  { id: 'security', label: 'Security', icon: FiShield },
  { id: 'billing', label: 'Billing', icon: FiCreditCard },
]

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="Configure your pharmacy system">
        <div className="max-w-4xl mx-auto"><div className="h-96 rounded-xl bg-card loading-shimmer" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Settings" subtitle="Configure your pharmacy system">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Store Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Store Name</label>
                  <input type="text" value={settings.store_name || ''} 
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm input-focus" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Phone Number</label>
                  <input type="text" value={settings.store_phone || ''} 
                    onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm input-focus" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <input type="email" value={settings.store_email || ''} 
                    onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm input-focus" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Language</label>
                  <select value={settings.language || 'en'} 
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                    <option value="en">English</option>
                    <option value="ur">Urdu</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Address</label>
                  <textarea value={settings.store_address || ''} 
                    onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm input-focus" rows={2} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Appearance</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Theme</label>
                  <div className="flex gap-3">
                    <button onClick={() => setTheme('light')}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${theme === 'light' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                      <FiSun className="h-4 w-4" /> Light
                    </button>
                    <button onClick={() => setTheme('dark')}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                      <FiMoon className="h-4 w-4" /> Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Currency & Tax</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Currency</label>
                  <select value={settings.currency || 'PKR'} 
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Default Tax Rate (%)</label>
                  <input type="number" value={settings.tax_rate || 5} 
                    onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" 
                    min={0} max={100} step={0.5} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Opening Balance</label>
                  <input type="number" value={settings.opening_balance || 0} 
                    onChange={(e) => setSettings({ ...settings, opening_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Tax Rates</h3>
                <button 
                  onClick={() => setTaxRates([...taxRates, { id: Date.now(), name: 'New Rate', rate: 0, default: false }])}
                  className="text-sm text-primary hover:underline">
                  + Add Rate
                </button>
              </div>
              <div className="space-y-3">
                {taxRates.map((tax, index) => (
                  <div key={tax.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <input type="text" value={tax.name} 
                      onChange={(e) => {
                        const updated = [...taxRates]
                        updated[index].name = e.target.value
                        setTaxRates(updated)
                      }}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <div className="flex items-center gap-1">
                      <input type="number" value={tax.rate} 
                        onChange={(e) => {
                          const updated = [...taxRates]
                          updated[index].rate = parseFloat(e.target.value) || 0
                          setTaxRates(updated)
                        }}
                        className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm text-right" />
                      <FiPercent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={tax.default} 
                        onChange={(e) => {
                          const updated = taxRates.map((t, i) => ({ ...t, default: i === index ? e.target.checked : false }))
                          setTaxRates(updated)
                        }}
                        className="rounded border-border" />
                      <span className="text-xs text-muted-foreground">Default</span>
                    </label>
                    <button 
                      onClick={() => setTaxRates(taxRates.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-600">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Stock Alerts</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Low Stock Threshold</label>
                  <input type="number" value={settings.low_stock_threshold || 10} 
                    onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 10 })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" min={1} />
                  <p className="mt-1 text-xs text-muted-foreground">Alert when stock falls below this number</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Expiry Warning (Days)</label>
                  <input type="number" value={settings.expiry_warning_days || 30} 
                    onChange={(e) => setSettings({ ...settings, expiry_warning_days: parseInt(e.target.value) || 30 })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" min={1} />
                  <p className="mt-1 text-xs text-muted-foreground">Alert for products expiring within this period</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Default Values</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Default Markup (%)</label>
                  <input type="number" defaultValue={20} 
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Default Min Stock</label>
                  <input type="number" defaultValue={10} 
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Receipt Customization</h3>
              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Receipt Header</label>
                  <textarea value={settings.receipt_header || ''} 
                    onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono" 
                    rows={3} placeholder="Welcome to our store!" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Receipt Footer</label>
                  <textarea value={settings.receipt_footer || ''} 
                    onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono" 
                    rows={3} placeholder="Thank you for shopping with us! Returns within 7 days." />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Receipt Preview</h3>
              <div className="mx-auto max-w-xs rounded-lg border-2 border-dashed border-border bg-white p-6 font-mono text-xs text-gray-800">
                <div className="text-center border-b border-gray-300 pb-3 mb-3">
                  <h4 className="text-lg font-bold">{settings.store_name || 'PharmaPOS'}</h4>
                  {settings.store_address && <p>{settings.store_address}</p>}
                  {settings.store_phone && <p>Tel: {settings.store_phone}</p>}
                  {settings.receipt_header && <p className="mt-2">{settings.receipt_header}</p>}
                </div>
                <div className="space-y-1 text-gray-600">
                  <p>Receipt: RCP-XXXXXX</p>
                  <p>Date: {format(new Date(), 'PPpp')}</p>
                </div>
                <div className="border-t border-b border-dashed border-gray-300 py-3 my-3">
                  <div className="flex justify-between"><span>Sample Item</span><span>100.00</span></div>
                  <div className="flex justify-between"><span>Tax ({settings.tax_rate}%)</span><span>5.00</span></div>
                  <div className="flex justify-between font-bold mt-2"><span>Total</span><span>105.00</span></div>
                </div>
                {settings.receipt_footer && <p className="text-center text-gray-500">{settings.receipt_footer}</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Alert Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: 'lowStock', label: 'Low Stock Alerts', desc: 'Get notified when products are running low' },
                  { key: 'expiryAlert', label: 'Expiry Alerts', desc: 'Get notified about products nearing expiry' },
                  { key: 'dailyReport', label: 'Daily Sales Report', desc: 'Receive daily sales summary' },
                  { key: 'salesAlert', label: 'Large Sale Alerts', desc: 'Get notified for sales above PKR 10,000' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:border-primary/30">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" 
                        checked={notifications[item.key as keyof typeof notifications] as boolean}
                        onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                        className="sr-only peer" />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={notifications.emailNotifications}
                      onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {notifications.emailNotifications && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Notification Email</label>
                    <input type="email" value={notifications.email}
                      onChange={(e) => setNotifications({ ...notifications, email: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                      placeholder="admin@example.com" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Export Data</h3>
              <p className="text-sm text-muted-foreground mb-4">Download your data as JSON files for backup purposes.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { type: 'products', label: 'Products', icon: FiPackage },
                  { type: 'customers', label: 'Customers', icon: FiUsers },
                  { type: 'sales', label: 'Sales', icon: FiFileText },
                  { type: 'all', label: 'Full Backup', icon: FiDatabase },
                ].map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.type}
                      onClick={() => exportData(item.type)}
                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-all hover:border-primary hover:bg-primary/5"
                    >
                      <Icon className="h-8 w-8 text-primary" />
                      <span className="font-medium">{item.label}</span>
                      <FiDownload className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-6">
              <div className="flex items-start gap-3">
                <FiClock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-400">Automatic Backups</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                    Your data is automatically backed up to Supabase cloud storage. For additional security, 
                    we recommend downloading regular manual backups using the options above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

  {activeTab === 'billing' && (
   <div className="space-y-6 animate-fade-in">
   <div className="rounded-xl border border-border bg-card p-6">
   <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
   <FiCreditCard className="h-5 w-5 text-primary" />
   Subscription Plan
   </h3>
   <p className="text-sm text-muted-foreground mb-6">
   Contact our sales team to upgrade or change your subscription plan.
   </p>

   <div className="grid gap-4 sm:grid-cols-3">
   {[
   { id: 'starter', name: 'Starter', price: 5000, users: 5, features: ['Up to 5 users', 'Basic inventory', 'Sales reporting'] },
   { id: 'professional', name: 'Professional', price: 30000, users: 50, features: ['Up to 50 users', 'Advanced analytics', 'Batch tracking', 'Priority support'] },
   { id: 'enterprise', name: 'Enterprise', price: 70000, users: -1, features: ['Unlimited users', 'Custom integrations', 'Dedicated support', 'SLA guarantee'] },
   ].map((plan) => {
   const isCurrent = subscription.plan === plan.id
   return (
   <div
   key={plan.id}
   className={`relative rounded-xl border-2 p-5 transition-all ${
   isCurrent
   ? 'border-primary bg-primary/5'
   : 'border-border hover:border-primary/50'
   }`}
   >
   {isCurrent && (
   <div className="absolute -top-3 left-1/2 -translate-x-1/2">
   <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
   Current Plan
   </span>
   </div>
   )}
   <div className="text-center mb-4">
   <h4 className="font-semibold text-lg">{plan.name}</h4>
   <p className="text-3xl font-bold text-primary mt-2">
   {plan.price === 0 ? 'Free' : `PKR ${plan.price.toLocaleString()}`}
   </p>
   <p className="text-sm text-muted-foreground">per month</p>
   </div>
   <ul className="space-y-2 mb-4">
   {plan.features.map((feature, i) => (
   <li key={i} className="text-sm flex items-center gap-2">
   <FiCheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
   {feature}
   </li>
   ))}
   </ul>
   <button
   onClick={() => window.open('mailto:sales@pharmapos.com?subject=Plan Change Request', '_blank')}
   className={`w-full rounded-lg px-4 py-2 font-medium text-sm transition-all ${
   isCurrent
   ? 'bg-muted text-muted-foreground cursor-not-allowed'
   : 'bg-primary text-primary-foreground hover:bg-primary/90'
   }`}
   >
   {isCurrent ? 'Current Plan' : 'Contact Sales'}
   </button>
   </div>
   )
   })}
   </div>

   <div className="mt-6 p-4 rounded-lg bg-muted/50">
   <div className="flex flex-wrap items-center justify-between gap-4">
   <div>
   <p className="font-medium">Current Status</p>
   <p className="text-sm text-muted-foreground capitalize">
   {subscription.status}
   </p>
   </div>
   <div className="text-sm text-muted-foreground">
   To manage your subscription, contact our support team at <a href="mailto:support@pharmapos.com" className="text-primary hover:underline">support@pharmapos.com</a>
   </div>
   </div>
   </div>
   </div>

   <div className="rounded-xl border border-border bg-card p-6">
   <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
   <FiFileText className="h-5 w-5 text-primary" />
   Payment Details
   </h3>
   <div className="space-y-4">
     <div>
       <p className="text-sm text-muted-foreground">Bank Account Details</p>
       <p className="font-medium mt-1">HBL Bank</p>
       <p className="text-sm">Account: 1234-5678-9012</p>
       <p className="text-sm">Title: PharmaPOS Solutions</p>
       <p className="text-sm">IBAN: PK36HABB0000001234567890</p>
     </div>
     <div>
       <p className="text-sm text-muted-foreground">JazzCash / EasyPaisa</p>
       <p className="font-medium mt-1">JazzCash Account</p>
       <p className="text-sm">Account: 0300-1234567</p>
       <p className="text-sm">Title: PharmaPOS Solutions</p>
     </div>
     <div className="pt-4 border-t border-border">
       <p className="text-sm text-muted-foreground">Please send payment receipt to <a href="mailto:billing@pharmapos.com" className="text-primary hover:underline">billing@pharmapos.com</a> after payment</p>
     </div>
   </div>
   </div>
   </div>
   )}

 {activeTab === 'security' && (
 <div className="space-y-6 animate-fade-in">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Session Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Auto Logout</p>
                    <p className="text-sm text-muted-foreground">Automatically log out after inactivity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={security.autoLogout}
                      onChange={(e) => setSecurity({ ...security, autoLogout: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {security.autoLogout && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Session Timeout (minutes)</label>
                    <input type="number" value={security.sessionTimeout}
                      onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) || 30 })}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                      min={5} max={120} />
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Require Password for Returns</p>
                    <p className="text-sm text-muted-foreground">Ask for manager password when processing returns</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={security.requirePassword}
                      onChange={(e) => setSecurity({ ...security, requirePassword: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <button onClick={saveSettings} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 btn-hover">
            <FiSave className="h-4 w-4" /> {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <SettingsContent />
    </ErrorBoundary>
  )
}
