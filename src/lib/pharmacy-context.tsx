'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

interface Pharmacy {
  id: string
  name: string
  slug: string
  status: string
  subscription_status: string
  plan: string
  logo_url: string | null
  trial_ends_at: string | null
  max_staff_users: number
  owner_email: string
  owner_name: string
  phone: string | null
  city: string | null
  country: string
  license_number: string | null
}

interface PharmacyContextType {
  pharmacy: Pharmacy | null
  loading: boolean
  isSubscriptionActive: boolean
  isTrialing: boolean
  daysLeftInTrial: number | null
  refreshPharmacy: () => Promise<void>
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined)

export function PharmacyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchPharmacy = async () => {
    if (!user?.pharmacy_id) {
      setPharmacy(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('id', user.pharmacy_id)
        .single()

      if (error) {
        console.error('Error fetching pharmacy:', error)
        setPharmacy(null)
      } else {
        setPharmacy(data)
      }
    } catch (error) {
      console.error('Error fetching pharmacy:', error)
      setPharmacy(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshPharmacy = async () => {
    await fetchPharmacy()
  }

  useEffect(() => {
    fetchPharmacy()
  }, [user?.pharmacy_id])

  const isSubscriptionActive = pharmacy?.subscription_status === 'active'
  const isTrialing = pharmacy?.subscription_status === 'trialing'
  const daysLeftInTrial = pharmacy?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(pharmacy.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  return (
    <PharmacyContext.Provider value={{ pharmacy, loading, isSubscriptionActive, isTrialing, daysLeftInTrial, refreshPharmacy }}>
      {children}
    </PharmacyContext.Provider>
  )
}

export function usePharmacy() {
  const context = useContext(PharmacyContext)
  if (!context) throw new Error('usePharmacy must be used within PharmacyProvider')
  return context
}
