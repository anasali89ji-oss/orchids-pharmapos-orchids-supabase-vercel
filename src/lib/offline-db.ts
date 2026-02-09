import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { CartItem } from '@/types'

interface OfflineSale {
  id: string
  receipt_number: string
  customer_name: string
  items: CartItem[]
  subtotal: number
  tax: number
  discount: number
  grand_total: number
  payment_method: string
  payment_status: string
  amount_paid: number
  change_given: number
  created_at: string
  synced: number // 0 for false, 1 for true
}

interface OfflineHeldSale {
  id: string
  customer_name: string
  items: CartItem[]
  total: number
  note: string
  created_at: string
  synced: number // 0 for false, 1 for true
}

interface OfflineReturn {
  id: string
  return_number: string
  receipt_number: string
  customer_name: string
  items: CartItem[]
  refund_amount: number
  refund_method: string
  reason: string
  status: string
  created_at: string
  synced: number // 0 for false, 1 for true
}

interface OfflineProduct {
  id: string
  name: string
  brand: string
  generic_name: string
  barcode: string
  price: number
  cost: number
  stock: number
  min_stock: number
  expiry_date: string | null
  status: string
  cached_at: string
}

interface SyncQueueItem {
  id: string
  action_type: 'insert' | 'update' | 'delete'
  table_name: string
  data: Record<string, unknown>
  created_at: string
  retry_count: number
}

interface PharmaPOSDB extends DBSchema {
  sales: {
    key: string
    value: OfflineSale
    indexes: { 'by-synced': number; 'by-date': string }
  }
  held_sales: {
    key: string
    value: OfflineHeldSale
    indexes: { 'by-synced': number }
  }
  returns: {
    key: string
    value: OfflineReturn
    indexes: { 'by-synced': number; 'by-date': string }
  }
  products: {
    key: string
    value: OfflineProduct
    indexes: { 'by-name': string; 'by-barcode': string }
  }
  sync_queue: {
    key: string
    value: SyncQueueItem
    indexes: { 'by-table': string }
  }
  app_state: {
    key: string
    value: { key: string; value: unknown; updated_at: string }
  }
}

let db: IDBPDatabase<PharmaPOSDB> | null = null

export async function getDB(): Promise<IDBPDatabase<PharmaPOSDB>> {
  if (db) return db

  db = await openDB<PharmaPOSDB>('pharmapos-offline', 3, {
    upgrade(database, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        const salesStore = database.createObjectStore('sales', { keyPath: 'id' })
        salesStore.createIndex('by-synced', 'synced')
        salesStore.createIndex('by-date', 'created_at')

        const heldStore = database.createObjectStore('held_sales', { keyPath: 'id' })
        heldStore.createIndex('by-synced', 'synced')

        const returnsStore = database.createObjectStore('returns', { keyPath: 'id' })
        returnsStore.createIndex('by-synced', 'synced')
        returnsStore.createIndex('by-date', 'created_at')

        const productsStore = database.createObjectStore('products', { keyPath: 'id' })
        productsStore.createIndex('by-name', 'name')
        productsStore.createIndex('by-barcode', 'barcode')

        const syncStore = database.createObjectStore('sync_queue', { keyPath: 'id' })
        syncStore.createIndex('by-table', 'table_name')

        database.createObjectStore('app_state', { keyPath: 'key' })
      }

      if (oldVersion < 3) {
        // Migration logic for version 3 (boolean to number for synced)
        // Since we are changing types, we might need to recreate indexes or just clear data
        // For development simplicity, let's clear data if version is bumped
        if (oldVersion >= 1) {
          try {
            database.deleteObjectStore('sales')
            database.deleteObjectStore('held_sales')
            database.deleteObjectStore('returns')
            
            const salesStore = database.createObjectStore('sales', { keyPath: 'id' })
            salesStore.createIndex('by-synced', 'synced')
            salesStore.createIndex('by-date', 'created_at')

            const heldStore = database.createObjectStore('held_sales', { keyPath: 'id' })
            heldStore.createIndex('by-synced', 'synced')

            const returnsStore = database.createObjectStore('returns', { keyPath: 'id' })
            returnsStore.createIndex('by-synced', 'synced')
            returnsStore.createIndex('by-date', 'created_at')
          } catch (e) {
            console.error('Failed to migrate stores:', e)
          }
        }
      }
    }
  })

  return db
}

export async function saveOfflineSale(sale: OfflineSale): Promise<void> {
  const database = await getDB()
  await database.put('sales', { ...sale, synced: 0 })
  await addToSyncQueue('insert', 'sales', sale as unknown as Record<string, unknown>)
}

export async function getOfflineSales(): Promise<OfflineSale[]> {
  const database = await getDB()
  return database.getAll('sales')
}

export async function getUnsyncedSales(): Promise<OfflineSale[]> {
  const database = await getDB()
  const allSales = await database.getAll('sales')
  return allSales.filter(sale => !sale.synced)
}

export async function markSaleSynced(id: string): Promise<void> {
  const database = await getDB()
  const sale = await database.get('sales', id)
  if (sale) {
    await database.put('sales', { ...sale, synced: 1 })
  }
}

export async function saveOfflineHeldSale(held: OfflineHeldSale): Promise<void> {
  const database = await getDB()
  await database.put('held_sales', { ...held, synced: 0 })
  await addToSyncQueue('insert', 'held_sales', held as unknown as Record<string, unknown>)
}

export async function getOfflineHeldSales(): Promise<OfflineHeldSale[]> {
  const database = await getDB()
  return database.getAll('held_sales')
}

export async function deleteOfflineHeldSale(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('held_sales', id)
}

export async function saveOfflineReturn(returnData: OfflineReturn): Promise<void> {
  const database = await getDB()
  await database.put('returns', { ...returnData, synced: 0 })
  await addToSyncQueue('insert', 'returns', returnData as unknown as Record<string, unknown>)
}

export async function getOfflineReturns(): Promise<OfflineReturn[]> {
  const database = await getDB()
  return database.getAll('returns')
}

export async function cacheProducts(products: OfflineProduct[]): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('products', 'readwrite')
  const now = new Date().toISOString()
  
  await Promise.all([
    ...products.map(p => tx.store.put({ ...p, cached_at: now })),
    tx.done
  ])
  
  await setAppState('products_cached_at', now)
}

export async function getCachedProducts(): Promise<OfflineProduct[]> {
  const database = await getDB()
  return database.getAll('products')
}

export async function updateCachedProductStock(productId: string, newStock: number): Promise<void> {
  const database = await getDB()
  const product = await database.get('products', productId)
  if (product) {
    await database.put('products', { ...product, stock: newStock })
  }
}

export async function addToSyncQueue(
  action: 'insert' | 'update' | 'delete',
  table: string,
  data: Record<string, unknown>
): Promise<void> {
  const database = await getDB()
  await database.put('sync_queue', {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action_type: action,
    table_name: table,
    data,
    created_at: new Date().toISOString(),
    retry_count: 0
  })
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = await getDB()
  return database.getAll('sync_queue')
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('sync_queue', id)
}

export async function updateSyncQueueRetry(id: string): Promise<void> {
  const database = await getDB()
  const item = await database.get('sync_queue', id)
  if (item) {
    await database.put('sync_queue', { ...item, retry_count: item.retry_count + 1 })
  }
}

export async function setAppState(key: string, value: unknown): Promise<void> {
  const database = await getDB()
  await database.put('app_state', { key, value, updated_at: new Date().toISOString() })
}

export async function getAppState<T>(key: string): Promise<T | undefined> {
  const database = await getDB()
  const state = await database.get('app_state', key)
  return state?.value as T | undefined
}

export async function clearAllOfflineData(): Promise<void> {
  const database = await getDB()
  await Promise.all([
    database.clear('sales'),
    database.clear('held_sales'),
    database.clear('returns'),
    database.clear('products'),
    database.clear('sync_queue'),
    database.clear('app_state')
  ])
}

export function generateOfflineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
