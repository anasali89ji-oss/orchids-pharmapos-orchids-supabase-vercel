'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  FiUsers, FiPlus, FiEdit2, FiTrash2, FiShield,
  FiUserCheck, FiUserX, FiKey, FiSearch
} from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  name: string
  role: string
  phone: string
  status: string
  last_login: string | null
  created_at: string
}

function UsersContent() {
  const { user: currentUser, hasPermission, isRole } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ email: '', name: '', phone: '', role: 'cashier', password: '' })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    setUsers(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openModal = (user?: User) => {
    if (user) {
      setSelectedUser(user)
      setFormData({
        email: user.email,
        name: user.name,
        phone: user.phone || '',
        role: user.role,
        password: ''
      })
    } else {
      setSelectedUser(null)
      setFormData({ email: '', name: '', phone: '', role: 'cashier', password: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.email || !formData.name) {
      toast.error('Email and name are required')
      return
    }

    setSaving(true)

    try {
      if (selectedUser) {
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            phone: formData.phone,
            role: formData.role
          })
          .eq('id', selectedUser.id)

        if (error) throw error
        toast.success('User updated successfully')
      } else {
        if (!formData.password || formData.password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setSaving(false)
          return
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        })

        if (authError) throw authError

        const { error: userError } = await supabase
          .from('users')
          .insert({
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
            role: formData.role,
            status: 'active'
          })

        if (userError) throw userError
        toast.success('User created successfully')
      }

      setModalOpen(false)
      fetchUsers()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save user'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
    fetchUsers()
  }

  const openPasswordModal = (user: User) => {
    setSelectedUser(user)
    setNewPassword('')
    setPasswordModalOpen(true)
  }

  const handlePasswordChange = async () => {
    if (!selectedUser) return
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, newPassword })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to change password')
      }

      toast.success('Password updated successfully')
      setPasswordModalOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Cannot delete your own account')
      return
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to delete user')
      return
    }

    toast.success('User deleted')
    fetchUsers()
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      cashier: 'bg-green-100 text-green-700'
    }
    return styles[role] || 'bg-gray-100 text-gray-700'
  }

  if (!hasPermission('manage_users') && !isRole('super_admin')) {
    return (
      <DashboardLayout title="Access Denied" subtitle="You don't have permission">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Only administrators can manage users.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="User Management" subtitle="Manage system users and roles">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <FiPlus className="h-4 w-4" />
            Add User
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-muted-foreground">Super Admins</p>
            <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'super_admin').length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'admin').length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-muted-foreground">Cashiers</p>
            <p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'cashier').length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-red-600">{users.filter(u => u.status === 'inactive').length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FiUsers className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-muted-foreground">Last Login</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadge(user.role)}`}>
                          <FiShield className="h-3 w-3" />
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.status === 'active' ? <FiUserCheck className="h-3 w-3" /> : <FiUserX className="h-3 w-3" />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {user.last_login ? format(new Date(user.last_login), 'PPp') : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openModal(user)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => openPasswordModal(user)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Change Password">
                            <FiKey className="h-4 w-4" />
                          </button>
                          <button onClick={() => toggleStatus(user)} className={`rounded-lg p-2 ${user.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`} title={user.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {user.status === 'active' ? <FiUserX className="h-4 w-4" /> : <FiUserCheck className="h-4 w-4" />}
                          </button>
                          {user.id !== currentUser?.id && (
                            <button onClick={() => deleteUser(user)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete">
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none" placeholder="John Doe" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!selectedUser}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50" placeholder="john@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none" placeholder="+92 300 1234567" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none">
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
                {isRole('super_admin') && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
            {!selectedUser && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Password</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none" placeholder="Minimum 6 characters" />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-border py-3 font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Changing password for: <strong>{selectedUser?.email}</strong>
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none" placeholder="Minimum 6 characters" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPasswordModalOpen(false)} className="flex-1 rounded-xl border border-border py-3 font-medium hover:bg-muted">Cancel</button>
            <button onClick={handlePasswordChange} disabled={saving} className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default function UsersPage() {
  return (
    <ErrorBoundary>
      <UsersContent />
    </ErrorBoundary>
  )
}
