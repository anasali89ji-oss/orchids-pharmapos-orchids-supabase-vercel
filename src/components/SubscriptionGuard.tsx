'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePharmacy } from '@/lib/pharmacy-context'
import { toast } from 'sonner'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { pharmacy } = usePharmacy()
  const router = useRouter()
  const pathname = router.pathname

  useEffect(() => {
    if (!pharmacy) return

    const { subscription_status, is_suspended, billing_cycle_anchor } = pharmacy

    if (is_suspended || subscription_status === 'cancelled') {
      router.push('/suspended')
      return
    }

    if (pathname === '/suspended') return

    if (subscription_status === 'past_due') {
      toast.warning(
        'Payment Issue - Please update your payment method in Settings to avoid service interruption',
        {
          duration: 10000,
          icon: <FiAlertTriangle className="w-5 h-5" />
        }
      )
    }
  }, [pharmacy, pathname, router])

  if (!pharmacy || pharmacy.is_suspended || pharmacy.subscription_status === 'cancelled') {
    return null
  }

  return <>{children}</>
}

export function SubscriptionBanner() {
  const { pharmacy } = usePharmacy()
  const router = useRouter()

  if (!pharmacy) return null

  const { subscription_status, subscription_tier, billing_cycle_anchor } = pharmacy

  if (subscription_status === 'active' || subscription_status === 'trialing') {
    return null
  }

  const handleGoToBilling = () => {
    router.push('/settings?tab=billing')
  }

  if (subscription_status === 'past_due') {
    return (
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-semibold text-yellow-600">
                Payment Failed
              </p>
              <p className="text-sm text-yellow-600/70">
                Please update your payment method to continue using {subscription_tier} plan
              </p>
            </div>
          </div>
          <button
            onClick={handleGoToBilling}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
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
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-semibold text-blue-600">
                Subscription Pending
              </p>
              <p className="text-sm text-blue-600/70">
                Complete your subscription setup to activate your {subscription_tier} plan
              </p>
            </div>
          </div>
          <button
            onClick={handleGoToBilling}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Complete Setup
          </button>
        </div>
      </div>
    )
  }

  return null
}
