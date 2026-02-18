'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiXCircle, FiLock, FiLifeBuoy, FiLogOut } from 'react-icons/fi'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

export default function SuspendedPage() {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
          <FiLock className="h-10 w-10 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Account Suspended
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your PharmaPOS account has been suspended. This could be due to:
        </p>

        {/* Reasons */}
        <ul className="text-left space-y-3 mb-8 text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-3">
            <FiXCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span>Overdue subscription payments</span>
          </li>
          <li className="flex items-start gap-3">
            <FiXCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span>Cancelled subscription period ended</span>
          </li>
          <li className="flex items-start gap-3">
            <FiXCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span>Account marked inactive by administrator</span>
          </li>
        </ul>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.open('mailto:support@pharmapos.com', '_self')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
          >
            <FiLifeBuoy className="h-5 w-5" />
            Contact Support
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiLogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>

        {/* Note */}
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
          Please contact support to reactivate your account and restore access to PharmaPOS.
        </p>
      </div>
    </div>
  )
}
