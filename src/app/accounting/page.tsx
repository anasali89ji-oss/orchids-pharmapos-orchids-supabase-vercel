'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { LedgerEntry, Credit } from '@/types'
import { 
  FiDollarSign, FiTrendingUp, FiClock, FiDownload, FiPlus, FiMinus,
  FiBook, FiCreditCard, FiSettings, FiSearch, FiCalendar
} from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'

type TabType = 'dashboard' | 'ledger' | 'credits' | 'settings'

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [transactionModal, setTransactionModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)
  const [transactionType, setTransactionType] = useState<'Income' | 'Expense'>('Income')
  const [transactionForm, setTransactionForm] = useState({ description: '', amount: 0 })
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [openingBalance, setOpeningBalance] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [ledgerRes, creditsRes, settingsRes] = await Promise.all([
      supabase.from('ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('credits').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('opening_balance').limit(1).single()
    ])
    
    setLedger(ledgerRes.data || [])
    setCredits(creditsRes.data || [])
    setOpeningBalance(settingsRes.data?.opening_balance || 0)
    setLoading(false)
  }

  const cashOnHand = ledger.length > 0 ? Number(ledger[0].balance) : openingBalance
  const totalSales = ledger.filter(e => e.transaction_type === 'Sale').reduce((sum, e) => sum + Number(e.credit), 0)
  const pendingCredits = credits.filter(c => c.status !== 'Paid').reduce((sum, c) => sum + Number(c.remaining_amount), 0)
  const totalExpenses = ledger.filter(e => e.transaction_type === 'Expense' || e.transaction_type === 'Purchase').reduce((sum, e) => sum + Number(e.debit), 0)
  const netProfit = totalSales - totalExpenses

  const filteredCredits = credits.filter(c => 
    c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addTransaction = async () => {
    if (!transactionForm.description || transactionForm.amount <= 0) {
      toast.error('Please fill in all fields')
      return
    }

    const lastBalance = ledger.length > 0 ? Number(ledger[0].balance) : openingBalance
    const newBalance = transactionType === 'Income' 
      ? lastBalance + transactionForm.amount 
      : lastBalance - transactionForm.amount

    const { error } = await supabase.from('ledger').insert({
      description: transactionForm.description,
      credit: transactionType === 'Income' ? transactionForm.amount : 0,
      debit: transactionType === 'Expense' ? transactionForm.amount : 0,
      balance: newBalance,
      transaction_type: transactionType
    })

    if (error) {
      toast.error('Failed to add transaction')
      return
    }

    toast.success('Transaction added')
    setTransactionModal(false)
    setTransactionForm({ description: '', amount: 0 })
    fetchData()
  }

  const processPayment = async () => {
    if (!selectedCredit || paymentAmount <= 0) return
    
    const newPaid = Number(selectedCredit.paid_amount) + paymentAmount
    const newRemaining = Number(selectedCredit.total_amount) - newPaid
    const newStatus = newRemaining <= 0 ? 'Paid' : 'Partial'

    const { error } = await supabase
      .from('credits')
      .update({ paid_amount: newPaid, remaining_amount: Math.max(0, newRemaining), status: newStatus })
      .eq('id', selectedCredit.id)

    if (error) {
      toast.error('Failed to process payment')
      return
    }

    const lastBalance = ledger.length > 0 ? Number(ledger[0].balance) : openingBalance
    await supabase.from('ledger').insert({
      description: `Credit Payment - ${selectedCredit.customer_name}`,
      ref_id: selectedCredit.receipt_number,
      credit: paymentAmount,
      debit: 0,
      balance: lastBalance + paymentAmount,
      transaction_type: 'Payment',
      customer_name: selectedCredit.customer_name
    })

    toast.success('Payment processed')
    setPaymentModal(false)
    setSelectedCredit(null)
    setPaymentAmount(0)
    fetchData()
  }

  const updateOpeningBalance = async () => {
    const { data: existing } = await supabase.from('settings').select('id').limit(1).single()
    
    if (existing) {
      await supabase.from('settings').update({ opening_balance: openingBalance }).eq('id', existing.id)
    } else {
      await supabase.from('settings').insert({ opening_balance: openingBalance })
    }

    const lastBalance = ledger.length > 0 ? Number(ledger[0].balance) : 0
    await supabase.from('ledger').insert({
      description: 'Opening Balance Adjustment',
      credit: openingBalance,
      debit: 0,
      balance: lastBalance + openingBalance,
      transaction_type: 'Adjustment'
    })

    toast.success('Opening balance updated')
    fetchData()
  }

  const exportLedger = () => {
    const headers = ['Date', 'Description', 'Ref ID', 'Credit', 'Debit', 'Balance', 'Type']
    const rows = ledger.map(e => 
      [format(new Date(e.created_at), 'yyyy-MM-dd'), e.description, e.ref_id || '', e.credit, e.debit, e.balance, e.transaction_type].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    toast.success('Ledger exported')
  }

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: FiTrendingUp },
    { id: 'ledger', label: 'General Ledger', icon: FiBook },
    { id: 'credits', label: 'Credit Mgmt', icon: FiCreditCard },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ]

  return (
    <DashboardLayout title="Financial Accounting" subtitle="Manage ledger, income, expenses, and credits">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { setTransactionType('Income'); setTransactionModal(true) }}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <FiPlus className="h-4 w-4" />
                Add Income
              </button>
              <button
                onClick={() => { setTransactionType('Expense'); setTransactionModal(true) }}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                <FiMinus className="h-4 w-4" />
                Add Expense
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="stat-card stat-sales rounded-xl bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/50">
                    <FiDollarSign className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cash on Hand</p>
                    <p className="text-xl font-bold text-foreground">PKR {cashOnHand.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card stat-profit rounded-xl bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950/50">
                    <FiTrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cash Sales</p>
                    <p className="text-xl font-bold text-foreground">PKR {totalSales.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card stat-alerts rounded-xl bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50">
                    <FiClock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Credits</p>
                    <p className="text-xl font-bold text-foreground">PKR {pendingCredits.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-card p-5 shadow-sm border-l-4 border-purple-500">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/50">
                    <FiDollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Net Profit</p>
                    <p className="text-xl font-bold text-foreground">PKR {netProfit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Description</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Type</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledger.slice(0, 5).map(entry => (
                      <tr key={entry.id} className="table-row-hover">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{entry.description}</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {entry.transaction_type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${Number(entry.credit) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          PKR {(Number(entry.credit) || Number(entry.debit)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No transactions yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'ledger' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">General Ledger</h3>
              <button
                onClick={exportLedger}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                <FiDownload className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Ref ID</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Description</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Type</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Credit</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Debit</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledger.map(entry => (
                      <tr key={entry.id} className="table-row-hover">
                        <td className="py-3 px-4">
                          <span className="rounded bg-muted px-2 py-1 font-mono text-xs">{entry.ref_id || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          <FiCalendar className="mr-1 inline h-3 w-3" />
                          {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{entry.description}</td>
                        <td className="py-3 px-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            entry.transaction_type === 'Sale' ? 'bg-green-100 text-green-700' :
                            entry.transaction_type === 'Expense' || entry.transaction_type === 'Purchase' ? 'bg-red-100 text-red-700' :
                            entry.transaction_type === 'Payment' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {entry.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {Number(entry.credit) > 0 
                            ? <span className="text-green-600 font-medium">+{Number(entry.credit).toLocaleString()}</span>
                            : <span className="text-muted-foreground">-</span>
                          }
                        </td>
                        <td className="py-3 px-4 text-right">
                          {Number(entry.debit) > 0 
                            ? <span className="text-red-600 font-medium">-{Number(entry.debit).toLocaleString()}</span>
                            : <span className="text-muted-foreground">-</span>
                          }
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">PKR {Number(entry.balance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'credits' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Credit / Pay Later</h3>
              <div className="relative w-64">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm"
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Sale ID</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Total</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Paid</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Remaining</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">Status</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCredits.map(credit => (
                      <tr key={credit.id} className="table-row-hover">
                        <td className="py-3 px-4 font-mono text-sm">{credit.receipt_number}</td>
                        <td className="py-3 px-4 font-medium text-foreground">{credit.customer_name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {format(new Date(credit.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">PKR {Number(credit.total_amount).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-600">PKR {Number(credit.paid_amount).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-red-600">PKR {Number(credit.remaining_amount).toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            credit.status === 'Paid' ? 'bg-green-100 text-green-700' :
                            credit.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {credit.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {credit.status !== 'Paid' && (
                            <button
                              onClick={() => { setSelectedCredit(credit); setPaymentModal(true) }}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                              Receive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredCredits.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No credit records</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Accounting Setup</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Initial Cash Drawer Balance</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={updateOpeningBalance}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Update Balance
                </button>
                <p className="text-xs text-muted-foreground">
                  * This will create an adjustment entry in the ledger.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <Dialog open={transactionModal} onOpenChange={setTransactionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {transactionType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <input
                type="text"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                placeholder="e.g., Electricity Bill"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Amount (PKR)</label>
              <input
                type="number"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <button
            onClick={addTransaction}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save Transaction
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">Customer: {selectedCredit.customer_name}</p>
                <p className="text-sm text-red-600">Remaining: PKR {Number(selectedCredit.remaining_amount).toLocaleString()}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Amount Received (PKR)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                  max={Number(selectedCredit.remaining_amount)}
                />
              </div>
            </div>
          )}
          <button
            onClick={processPayment}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            Confirm Payment
          </button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
