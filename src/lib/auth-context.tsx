'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'

export interface UserRole {
  id: string
  name: string
  description: string
  permissions: Record<string, boolean>
}

export interface AppUser {
  id: string
  email: string
  name: string
  role: string
  role_id?: string
  phone?: string
  avatar_url?: string
  status: string
  permissions: Record<string, boolean>
  pharmacy_id?: string
  is_pharmacy_admin?: boolean
  is_super_admin?: boolean
}

interface AuthContextType {
  user: AppUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  hasPermission: (permission: string) => boolean
  isRole: (role: string | string[]) => boolean
  refreshUser: () => Promise<void>
}

// Hardcoded bypass user — full pharmacy_admin access
const BYPASS_USER: AppUser = {
  id: 'bypass-user-id',
  email: 'admin@pharmapos.com',
  name: 'Admin',
  role: 'pharmacy_admin',
  status: 'active',
  pharmacy_id: 'bypass-pharmacy-id',
  is_pharmacy_admin: true,
  is_super_admin: false,
  permissions: {
    all: false,
    manage_users: true,
    view_reports: true,
    manage_settings: true,
    process_sales: true,
    manage_inventory: true,
    manage_returns: true,
    view_accounting: true,
    export_data: true,
    view_dashboard: true,
    manage_purchases: true,
    manage_products: true,
    view_products: true,
    manage_customers: true,
    view_customers: true,
    manage_suppliers: true,
    view_suppliers: true,
    manage_ledger: true,
    manage_credits: true,
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const signIn = async (_email: string, _password: string) => ({ error: null })
  const signOut = async () => {}
  const updatePassword = async (_newPassword: string) => ({ error: null })
  const hasPermission = (_permission: string) => true
  const isRole = (_role: string | string[]) => true
  const refreshUser = async () => {}

  return (
    <AuthContext.Provider value={{
      user: BYPASS_USER,
      session: null,
      loading: false,
      signIn,
      signOut,
      updatePassword,
      hasPermission,
      isRole,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function useRequireAuth() {
  return { user: BYPASS_USER, loading: false }
}

export function useRequirePermission(_permission: string) {
  return { hasPermission: true, loading: false }
}
