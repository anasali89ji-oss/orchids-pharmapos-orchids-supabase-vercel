'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { usePharmacy } from '@/lib/pharmacy-context'
import { toast } from 'sonner'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { pharmacy } = usePharmacy()

  useEffect(() => {
    if (!pharmacy) return

    const isSuspended = pharmacy.is_suspended
    const isCancelled =
      pharmacy.subscription_status === 'cancelled' ||
      pharmacy.subscription_status === 'canceled' ||
      pharmacy.subscription_status === 'inactive'

    if ((isSuspended || isCancelled) && pathname !== '/suspended') {
      router.push('/suspended')
      return
    }

    if (pharmacy.subscription_status === 'past_due') {
      toast.warning(
        'Payment overdue — update your payment method in Settings to avoid service interruption',
        { duration: 10000 }
      )
    }
  }, [pharmacy, pathname, router])

  return <>{children}</>
}

export function SubscriptionBanner() {
  const { pharmacy } = usePharmacy()
  const router = useRouter()

  if (!pharmacy) return null

  const { subscription_status, subscription_tier } = pharmacy

  if (subscription_status === 'active' || subscription_status === 'trialing') return null

  if (subscription_status === 'past_due') {
    return (
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 text-yellow-500" />
            <p className="text-sm font-semibold text-yellow-700">
              Payment Failed — Update your payment method to keep your{' '}
              {subscription_tier?.toUpperCase()} plan active
            </p>
          </div>
          <button
            onClick={() => router.push('/settings?tab=billing')}
            className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
          >
            <FiRefreshCw className="w-4 h-4" />
            Update Payment
          </button>
        </div>
      </div>
    )
  }

  if (subscription_status === 'pending') {
    return (
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 text-blue-500" />
            <p className="text-sm font-semibold text-blue-700">
              Subscription Pending — Complete setup to activate your{' '}
              {subscription_tier?.toUpperCase()} plan
            </p>
          </div>
          <button
            onClick={() => router.push('/settings?tab=billing')}
            className="px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Complete Setup
          </button>
        </div>
      </div>
    )
  }

  return null
}

export function useSubscription() {
  const { pharmacy } = usePharmacy()

  const isActive = () =>
    pharmacy?.subscription_status === 'active' || pharmacy?.subscription_status === 'trialing'
  const isSuspended = () => !!pharmacy?.is_suspended
  const isPastDue = () => pharmacy?.subscription_status === 'past_due'
  const canAccessFeature = (requiredStatuses: string[]) =>
    pharmacy ? requiredStatuses.includes(pharmacy.subscription_status) : false

  return { isActive, isSuspended, isPastDue, canAccessFeature }
}
