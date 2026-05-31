'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', session.user.id)
          .single()

        if (profile?.role === 'cashier') {
          router.replace('/pos')
        } else {
          router.replace('/dashboard')
        }
      } else {
        router.replace('/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-blue-50">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-600">Loading PharmaPOS...</p>
      </div>
    </div>
  )
}
