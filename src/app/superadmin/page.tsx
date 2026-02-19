'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Settings, 
  LogOut,
  Shield,
  Calendar,
  DollarSign
} from 'lucide-react'

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/superadmin-login')
          return
        }

        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('status')
          .eq('auth_user_id', session.user.id)
          .single()

        if (!superAdminData || superAdminData.status !== 'active') {
          await supabase.auth.signOut()
          router.push('/superadmin-login')
          return
        }

        const { data: pharmaciesData } = await supabase
          .from('pharmacies')
          .select('*')
          .order('created_at', { ascending: false })

        if (pharmaciesData) {
          setPharmacies(pharmaciesData)
        }

        setLoading(false)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/superadmin-login')
      }
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      router.push('/superadmin-login')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const totalRevenue = pharmacies.reduce((sum, p) => sum + (p.revenue || 0), 0)
  const activePharmacies = pharmacies.filter(p => p.subscription_status === 'active').length
  const suspendedPharmacies = pharmacies.filter(p => p.is_suspended).length

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-semibold text-xl">PharmaPOS Admin</span>
            </div>

            <div className="flex items-center gap-4">
              <a href="/settings" className="text-gray-300 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </a>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Super Admin Dashboard</h1>
          <p className="text-gray-400">Manage all pharmacies and system settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-centerjustify-between mb-4">
              <Building2 className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{pharmacies.length}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Pharmacies</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">{activePharmacies}</span>
            </div>
            <p className="text-gray-400 text-sm">Active Subscriptions</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold text-white">PKR {totalRevenue.toLocaleString()}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Revenue</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">{suspendedPharmacies}</span>
            </div>
            <p className="text-gray-400 text-sm">Suspended Accounts</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">All Pharmacies</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pharmacy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {pharmacies.map((pharmacy) => (
                  <tr key={pharmacy.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{pharmacy.name}</div>
                      <div className="text-gray-400 text-sm">{pharmacy.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{pharmacy.admin_email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {pharmacy.is_suspended ? (
                        <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-full">Suspended</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300 capitalize">{pharmacy.subscription_tier || 'pro'}</td>
                    <td className="px-6 py-4 text-gray-300">{pharmacy.users_count || 0}/50</td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(pharmacy.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/pharmacy/${pharmacy.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
