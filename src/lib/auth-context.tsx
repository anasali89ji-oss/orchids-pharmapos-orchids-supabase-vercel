'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export interface UserRole {
  id: string
  name: 'super_admin' | 'pharmacy_admin' | 'manager' | 'pharmacist' | 
        'cashier' | 'inventory_clerk' | 'accountant' | 'reporting_analyst' | 
        'sales_representative' | 'support_agent' | 'procurement_officer' | 
        'warehouse_supervisor' | 'delivery_coordinator'
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/superadmin-login']
const SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000
const ACTIVITY_KEY = 'pharmapos_last_activity'
const USER_CACHE_KEY = 'pharmapos_user_cache'

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  super_admin: { all: true },
  pharmacy_admin: { 
    all: false, manage_users: true, view_reports: true, manage_settings: true, process_sales: true, 
    manage_inventory: true, manage_returns: true, view_accounting: true, export_data: true, 
    view_dashboard: true, manage_purchases: true
  },
  manager: { 
    all: false, manage_users: true, view_reports: true, manage_settings: true, process_sales: true, 
    manage_inventory: true, manage_returns: true, view_accounting: true, view_dashboard: true, manage_purchases: true
  },
  pharmacist: { all: false, process_sales: true, manage_products: true, view_products: true },
  cashier: { all: false, process_sales: true, manage_returns: true, view_products: true, view_customers: true },
  inventory_clerk: { all: false, manage_inventory: true, manage_purchases: true, manage_suppliers: true, view_products: true },
  accountant: { all: false, view_reports: true, view_accounting: true, manage_ledger: true, manage_credits: true },
  reporting_analyst: { all: false, view_reports: true, view_dashboard: true, export_data: true },
  sales_representative: { all: false, process_sales: true, manage_credits: true, manage_customers: true },
  support_agent: { all: false, process_sales: true, manage_returns: true, manage_customers: true, view_suppliers: true },
  procurement_officer: { all: false, manage_inventory: true, manage_purchases: true, manage_suppliers: true },
  warehouse_supervisor: { all: false, view_reports: true, manage_inventory: true },
  delivery_coordinator: { all: false, process_sales: true, manage_customers: true }
}

function getCachedUser(): AppUser | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

function setCachedUser(user: AppUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_CACHE_KEY)
  } catch {}
}

function getLastActivity(): number {
  if (typeof window === 'undefined') return Date.now()
  try {
    const stored = localStorage.getItem(ACTIVITY_KEY)
    return stored ? parseInt(stored, 10) : Date.now()
  } catch { return Date.now() }
}

function updateLastActivity() {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(ACTIVITY_KEY, Date.now().toString()) } catch {}
}

function isSessionExpired(): boolean {
  return Date.now() - getLastActivity() > SESSION_TIMEOUT_MS
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => getCachedUser())
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialized = useRef(false)

  const fetchUserProfile = useCallback(async (authUser: User): Promise<AppUser | null> => {
    try {
      const { data: superAdminData } = await supabase
        .from('super_admins')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (superAdminData) {
        const appUser: AppUser = {
          id: superAdminData.id,
          email: superAdminData.email,
          name: superAdminData.name || 'Super Admin',
          role: 'super_admin',
          status: superAdminData.status || 'active',
          permissions: ROLE_PERMISSIONS.super_admin,
          is_super_admin: true
        }
        setCachedUser(appUser)
        return appUser
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (userData) {
        const role = userData.role || 'cashier'
        const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier

        const appUser: AppUser = {
          id: userData.id,
          email: userData.email,
          name: userData.name || authUser.email?.split('@')[0] || 'User',
          role: role,
          role_id: userData.role_id,
          phone: userData.phone,
          avatar_url: userData.avatar_url,
          status: userData.status || 'active',
          permissions,
          pharmacy_id: userData.pharmacy_id,
          is_pharmacy_admin: userData.is_pharmacy_admin || false,
          is_super_admin: false
        }
        setCachedUser(appUser)
        return appUser
      }

      return null
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }, [supabase])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false
    if (user.permissions.all) return true
    return user.permissions[permission] === true
  }, [user])

  const isRole = useCallback((role: string | string[]): boolean => {
    if (!user) return false
    if (Array.isArray(role)) return role.includes(user.role)
    return user.role === role
  }, [user])

  const refreshUser = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (currentSession?.user) {
      const profile = await fetchUserProfile(currentSession.user)
      setUser(profile)
    }
  }, [supabase, fetchUserProfile])

  const forceSignOut = useCallback(async () => {
    setCachedUser(null)
    localStorage.removeItem(ACTIVITY_KEY)
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/login')
  }, [supabase, router])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const initAuth = async () => {
      try {
        if (isSessionExpired()) {
          await forceSignOut()
          setLoading(false)
          return
        }

        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (currentSession?.user) {
          setSession(currentSession)
          updateLastActivity()

          const cachedUser = getCachedUser()
          if (cachedUser && cachedUser.email === currentSession.user.email) {
            setUser(cachedUser)
            setLoading(false)
            fetchUserProfile(currentSession.user).then(profile => {
              if (profile) setUser(profile)
            })
          } else {
            const profile = await fetchUserProfile(currentSession.user)
            setUser(profile)
            setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth init error:', error)
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)

      if (event === 'SIGNED_IN' && newSession?.user) {
        updateLastActivity()
        const profile = await fetchUserProfile(newSession.user)
        setUser(profile)
      } else if (event === 'SIGNED_OUT') {
        setCachedUser(null)
        setUser(null)
      }
    })

      return () => subscription.unsubscribe()
    }, [supabase, fetchUserProfile, router, forceSignOut])

    useEffect(() => {
      if (typeof window === 'undefined') return

      const trackActivity = () => updateLastActivity()
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'pointermove', 'focus']
      events.forEach(event => window.addEventListener(event, trackActivity, { passive: true }))

      activityTimerRef.current = setInterval(() => {
        if (session && isSessionExpired()) {
          forceSignOut()
        }
      }, 300000)

      const handleVisibilityChange = () => {
        if (!document.hidden && session) {
          supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession) {
              supabase.auth.refreshSession()
              updateLastActivity()
            }
          })
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        events.forEach(event => window.removeEventListener(event, trackActivity))
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (activityTimerRef.current) clearInterval(activityTimerRef.current)
      }
    }, [session, forceSignOut, supabase])

    useEffect(() => {
      if (!session) return

      const refreshInterval = setInterval(async () => {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (currentSession) {
            const { error } = await supabase.auth.refreshSession()
            if (error) {
              console.error('Session refresh error:', error)
            } else {
              updateLastActivity()
            }
          }
        } catch (error) {
          console.error('Session refresh failed:', error)
        }
      }, 10 * 60 * 1000)

      const proactiveRefreshInterval = setInterval(() => {
        const inactiveTime = Date.now() - getLastActivity()
        if (inactiveTime > 5 * 60 * 1000 && inactiveTime < SESSION_TIMEOUT_MS) {
          supabase.auth.refreshSession().catch(console.error)
        }
      }, 60 * 1000)

      return () => {
        clearInterval(refreshInterval)
        clearInterval(proactiveRefreshInterval)
      }
    }, [session, supabase])

  useEffect(() => {
    if (loading) return

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

    if (!session && !isPublicRoute) {
      if (pathname?.startsWith('/superadmin')) {
        router.push('/superadmin-login')
      } else {
        router.push('/login')
      }
      return
    }

    if (session && user && !isPublicRoute) {
      if (pathname?.startsWith('/superadmin') && !user.is_super_admin) {
        router.push('/login')
        return
      }

      if (!pathname?.startsWith('/superadmin') && user.is_super_admin) {
        return
      }
    }
  }, [loading, session, user, pathname, router])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: new Error(error.message) }
      updateLastActivity()
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    setCachedUser(null)
    localStorage.removeItem(ACTIVITY_KEY)
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/login')
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return { error: new Error(error.message) }
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signOut,
      updatePassword,
      hasPermission,
      isRole,
      refreshUser
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
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  return { user, loading }
}

export function useRequirePermission(permission: string) {
  const { hasPermission, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !hasPermission(permission)) router.push('/pos')
  }, [loading, user, permission, hasPermission, router])

  return { hasPermission: hasPermission(permission), loading }
}
