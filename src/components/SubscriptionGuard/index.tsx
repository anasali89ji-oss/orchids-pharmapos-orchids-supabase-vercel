'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface Pharmacy {
  subscription_status: string
  is_suspended: boolean
  slug: string
}

interface SubscriptionGuardProps {
  children: React.ReactNode
  pharmacy: Pharmacy | null
}

export function SubscriptionGuard({ children, pharmacy }: SubscriptionGuardProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!pharmacy) return

    const isSuspended = pharmacy.is_suspended
    const isInactive = pharmacy.subscription_status === 'past_due' || 
                      pharmacy.subscription_status === 'cancelled' ||
                      pharmacy.subscription_status === 'canceled'

    if ((isSuspended || isInactive) && pathname !== '/suspended') {
      router.push('/suspended')
    }
  }, [pharmacy, pathname, router])

  return <>{children}</>
}

// Hook to check if user can access premium features
export function useSubscription() {
  const canAccessFeature = (pharmacy: Pharmacy | null, requiredStatus: string[]) => {
    if (!pharmacy) return false
    return requiredStatus.includes(pharmacy.subscription_status)
  }

  const isActive = (pharmacy: Pharmacy | null) => {
    if (!pharmacy) return false
    return pharmacy.subscription_status === 'active' || 
           pharmacy.subscription_status === 'trialing'
  }

  const isSuspended = (pharmacy: Pharmacy | null) => {
    if (!pharmacy) return false
    return pharmacy.is_suspended
  }

  const isPastDue = (pharmacy: Pharmacy | null) => {
    if (!pharmacy) return false
    return pharmacy.subscription_status === 'past_due'
  }

  return {
    canAccessFeature,
    isActive,
    isSuspended,
    isPastDue,
  }
}
