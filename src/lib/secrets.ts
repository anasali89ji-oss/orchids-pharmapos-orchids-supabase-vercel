/**
 * Server-only secrets management
 * All environment variables access through this module
 * Throws if accessed from client code
 */

import 'server-only'

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const

/**
 * Get a required environment variable
 * Throws if not set
 */
function getRequiredEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

/**
 * Get an optional environment variable
 * Returns undefined if not set
 */
function getOptionalEnvVar(key: string): string | undefined {
  return process.env[key]
}

/**
 * Validates all required environment variables on startup
 */
export function validateEnvVars(): void {
  for (const key of requiredEnvVars) {
    try {
      getRequiredEnvVar(key)
    } catch (error) {
      console.error(`Environment validation failed: ${error}`)
      throw error
    }
  }
}

// Supabase Configuration
export const supabaseConfig = {
  url: () => getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: () => getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: () => getOptionalEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
} as const

// Stripe Configuration
export const stripeConfig = {
  secretKey: () => getOptionalEnvVar('STRIPE_SECRET_KEY'),
  publishableKey: () => getOptionalEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  webhookSecret: () => getOptionalEnvVar('STRIPE_WEBHOOK_SECRET'),
} as const

// App Configuration
export const appConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}

// Validate environment on import
if (appConfig.isProduction) {
  validateEnvVars()
}

// Export all secrets as a single object for convenience
export const secrets = {
  supabase: supabaseConfig,
  stripe: stripeConfig,
  app: appConfig,
} as const
