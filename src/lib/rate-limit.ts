/**
 * Rate Limiting Middleware
 * Prevents abuse and protects against DDoS attacks
 *
 * ⚠️ WARNING: This rate limiter uses in-memory Map storage.
 * In Vercel's serverless environment, each cold start resets this Map.
 * For production rate limiting, integrate Upstash Redis or similar.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitStore>()

interface RateLimitOptions {
  interval?: number   // Time window in ms (default: 60000 = 1 minute)
  maxRequests?: number // Max requests per interval (default: 100)
}

export function getClientIdentifier(request: NextRequest): string {
  const userId = request.headers.get('x-user-id')
  if (userId) return `user:${userId}`

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  return `ip:${ip}`
}

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<{
  success: boolean
  response?: NextResponse
  headers: Record<string, string>
}> {
  const { interval = 60000, maxRequests = 100 } = options

  const identifier = getClientIdentifier(request)
  const now = Date.now()

  // Clean up old entries periodically
  if (store.size > 10000) {
    const cutoff = now - interval
    for (const [key, value] of store.entries()) {
      if (value.resetAt < cutoff) store.delete(key)
    }
  }

  let entry = store.get(identifier)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + interval }
    store.set(identifier, entry)
  }

  // Build headers as a mutable record so 'Retry-After' key is always valid
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count).toString(),
    'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
  }

  if (entry.count >= maxRequests) {
    headers['Retry-After'] = Math.ceil((entry.resetAt - now) / 1000).toString()

    return {
      success: false,
      response: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
          ),
        }
      ),
      headers,
    }
  }

  entry.count++

  return { success: true, headers }
}
