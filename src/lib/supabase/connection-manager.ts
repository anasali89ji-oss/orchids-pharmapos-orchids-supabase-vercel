import { SupabaseClient } from '@supabase/supabase-js'

export interface RetryOptions {
  maxRetries?: number
  delayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    onRetry
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) {
        throw lastError
      }

      if (onRetry) {
        onRetry(attempt, lastError)
      }

      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }

  throw lastError
}

export function createSupabaseRetryWrapper(supabase: SupabaseClient) {
  return {
    from: (table: string) => {
      const originalQuery = supabase.from(table)

      return {
        select: (columns?: string) => createRetryQuery(originalQuery.select(columns)),
        insert: (data: any) => createRetryMutation(originalQuery.insert(data)),
        update: (data: any) => createRetryMutation(originalQuery.update(data)),
        delete: () => createRetryMutation(originalQuery.delete()),
      }
    }
  }
}

type RetryQuery = ReturnType<SupabaseClient['from']>['select extends Record<string, unknown>>
type RetryMutation = ReturnType<SupabaseClient['from']>['insert']

function createRetryQuery(query: any) {
  const retryableExecute = async () => {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await query
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    
    throw lastError
  }

  return {
    ...query,
    then: <T>(onFulfilled?: (value: T) => T | PromiseLike<T>, onRejected?: (reason: any) => T | PromiseLike<T>) => {
      return retryableExecute().then(onFulfilled, onRejected)
    },
    single: () => withRetry(() => query.single()),
    maybeSingle: () => withRetry(() => query.maybeSingle()),
  }
}

function createRetryMutation(mutation: any) {
  const retryableExecute = async () => {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await mutation
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < 3) {
          const delay = 1000 * attempt
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError
  }

  return {
    ...mutation,
    then: <T>(onFulfilled?: (value: T) => T | PromiseLike<T>, onRejected?: (reason: any) => T | PromiseLike<T>) => {
      return retryableExecute().then(onFulfilled, onRejected)
    },
    select: (columns?: string) => createRetryMutation(mutation.select(columns)),
    eq: (column: string, value: any) => createRetryMutation(mutation.eq(column, value)),
    single: () => withRetry(() => mutation.single()),
    maybeSingle: () => withRetry(() => mutation.maybeSingle()),
  }
}

export function handleSupabaseError(error: any): string {
  if (!error) return 'An unknown error occurred'

  if (error.code === 'PGRST116') {
    return 'Resource not found'
  }

  if (error.code === '23505') {
    return 'A record with this information already exists'
  }

  if (error.code === 'PGRST301') {
    return 'Authentication required'
  }

  if (error.code === 'PGRST302') {
    return 'Access denied'
  }

  if (error.message) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

export async function safeQuery<T>(
  operation: () => Promise<T>,
  fallback: T,
  onError?: (error: Error) => void
): Promise<T> {
  try {
    return await withRetry(operation, { maxRetries: 3, delayMs: 1000 })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    if (onError) onError(err)
    console.error('Safe query failed:', err)
    return fallback
  }
}

export class ConnectionManager {
  private static instance: ConnectionManager
  private lastActivity: number = Date.now()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isOnline: boolean = true

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupListeners()
      this.startHeartbeat()
    }
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager()
    }
    return ConnectionManager.instance
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      document.dispatchEvent(new CustomEvent('connection-restored'))
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(event => {
      window.addEventListener(event, () => this.updateActivity(), { passive: true })
    })
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity
      
      if (inactiveTime > 5 * 60 * 1000) {
        document.dispatchEvent(new CustomEvent('proactive-refresh-needed'))
      }
    }, 60000)
  }

  private updateActivity() {
    this.lastActivity = Date.now()
  }

  getConnectionInfo() {
    return {
      isOnline: this.isOnline,
      lastActivity: this.lastActivity,
      inactiveTime: Date.now() - this.lastActivity
    }
  }

  async refreshConnection(): Promise<void> {
    this.lastActivity = Date.now()
  }

  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }
}

export const connectionManager = ConnectionManager.getInstance()
