/**
 * Supabase Error Handling
 * Production-safe error handling for Supabase operations
 */

import 'server-only'
import { logger } from '@/lib/logger'

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

export function parseSupabaseError(error: unknown): {
  code: SupabaseErrorCode
  message: string
  isRetryable: boolean
} {
  if (!error || typeof error !== 'object') {
    return { code: SupabaseErrorCode.UNKNOWN, message: 'Unknown error occurred', isRetryable: false }
  }

  const err = error as { code?: string; message?: string; details?: string; hint?: string }

  const codeMap: Record<string, SupabaseErrorCode> = {
    PGRST000: SupabaseErrorCode.CONNECTION_FAILED,
    PGRST104: SupabaseErrorCode.TIMEOUT,
    PGRST116: SupabaseErrorCode.UNAUTHORIZED,
    PGRST115: SupabaseErrorCode.ROW_LEVEL_SECURITY,
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

/** Converts any unknown error to a plain Error object the logger accepts */
function toError(err: unknown): Error {
  if (err instanceof Error) return err
  return new Error(typeof err === 'object' ? JSON.stringify(err) : String(err))
}

export function handleSupabaseError(
  error: unknown,
  context: Record<string, unknown> = {}
): never {
  const { code, message, isRetryable } = parseSupabaseError(error)

  logger.error('Supabase operation failed', toError(error), {
    ...context,
    error_code: code,
    is_retryable: isRetryable,
  })

  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error)
  }

  throw new Error(message)
}

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
        logger.debug('Supabase operation failed (silent)', context)
      } else {
        handleSupabaseError(error, context)
      }
      throw new Error(errorMessage)
    }

    if (!data) {
      if (!silent) logger.warn('Supabase query returned no data', { ...context })
      throw new Error('No data returned from database')
    }

    return data
  } catch (error) {
    if (error instanceof Error && error.message === errorMessage) throw error
    if (!silent) handleSupabaseError(error, context)
    throw new Error(errorMessage)
  }
}

export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options: { maxRetries?: number; delay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000 } = options
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await queryFn()

      if (error) {
        const { isRetryable } = parseSupabaseError(error)
        if (!isRetryable) throw error

        lastError = error
        if (i < maxRetries - 1) {
          logger.warn(`Supabase query failed, retrying (${i + 1}/${maxRetries})`, { reason: toError(error).message })
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
          continue
        }
      }

      if (data) return data
      lastError = new Error('No data returned')
    } catch (err) {
      lastError = err
      const { isRetryable } = parseSupabaseError(err)

      if (!isRetryable || i === maxRetries - 1) throw err

      logger.warn(`Supabase query failed, retrying (${i + 1}/${maxRetries})`, { reason: toError(err).message })
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }

  handleSupabaseError(lastError)
  throw lastError
}
