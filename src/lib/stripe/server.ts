/**
 * Stripe Server Integration
 * Server-only module for Stripe operations
 */

import 'server-only'
import { stripeConfig, validateEnv } from '@/lib/config/server-env'
import { logger } from '@/lib/logger'

/**
 * Stripe client factory
 * Lazy initialization to prevent unnecessary imports
 */
export async function getStripeClient() {
  try {
    validateEnv()
    const { default: Stripe } = await import('stripe')
    
    if (!stripeConfig.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    return new Stripe(stripeConfig.secretKey, {
      apiVersion: '2025-01-27.acacia', // Use latest API version
      typescript: true,
    })
  } catch (error) {
    logger.error('Failed to initialize Stripe client', error as Error)
    throw error
  }
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
) {
  try {
    const stripe = await getStripeClient()
    
    if (!stripeConfig.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    return stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeConfig.webhookSecret
    )
  } catch (error) {
    logger.error('Webhook signature verification failed', error as Error)
    throw error
  }
}

/**
 * Payment helper functions
 */
export const stripeHelpers = {
  /**
   * Create a checkout session
   */
  async createCheckoutSession(pharmacyId: string, tier: string) {
    const stripe = await getStripeClient()
    
    const prices = {
      basic: 9999,
      pro: 14999,
      enterprise: 24999,
    }

    const price = prices[tier as keyof typeof prices] || prices.pro

    return stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'pkr',
          product_data: {
            name: `PharmaPOS ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
          },
          unit_amount: price * 100, // Convert to cents for Stripe
        },
        quantity: 1,
      }],
      metadata: {
        pharmacy_id: pharmacyId,
        tier,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
    })
  },

  /**
   * Create a customer
   */
  async createCustomer(email: string, name: string) {
    const stripe = await getStripeClient()
    
    return stripe.customers.create({
      email,
      name,
    })
  },

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    const stripe = await getStripeClient()
    
    return stripe.subscriptions.retrieve(subscriptionId)
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string) {
    const stripe = await getStripeClient()
    
    return stripe.subscriptions.cancel(subscriptionId)
  },
}

/**
 * Export stripe helpers for easy importing
 */
export default stripeHelpers
