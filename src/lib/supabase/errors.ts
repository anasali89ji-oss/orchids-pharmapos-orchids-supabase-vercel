/**
 * Supabase Error Handling
 * Production-safe error handling for Supabase operations
 */

import 'server-only'
import { logger } from '@/lib/logger'

/**
 * Supabase error types
 */
export enum SupabaseErrorCode {
  CONNECTION_FAILED = 'PGRST000',
  TIMEOUT = 'PGRST104',
  ROW_LEVEL_SECURITY = 'PGRST116',
  UNAUTHORIZED = 'PGRST115',
  NOT_FOUND = 'PGRST116',
  DUPLICATE = '23505',
  FOREIGN_KEY = '23503',
  CHECK_CONSTRAINT = '23514',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Parse Supabase error code from error object
 */
export function parseSupabaseError(error: unknown): {
  code: SupabaseErrorCode
  message: string
  isRetryable: boolean
} {
  if (!error || typeof error !== 'object') {
    return {
      code: SupabaseErrorCode.UNKNOWN,
      message: 'Unknown error occurred',
      isRetryable: false,
    }
  }

  const err = error as {
    code?: string
    message?: string
    details?: string
    hint?: string
  }

  // Map known error codes
  const codeMap: Record<string, SupabaseErrorCode> = {
    'PGRST000': SupabaseErrorCode.CONNECTION_FAILED,
    'PGRST104': SupabaseErrorCode.TIMEOUT,
    'PGRST116': SupabaseErrorCode.UNAUTHORIZED,
    'PGRST115': SupabaseErrorCode.ROW_LEVEL_SECURITY,
    '23505': SupabaseErrorCode.DUPLICATE,
    '23503': SupabaseErrorCode.FOREIGN_KEY,
    '23514': SupabaseErrorCode.CHECK_CONSTRAINT,
  }

  const code = err.code ? (codeMap[err.code] ?? SupabaseErrorCode.UNKNOWN) : SupabaseErrorCode.UNKNOWN
  
  return {
    code,
    message: err.message || err.details || err.hint || 'Database operation failed',
    isRetryable: [SupabaseErrorCode.CONNECTION_FAILED, SupabaseErrorCode.TIMEOUT].includes(code),
  }
}

/**
 * Handle Supabase errors with logging
 */
export function handleSupabaseError(
  error: unknown,
  context: Record<string, unknown> = {}
): never {
  const { code, message, isRetryable } = parseSupabaseError(error)

  logger.error('Supabase operation failed', error as Error, {
    ...context,
    error_code: code,
    is_retryable: isRetryable,
  })

  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error)
  }

  throw new Error(message)
}

/**
 * Safe Supabase query wrapper
 * Handles errors and provides typed responses
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options: {
    context?: Record<string, unknown>
    errorMessage?: string
    silent?: boolean
  } = {}
): Promise<T> {
  const { context, errorMessage = 'Database operation failed', silent = false } = options

  try {
    const { data, error } = await queryFn()

    if (error) {
      if (silent) {
        logger.debug('Supabase operation failed (silent)', error as Error, context)
      } else {
        handleSupabaseError(error, context)
      }
      throw new Error(errorMessage)
    }

    if (!data) {
      const notFoundError = new Error('No data returned from database')
      if (!silent) {
        logger.warn('Supabase query returned no data', { ...context })
      }
      throw notFoundError
    }

    return data
  } catch (error) {
    // If it's already a handled error, rethrow
    if (error instanceof Error && error.message === errorMessage) {
      throw error
    }
    
    if (!silent) {
      handleSupabaseError(error, context)
    }
    throw new Error(errorMessage)
  }
}

/**
 * Retry wrapper for failed queries
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options: {
    maxRetries?: number
    delay?: number
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000 } = options
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await queryFn()

      if (error) {
        const { isRetryable } = parseSupabaseError(error)
        
        if (!isRetryable) {
          throw error
        }

        lastError = error
        
        if (i < maxRetries - 1) {
          logger.warn(`Supabase query failed, retrying (${i + 1}/${maxRetries})`, error as Error)
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
          continue
        }
      }

      if (data) {
        return data
      }

      lastError = new Error('No data returned')
    } catch (error) {
      lastError = error
      const { isRetryable } = parseSupabaseError(error)
      
      if (!isRetryable || i === maxRetries - 1) {
        throw error
      }

      logger.warn(`Supabase query failed, retrying (${i + 1}/${maxRetries})`, error as Error)
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }

  handleSupabaseError(lastError)
  throw lastError // Type assertion to satisfy TypeScript
}
