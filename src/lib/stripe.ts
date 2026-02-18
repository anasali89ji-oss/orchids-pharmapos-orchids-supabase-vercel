import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion,
  typescript: true,
})

export const STRIPE_PRICES = {
  pro: {
    monthly: 'price_1T28t4IoLYOHkmqpbW4wOr3i',
    amount: 14999,
    label: 'Pro',
  },
  enterprise: {
    monthly: 'price_1T28t4IoLYOHkmqpkYHY4lbo',
    amount: 24999,
    label: 'Enterprise',
  },
} as const

export type SubscriptionTier = keyof typeof STRIPE_PRICES
