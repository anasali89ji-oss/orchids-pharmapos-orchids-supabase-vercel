'use client'

import { createClient } from '@/lib/supabase/client'
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueRetry,
  markSaleSynced,
  getUnsyncedSales,
  cacheProducts,
  setAppState,
  getAppState
} from './offline-db'
import { toast } from 'sonner'

const MAX_RETRIES = 3
let isSyncing = false
let syncInterval: ReturnType<typeof setInterval> | null = null

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export async function syncOfflineData(): Promise<{ success: number; failed: number }> {
  if (isSyncing || !isOnline()) {
    return { success: 0, failed: 0 }
  }

  isSyncing = true
  const supabase = createClient()
  let successCount = 0
  let failedCount = 0

  try {
    const queue = await getSyncQueue()
    
    for (const item of queue) {
      if (item.retry_count >= MAX_RETRIES) {
        console.warn(`Skipping item ${item.id} after ${MAX_RETRIES} retries`)
        failedCount++
        continue
      }

      try {
        const { id: _id, synced: _synced, ...cleanData } = item.data as Record<string, unknown>
        
        switch (item.action_type) {
          case 'insert':
            const { error: insertError } = await supabase
              .from(item.table_name)
              .insert(cleanData)
            
            if (insertError) throw insertError
            break
            
          case 'update':
            const { error: updateError } = await supabase
              .from(item.table_name)
              .update(cleanData)
              .eq('id', item.data.id)
            
            if (updateError) throw updateError
            break
            
          case 'delete':
            const { error: deleteError } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.data.id)
            
            if (deleteError) throw deleteError
            break
        }

        await removeSyncQueueItem(item.id)
        
        if (item.table_name === 'sales' && item.data.id) {
          await markSaleSynced(item.data.id as string)
        }
        
        successCount++
      } catch (error) {
        console.error(`Sync failed for item ${item.id}:`, error)
        await updateSyncQueueRetry(item.id)
        failedCount++
      }
    }

    const unsyncedSales = await getUnsyncedSales()
    for (const sale of unsyncedSales) {
      try {
        const { synced: _synced, ...saleData } = sale
        const { error } = await supabase.from('sales').insert(saleData)
        
        if (!error) {
          await markSaleSynced(sale.id)
          successCount++
        }
      } catch (error) {
        console.error('Failed to sync sale:', error)
        failedCount++
      }
    }

  } catch (error) {
    console.error('Sync process error:', error)
  } finally {
    isSyncing = false
  }

  return { success: successCount, failed: failedCount }
}

export async function refreshProductCache(supabaseClient?: ReturnType<typeof createClient>): Promise<void> {
  if (!isOnline()) return
  const supabase = supabaseClient || createClient()

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, brand, generic_name, barcode, price, cost, stock, min_stock, expiry_date, status')
      .eq('status', 'active')
      .gt('stock', 0)
      .order('name')

    if (error) {
      if (error.code === 'PGRST116' || error.code === '401') return
      throw error
    }

    if (products && products.length > 0) {
      await cacheProducts(products.map(p => ({
        ...p,
        generic_name: p.generic_name || '',
        barcode: p.barcode || '',
        cached_at: new Date().toISOString()
      })))
    }
  } catch (error: any) {
    console.error('Product cache refresh failed:', error)
    scheduleCacheRetry()
  }
}

let retryTimeout: ReturnType<typeof setTimeout> | null = null
let retryCount = 0
const MAX_RETRY_COUNT = 5

function scheduleCacheRetry() {
  if (retryTimeout) clearTimeout(retryTimeout)
  if (retryCount >= MAX_RETRY_COUNT) {
    console.error('Max cache retry attempts reached')
    retryCount = 0
    return
  }
  const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
  retryCount++
  retryTimeout = setTimeout(() => {
    refreshProductCache().finally(() => { retryCount = 0 })
  }, delay)
}

export function startAutoSync(intervalMs: number = 30000): void {
  if (syncInterval) return

  syncInterval = setInterval(async () => {
    if (isOnline()) {
      const result = await syncOfflineData()
      if (result.success > 0) {
        toast.success(`Synced ${result.success} offline transactions`)
      }
    }
  }, intervalMs)

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

async function handleOnline(): Promise<void> {
  toast.success('Back online! Syncing data...')
  await setAppState('last_online', new Date().toISOString())
  
  const result = await syncOfflineData()
  await refreshProductCache()
  
  if (result.success > 0) {
    toast.success(`Successfully synced ${result.success} offline transactions`)
  }
}

function handleOffline(): void {
  toast.warning('You are offline. Changes will be saved locally.')
}

export async function getLastSyncTime(): Promise<string | undefined> {
  return getAppState<string>('last_sync')
}

export async function getPendingSyncCount(): Promise<number> {
  const queue = await getSyncQueue()
  const unsyncedSales = await getUnsyncedSales()
  return queue.length + unsyncedSales.length
}
