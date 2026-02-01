import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeDataOptions<T> {
  table: string
  select?: string
  filter?: { column: string; value: string | number }
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
  enabled?: boolean
  refreshInterval?: number
  onDataChange?: (data: T[]) => void
}

export function useRealtimeData<T>({
  table,
  select = '*',
  filter,
  orderBy,
  limit,
  enabled = true,
  refreshInterval,
  onDataChange
}: UseRealtimeDataOptions<T>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!enabled) return

    try {
      let query = supabase.from(table).select(select)

      if (filter) {
        query = query.eq(filter.column, filter.value)
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false })
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data: result, error: fetchError } = await query

      if (fetchError) throw fetchError

      setData(result || [])
      setError(null)
      onDataChange?.(result || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setLoading(false)
    }
  }, [table, select, filter, orderBy, limit, enabled, supabase, onDataChange])

  useEffect(() => {
    fetchData()

    if (enabled) {
      channelRef.current = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            fetchData()
          }
        )
        .subscribe()
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [table, enabled, fetchData, supabase])

  useEffect(() => {
    if (!refreshInterval || !enabled) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, enabled, fetchData])

  const refetch = useCallback(() => {
    setLoading(true)
    return fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

export function useAutoRefresh(callback: () => void, interval: number = 30000, enabled: boolean = true) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const tick = () => savedCallback.current()
    const id = setInterval(tick, interval)

    return () => clearInterval(id)
  }, [interval, enabled])
}

export function useDashboardStats() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    totalProducts: 0,
    lowStockCount: 0,
    expiringCount: 0,
    pendingCredits: 0,
    cashOnHand: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    totalSuppliers: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    const today = new Date()
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      todaySalesRes,
      monthSalesRes,
      productsRes,
      lowStockRes,
      expiringRes,
      creditsRes,
      ledgerRes,
      customersRes,
      suppliersRes
    ] = await Promise.all([
      supabase.from('sales').select('grand_total, items').gte('created_at', todayStart),
      supabase.from('sales').select('grand_total').gte('created_at', monthStart),
      supabase.from('products').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('products').select('id', { count: 'exact' }).lt('stock', 10).gt('stock', 0).eq('status', 'active'),
      supabase.from('products').select('id', { count: 'exact' }).lte('expiry_date', thirtyDaysFromNow).gte('expiry_date', new Date().toISOString().split('T')[0]),
      supabase.from('credits').select('remaining_amount').neq('status', 'Paid'),
      supabase.from('ledger').select('balance').order('created_at', { ascending: false }).limit(1),
      supabase.from('customers').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('suppliers').select('id', { count: 'exact' }).eq('status', 'active')
    ])

    const todaySalesData = todaySalesRes.data || []
    const todaySales = todaySalesData.reduce((sum, s) => sum + Number(s.grand_total), 0)
    const todayProfit = todaySalesData.reduce((sum, s) => {
      const items = s.items as { price: number; cost: number; quantity: number }[]
      return sum + items.reduce((iSum, item) => iSum + (item.price - item.cost) * item.quantity, 0)
    }, 0)

    const monthlyRevenue = (monthSalesRes.data || []).reduce((sum, s) => sum + Number(s.grand_total), 0)
    const pendingCredits = (creditsRes.data || []).reduce((sum, c) => sum + Number(c.remaining_amount), 0)
    const cashOnHand = Number(ledgerRes.data?.[0]?.balance || 0)

    setStats({
      todaySales,
      todayProfit,
      totalProducts: productsRes.count || 0,
      lowStockCount: lowStockRes.count || 0,
      expiringCount: expiringRes.count || 0,
      pendingCredits,
      cashOnHand,
      monthlyRevenue,
      totalCustomers: customersRes.count || 0,
      totalSuppliers: suppliersRes.count || 0
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useAutoRefresh(fetchStats, 30000)

  return { stats, loading, refetch: fetchStats }
}

export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; count: number }>,
  pageSize: number = 20
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchData = useCallback(async (pageNum: number) => {
    setLoading(true)
    try {
      const result = await fetchFn(pageNum, pageSize)
      setData(result.data)
      setTotalCount(result.count)
      setTotalPages(Math.ceil(result.count / pageSize))
    } catch (error) {
      console.error('Pagination fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, pageSize])

  useEffect(() => {
    fetchData(page)
  }, [page, fetchData])

  const nextPage = () => setPage(p => Math.min(p + 1, totalPages))
  const prevPage = () => setPage(p => Math.max(p - 1, 1))
  const goToPage = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages))

  return {
    data,
    loading,
    page,
    totalPages,
    totalCount,
    pageSize,
    nextPage,
    prevPage,
    goToPage,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    refetch: () => fetchData(page)
  }
}

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
