'use client'

import { createContext, useContext, ReactNode } from 'react'

interface Pharmacy {
  id: string
  name: string
  slug: string
  status: string
  subscription_status: string
  plan: string
  logo_url: string | null
  trial_ends_at: string | null
  max_staff_users: number | null
  owner_email: string
  owner_name: string
  phone: string | null
  city: string | null
  country: string
  license_number: string | null
  is_suspended: boolean
  subscription_tier: string
  billing_cycle_anchor: string | null
}

interface PharmacyContextType {
  pharmacy: Pharmacy | null
  loading: boolean
  isSubscriptionActive: boolean
  isTrialing: boolean
  daysLeftInTrial: number | null
  refreshPharmacy: () => Promise<void>
}

// Bypass pharmacy — subscription always active
const BYPASS_PHARMACY: Pharmacy = {
  id: 'bypass-pharmacy-id',
  name: 'Orchids Pharmacy',
  slug: 'orchids-pharmacy',
  status: 'active',
  subscription_status: 'active',
  plan: 'pro',
  logo_url: null,
  trial_ends_at: null,
  max_staff_users: 50,
  owner_email: 'admin@pharmapos.com',
  owner_name: 'Admin',
  phone: null,
  city: null,
  country: 'Pakistan',
  license_number: null,
  is_suspended: false,
  subscription_tier: 'pro',
  billing_cycle_anchor: null,
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined)

export function PharmacyProvider({ children }: { children: ReactNode }) {
  return (
    <PharmacyContext.Provider value={{
      pharmacy: BYPASS_PHARMACY,
      loading: false,
      isSubscriptionActive: true,
      isTrialing: false,
      daysLeftInTrial: null,
      refreshPharmacy: async () => {},
    }}>
      {children}
    </PharmacyContext.Provider>
  )
}

export function usePharmacy() {
  const context = useContext(PharmacyContext)
  if (!context) throw new Error('usePharmacy must be used within PharmacyProvider')
  return context
}
