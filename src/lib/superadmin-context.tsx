'use client'

import { createContext, useContext, ReactNode } from 'react'

interface SuperAdminData {
  id: string
  name: string
  email: string
  status: string
  last_login: string | null
}

interface SuperAdminContextType {
  isSuperAdmin: boolean
  loading: boolean
  superAdminData: SuperAdminData | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSuperAdmin: () => Promise<void>
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined)

const BYPASS_SUPER_ADMIN: SuperAdminData = {
  id: 'bypass-superadmin-id',
  name: 'Super Admin',
  email: 'admin@pharmapos.com',
  status: 'active',
  last_login: null,
}

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  return (
    <SuperAdminContext.Provider value={{
      isSuperAdmin: true,
      loading: false,
      superAdminData: BYPASS_SUPER_ADMIN,
      signIn: async () => ({ error: null }),
      signOut: async () => {},
      refreshSuperAdmin: async () => {},
    }}>
      {children}
    </SuperAdminContext.Provider>
  )
}

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext)
  if (!context) throw new Error('useSuperAdmin must be used within SuperAdminProvider')
  return context
}
