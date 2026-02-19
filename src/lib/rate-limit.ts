/**
 * Rate Limiting Middleware
 * Prevents abuse and protects against DDoS attacks
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitStore>()

interface RateLimitOptions {
  interval?: number // Time window in ms (default: 60000 = 1 minute)
  maxRequests?: number // Max requests per interval (default: 100)
}

export function getClientIdentifier(request: NextRequest): string {
  // Prefer authenticated user ID, fall back to IP
  const userId = request.headers.get('x-user-id')
  if (userId) return `user:${userId}`

  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown'
  return `ip:${ip}`
}

/**
 * Rate limit middleware for API routes
 * @param request NextRequest
 * @param options RateLimitOptions
 * @returns NextResponse with rate limit headers or error if limit exceeded
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<{
  success: boolean
  response?: NextResponse
  headers: Record<string, string>
}> {
  const {
    interval = 60000, // 1 minute
    maxRequests = 100,
  } = options

  const identifier = getClientIdentifier(request)
  const now = Date.now()

  // Clean up old entries periodically
  if (store.size > 10000) {
    const cutoff = now - interval
    for (const [key, value] of store.entries()) {
      if (value.resetAt < cutoff) {
        store.delete(key)
      }
    }
  }

  // Get or create rate limit entry
  let entry = store.get(identifier)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + interval }
    store.set(identifier, entry)
  }

  // Check if limit exceeded
  const headers = {
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
          )
        }
      ),
      headers,
    }
  }

  // Increment counter
  entry.count++

  return {
    success: true,
    headers,
  }
}

/**
 * Rate limit for specific sensitive routes (e.g., auth, payments)
 * Stricter limits for security-sensitive operations
 */
export const rateLimits = {
  // Authentication routes
  auth: () => rateLimit.bind(null, { interval: 900000, maxRequests: 5 }), // 15 min, 5 requests
  
  // Payment/billing routes
  billing: () => rateLimit.bind(null, { interval: 3600000, maxRequests: 10 }), // 1 hour, 10 requests
  
  // CRUD operations
  crud: () => rateLimit.bind(null, { interval: 60000, maxRequests: 100 }), // 1 min, 100 requests
  
  // Read operations
  read: () => rateLimit.bind(null, { interval: 60000, maxRequests: 300 }), // 1 min, 300 requests
  
  // API routes default
  default: () => rateLimit.bind(null, { interval: 60000, maxRequests: 100 }),
}
