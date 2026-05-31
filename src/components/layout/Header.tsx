'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiMenu, FiBell, FiMoon, FiSun, FiX, FiFileText, FiSidebar } from 'react-icons/fi'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { Product, Sale } from '@/types'
import Link from 'next/link'

interface HeaderProps {
  onMenuClick?: () => void
  onToggleSidebar?: () => void
  title?: string
  subtitle?: string
}

export function Header({ onMenuClick, onToggleSidebar, title, subtitle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ products: Product[], receipts: Sale[] }>({ products: [], receipts: [] })
  const [showResults, setShowResults] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { theme, setTheme } = useTheme()
  const searchRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  // Bug 22 & 23 fix: pull real user data
  const { user } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Bug 23 fix: fetch actual unread notification count
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.pharmacy_id) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('pharmacy_id', user.pharmacy_id)
      setUnreadCount(count || 0)
    }
    fetchNotifications()
  }, [user, supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchData = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ products: [], receipts: [] })
        return
      }

      const [productsRes, salesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
          .limit(5),
        supabase
          .from('sales')
          .select('*')
          .or(`receipt_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%`)
          .limit(5)
      ])

      setSearchResults({
        products: productsRes.data || [],
        receipts: salesRes.data || []
      })
    }

    const debounce = setTimeout(searchData, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, supabase])

  const hasResults = searchResults.products.length > 0 || searchResults.receipts.length > 0

  return (
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-6 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleSidebar}
            className="hidden lg:block rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FiSidebar className="h-5 w-5" />
          </button>

          {title && (
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>

      <div className="flex flex-1 items-center justify-center px-4" ref={searchRef}>
        <div className="relative w-full max-w-lg">
          <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products, receipts..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-11 pr-4 text-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSearchResults({ products: [], receipts: [] })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <FiX className="h-3 w-3" />
            </button>
          )}

          <AnimatePresence>
            {showResults && searchQuery.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
              >
                {!hasResults ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <>
                    {searchResults.products.length > 0 && (
                      <div>
                        <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Products
                        </div>
                        {searchResults.products.map((product) => (
                          <Link
                            key={product.id}
                            href={`/products?id=${product.id}`}
                            onClick={() => setShowResults(false)}
                            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted"
                          >
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.brand} - Stock: {product.stock}</p>
                            </div>
                            <span className="font-semibold text-primary">PKR {product.price.toFixed(2)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.receipts.length > 0 && (
                      <div>
                        <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Receipts
                        </div>
                        {searchResults.receipts.map((sale) => (
                          <Link
                            key={sale.id}
                            href={`/receipts?id=${sale.id}`}
                            onClick={() => setShowResults(false)}
                            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted"
                          >
                            <div className="flex items-center gap-3">
                              <FiFileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-foreground">{sale.receipt_number}</p>
                                <p className="text-sm text-muted-foreground">{sale.customer_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-primary">PKR {sale.grand_total.toFixed(2)}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(sale.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <FiBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
          )}
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
          </button>
        )}

        <div className="ml-2 flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role?.replace(/_/g, ' ') || 'Staff'}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
