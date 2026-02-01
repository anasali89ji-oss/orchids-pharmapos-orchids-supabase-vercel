'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { FiUser, FiMail, FiPhone, FiLock, FiSave, FiShield } from 'react-icons/fi'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const { user, updatePassword, refreshUser, hasPermission } = useAuth()
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier'
  })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role
      })
    }
  }, [user])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshUser()
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error('Please fill all password fields')
      return
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match')
      return
    }
    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    const { error } = await updatePassword(passwords.new)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password changed successfully')
    setPasswords({ current: '', new: '', confirm: '' })
  }

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account settings">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
              {profile.name.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{profile.name || 'User'}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  profile.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                  profile.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  <FiShield className="mr-1 inline h-3 w-3" />
                  {profile.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full rounded-lg border border-border bg-muted pl-11 pr-4 py-2.5 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone Number</label>
              <div className="relative">
                <FiPhone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role</label>
              <div className="relative">
                <FiShield className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} disabled
                  className="w-full rounded-lg border border-border bg-muted pl-11 pr-4 py-2.5 text-sm cursor-not-allowed" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={saveProfile} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <FiSave className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Change Password</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Current Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-11 pr-4 py-2.5 text-sm" placeholder="Enter current" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-11 pr-4 py-2.5 text-sm" placeholder="Enter new" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-11 pr-4 py-2.5 text-sm" placeholder="Confirm new" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={changePassword}
              className="inline-flex items-center gap-2 rounded-xl border border-primary px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/5">
              <FiLock className="h-4 w-4" /> Update Password
            </button>
          </div>
        </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Access Permissions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { name: 'Point of Sale', enabled: hasPermission('process_sales') },
                { name: 'Product Management', enabled: hasPermission('manage_inventory') },
                { name: 'Inventory Management', enabled: hasPermission('manage_inventory') },
                { name: 'Customer Management', enabled: hasPermission('process_sales') },
                { name: 'Reports & Analytics', enabled: hasPermission('view_reports') },
                { name: 'Financial Accounting', enabled: hasPermission('view_accounting') },
                { name: 'User Management', enabled: hasPermission('manage_users') },
                { name: 'System Settings', enabled: hasPermission('manage_settings') },
              ].map(perm => (
                <div key={perm.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{perm.name}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${perm.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {perm.enabled ? 'Allowed' : 'Restricted'}
                  </span>
                </div>
              ))}
            </div>
          </div>

      </div>
    </DashboardLayout>
  )
}
