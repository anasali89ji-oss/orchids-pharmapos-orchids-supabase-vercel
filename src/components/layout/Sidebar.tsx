'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FiGrid, FiShoppingCart, FiPauseCircle, FiPackage, FiBox, FiTruck,
  FiShoppingBag, FiRotateCcw, FiBarChart2, FiDollarSign, FiFileText,
  FiUsers, FiSettings, FiUser, FiBell, FiLogOut, FiShield
} from 'react-icons/fi'
import { RiMedicineBottleLine } from 'react-icons/ri'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  permission?: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { icon: FiGrid, label: 'Dashboard', href: '/dashboard', permission: 'view_dashboard' },
  { icon: FiShoppingCart, label: 'Point of Sale', href: '/pos', permission: 'process_sales' },
  { icon: FiPauseCircle, label: 'Held Sales', href: '/held-sales', permission: 'process_sales' },
  { icon: FiPackage, label: 'Products', href: '/products', permission: 'manage_inventory' },
  { icon: FiBox, label: 'Inventory', href: '/inventory', permission: 'manage_inventory' },
  { icon: FiTruck, label: 'Suppliers', href: '/suppliers', permission: 'manage_inventory' },
  { icon: FiShoppingBag, label: 'Purchases', href: '/purchases', permission: 'manage_inventory' },
  { icon: FiRotateCcw, label: 'Returns', href: '/returns', permission: 'manage_returns' },
  { icon: FiBarChart2, label: 'Reports', href: '/reports', permission: 'view_reports' },
  { icon: FiDollarSign, label: 'Accounting', href: '/accounting', permission: 'view_accounting' },
  { icon: FiFileText, label: 'Receipts', href: '/receipts', permission: 'process_sales' },
  { icon: FiUsers, label: 'Customers', href: '/customers', permission: 'process_sales' },
  { icon: FiBell, label: 'Notifications', href: '/notifications', permission: 'process_sales' },
  { icon: FiShield, label: 'Users', href: '/users', roles: ['super_admin'] },
  { icon: FiSettings, label: 'Settings', href: '/settings', permission: 'manage_settings' },
  { icon: FiUser, label: 'Profile', href: '/profile', permission: 'process_sales' },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const { user, hasPermission, isRole, signOut, loading } = useAuth()

  const filteredNavItems = navItems.filter(item => {
    if (!user) return false
    if (user.permissions.all) return true
    if (item.roles && !item.roles.some(r => isRole(r))) return false
    if (item.permission && !hasPermission(item.permission)) return false
    return true
  })

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 h-screen sidebar-gradient text-white transition-all duration-300 no-print',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn(
          'flex items-center gap-3 border-b border-white/10 px-6 py-5',
          collapsed && 'justify-center px-4'
        )}>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"
          >
            <RiMedicineBottleLine className="h-6 w-6" />
          </motion.div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-xl font-bold tracking-tight">PharmaPOS</h1>
              <p className="text-xs text-white/70">Pharmacy Management</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          <ul className="space-y-1 px-3">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="mx-0 h-10 rounded-xl bg-white/10 animate-pulse" />
              ))
            ) : (
            filteredNavItems.map((item, index) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'nav-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-white text-teal-700'
                        : 'text-white/90 hover:bg-white/15',
                      collapsed && 'justify-center px-3'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-teal-600')} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </motion.li>
              )
            })
            )}
          </ul>
        </nav>

        <div className={cn(
          'border-t border-white/10 p-4',
          collapsed && 'px-3'
        )}>
          <div className={cn(
            'flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3',
            collapsed && 'justify-center px-2'
          )}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-amber-900">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-white/60 capitalize">{user?.role?.replace('_', ' ') || 'Guest'}</p>
              </div>
            )}
          </div>
          
          {user && (
            <button
              onClick={signOut}
              className={cn(
                'mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-3'
              )}
              title={collapsed ? 'Sign Out' : undefined}
            >
              <FiLogOut className="h-5 w-5" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
