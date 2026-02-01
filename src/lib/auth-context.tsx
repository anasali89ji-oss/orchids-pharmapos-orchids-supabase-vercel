'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export interface UserRole {
  id: string
  name: 'super_admin' | 'admin' | 'cashier'
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

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password']
const SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000 // 4 hours in milliseconds
const ACTIVITY_KEY = 'pharmapos_last_activity'
const USER_CACHE_KEY = 'pharmapos_user_cache'

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  super_admin: {
    all: true,
    manage_users: true,
    manage_roles: true,
    view_reports: true,
    manage_settings: true,
    process_sales: true,
    manage_inventory: true,
    manage_returns: true,
    view_accounting: true,
    export_data: true,
    delete_data: true,
    view_dashboard: true
  },
  admin: {
    manage_users: false,
    manage_roles: false,
    view_reports: true,
    manage_settings: true,
    process_sales: true,
    manage_inventory: true,
    manage_returns: true,
    view_accounting: true,
    export_data: true,
    delete_data: false,
    view_dashboard: true
  },
  cashier: {
    manage_users: false,
    manage_roles: false,
    view_reports: false,
    manage_settings: false,
    process_sales: true,
    manage_inventory: false,
    manage_returns: true,
    view_accounting: false,
    export_data: false,
    delete_data: false,
    view_dashboard: false
  }
}

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['view_dashboard'],
  '/pos': ['process_sales'],
  '/held-sales': ['process_sales'],
  '/products': ['manage_inventory'],
  '/inventory': ['manage_inventory'],
  '/suppliers': ['manage_inventory'],
  '/purchases': ['manage_inventory'],
  '/returns': ['manage_returns'],
  '/reports': ['view_reports'],
  '/accounting': ['view_accounting'],
  '/receipts': ['process_sales'],
  '/customers': ['process_sales'],
  '/notifications': ['process_sales'],
  '/settings': ['manage_settings'],
  '/profile': ['process_sales'],
  '/users': ['manage_users']
}

function getCachedUser(): AppUser | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch {}
  return null
}

function setCachedUser(user: AppUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_CACHE_KEY)
    }
  } catch {}
}

function getLastActivity(): number {
  if (typeof window === 'undefined') return Date.now()
  try {
    const stored = localStorage.getItem(ACTIVITY_KEY)
    return stored ? parseInt(stored, 10) : Date.now()
  } catch {
    return Date.now()
  }
}

function updateLastActivity() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
  } catch {}
}

function isSessionExpired(): boolean {
  const lastActivity = getLastActivity()
  return Date.now() - lastActivity > SESSION_TIMEOUT_MS
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
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single()

      if (profile) {
        const role = profile.role || 'cashier'
        const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier

        const appUser: AppUser = {
          id: profile.id,
          email: profile.email,
          name: profile.name || authUser.email?.split('@')[0] || 'User',
          role: role,
          role_id: profile.role_id,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          status: profile.status || 'active',
          permissions
        }
        setCachedUser(appUser)
        return appUser
      }

      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email: authUser.email,
          name: authUser.email?.split('@')[0] || 'User',
          role: 'super_admin'
        })
        .select()
        .single()

      if (newUser) {
        const appUser: AppUser = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: 'super_admin',
          status: 'active',
          permissions: ROLE_PERMISSIONS.super_admin
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
        
        supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('email', newSession.user.email)
      } else if (event === 'SIGNED_OUT') {
        setCachedUser(null)
        setUser(null)
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchUserProfile, router, forceSignOut])

  useEffect(() => {
    const trackActivity = () => {
      updateLastActivity()
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(event => window.addEventListener(event, trackActivity, { passive: true }))

    activityTimerRef.current = setInterval(() => {
      if (session && isSessionExpired()) {
        forceSignOut()
      }
    }, 60000)

    return () => {
      events.forEach(event => window.removeEventListener(event, trackActivity))
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current)
      }
    }
  }, [session, forceSignOut])

  useEffect(() => {
    if (loading) return

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

    if (!session && !isPublicRoute) {
      router.push('/login')
      return
    }

    if (session && user && !isPublicRoute) {
      const requiredPermissions = ROUTE_PERMISSIONS[pathname || '']
      
      if (requiredPermissions) {
        const hasAccess = requiredPermissions.some(perm => hasPermission(perm))
        
        if (!hasAccess) {
          if (user.permissions.process_sales) {
            router.push('/pos')
          } else {
            router.push('/login')
          }
        }
      }
    }
  }, [loading, session, user, pathname, router])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        return { error: new Error(error.message) }
      }

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
      
      if (error) {
        return { error: new Error(error.message) }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.permissions.all) return true
    return user.permissions[permission] === true
  }

  const isRole = (role: string | string[]): boolean => {
    if (!user) return false
    if (Array.isArray(role)) {
      return role.includes(user.role)
    }
    return user.role === role
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  return { user, loading }
}

export function useRequirePermission(permission: string) {
  const { hasPermission, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !hasPermission(permission)) {
      router.push('/pos')
    }
  }, [loading, user, permission, hasPermission, router])

  return { hasPermission: hasPermission(permission), loading }
}
