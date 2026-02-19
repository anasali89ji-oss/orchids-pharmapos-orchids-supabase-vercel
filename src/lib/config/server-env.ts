/**
 * Server-only Environment Variables
 * 
 * This module provides type-safe access to environment variables.
 * Importing this in client components will throw an error automatically.
 */

import 'server-only'

/**
 * Supabase Configuration
 */
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  region: 'us-east-1',
} as const

/**
 * Stripe Configuration
 */
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  webhookEndpoint: '/api/stripe/webhook',
} as const

/**
 * Application Configuration
 */
export const appConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  nodeEnv: process.env.NODE_ENV || 'development',
  cronSecret: process.env.CRON_SECRET,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000',
} as const

/**
 * Environment Variable Validation
 * Throws if required environment variables are missing
 */
export function validateEnv() {
  const required = {
    'NEXT_PUBLIC_SUPABASE_URL': supabaseConfig.url,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': supabaseConfig.anonKey,
    'SUPABASE_SERVICE_ROLE_KEY': supabaseConfig.serviceRoleKey,
    'STRIPE_SECRET_KEY': stripeConfig.secretKey,
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': stripeConfig.publishableKey,
  }

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return true
}

/**
 * Get configuration for server-side operations
 */
export function getServerConfig() {
  validateEnv()
  
  return {
    supabase: supabaseConfig,
    stripe: stripeConfig,
    app: appConfig,
  }
}
