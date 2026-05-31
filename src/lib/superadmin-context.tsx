'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [superAdminData, setSuperAdminData] = useState<SuperAdminData | null>(null)

  // Bug 15 fix: singleton client — same pattern as auth-context
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  const router = useRouter()

  // Bug 15 fix: add supabase to deps so callback is not a stale closure
  const checkSuperAdmin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    try {
      const { data: sa, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single()

      if (error) {
        console.error('Super admin fetch error:', error)
        setIsSuperAdmin(false)
        setSuperAdminData(null)
      } else if (sa) {
        setIsSuperAdmin(true)
        setSuperAdminData({
          id: sa.id,
          name: sa.name,
          email: sa.email,
          status: sa.status,
          last_login: sa.last_login
        })

        await supabase
          .from('super_admins')
          .update({ last_login: new Date().toISOString() })
          .eq('id', sa.id)
      }
    } catch (error) {
      console.error('Error checking super admin:', error)
      setIsSuperAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [supabase]) // Bug 15 fix: was [] — supabase added

  const refreshSuperAdmin = async () => {
    await checkSuperAdmin()
  }

  useEffect(() => {
    checkSuperAdmin()
  }, [checkSuperAdmin])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: new Error(error.message) }

    // Bug 16 fix: verify by auth_user_id not email
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return { error: new Error('Authentication failed') }
    }

    const { data: sa } = await supabase
      .from('super_admins')
      .select('*')
      .eq('auth_user_id', session.user.id) // was .eq('email', email)
      .single()

    if (!sa) {
      await supabase.auth.signOut()
      return { error: new Error('Not authorized as Super Admin') }
    }

    setIsSuperAdmin(true)
    setSuperAdminData({
      id: sa.id,
      name: sa.name,
      email: sa.email,
      status: sa.status,
      last_login: sa.last_login
    })

    await supabase
      .from('super_admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', sa.id)

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsSuperAdmin(false)
    setSuperAdminData(null)
    router.push('/superadmin-login')
  }

  return (
    <SuperAdminContext.Provider value={{ isSuperAdmin, loading, superAdminData, signIn, signOut, refreshSuperAdmin }}>
      {children}
    </SuperAdminContext.Provider>
  )
}

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext)
  if (!context) throw new Error('useSuperAdmin must be used within SuperAdminProvider')
  return context
}
