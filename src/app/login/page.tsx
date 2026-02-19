'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn, FiAlertCircle } from 'react-icons/fi'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

        try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (authError) {
          setError(authError.message)
          toast.error('Login failed: ' + authError.message)
          return
        }

        if (data.session) {
          // Check if it's a super admin
          const { data: superAdmin } = await supabase
            .from('super_admins')
            .select('id, status')
            .eq('email', email)
            .maybeSingle()

          if (superAdmin && superAdmin.status === 'active') {
            toast.success('Super Admin login successful!')
            router.push('/superadmin')
            return
          }

          // Check regular user
          const { data: profile } = await supabase
            .from('users')
            .select('role, status')
            .eq('email', email)
            .maybeSingle()

          if (profile?.status === 'inactive') {
            await supabase.auth.signOut()
            setError('Your account has been deactivated. Contact administrator.')
            return
          }

            toast.success('Login successful!')

            // Check for redirect parameter
            const redirectUrlParams = new URLSearchParams(window.location.search)
            const redirectPath = redirectUrlParams.get('redirect')
            
            if (redirectPath && !redirectPath.startsWith('/superadmin')) {
              router.push(redirectPath)
            } else if (profile?.role === 'cashier') {
              router.push('/pos')
            } else {
              router.push('/dashboard')
            }
        }
      } catch (err) {
        console.error('Login error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg mb-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PharmaPOS</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Pharmacy Management System</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
              <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 transition-all focus:border-teal-500 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-3 pl-12 pr-12 text-gray-900 dark:text-white placeholder-gray-500 transition-all focus:border-teal-500 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-600 hover:to-teal-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  <FiLogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Forgot your password?{' '}
              <a href="/forgot-password" className="text-teal-600 hover:text-teal-700 font-medium">
                Reset it here
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-6">
          PharmaPOS v2.0 - Pharmacy Management System
        </p>
      </div>
    </div>
  )
}
