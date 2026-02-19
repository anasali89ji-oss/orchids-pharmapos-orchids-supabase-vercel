'use client'

import { useEffect, useState, useCallback, useMemo, useRef, startTransition, memo } from 'react'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Product, CartItem, Sale } from '@/types'
import { useAuth } from '@/lib/auth-context'
import { isOnline } from '@/lib/sync-service'
import { 
  saveOfflineSale, 
  saveOfflineHeldSale, 
  getCachedProducts, 
  updateCachedProductStock,
  generateOfflineId,
  cacheProducts
} from '@/lib/offline-db'
import { 
  FiSearch, FiPlus, FiMinus, FiTrash2, FiShoppingCart, 
  FiDollarSign, FiCreditCard, FiPrinter, FiPause,
  FiWifi, FiWifiOff, FiZap
} from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'

const TAX_RATE = 0.05
const PRODUCTS_CACHE_KEY = 'pharmapos_products_cache'
const PRODUCTS_CACHE_TIME_KEY = 'pharmapos_products_cache_time'
const CACHE_DURATION = 5 * 60 * 1000

function getProductsFromLocalCache(): Product[] | null {
  try {
    const cached = localStorage.getItem(PRODUCTS_CACHE_KEY)
    const cacheTime = localStorage.getItem(PRODUCTS_CACHE_TIME_KEY)
    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime, 10)
      if (age < CACHE_DURATION) {
        return JSON.parse(cached)
      }
    }
  } catch {}
  return null
}

function setProductsLocalCache(products: Product[]) {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products))
    localStorage.setItem(PRODUCTS_CACHE_TIME_KEY, Date.now().toString())
  } catch {}
}

const ProductCard = memo(function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="rounded-xl border border-border bg-card p-3 text-left transition-all duration-75 hover:border-primary/50 hover:shadow-md active:scale-[0.98] active:bg-primary/5"
    >
      <h4 className="font-medium text-sm text-foreground line-clamp-1">{product.name}</h4>
      <p className="text-xs text-muted-foreground">{product.brand}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-base font-bold text-primary">Rs {product.price}</span>
        <span className={`text-xs ${product.stock <= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>
          {product.stock}
        </span>
      </div>
    </button>
  )
})

const CartItemRow = memo(function CartItemRow({ 
  item, 
  onUpdateQty, 
  onRemove 
}: { 
  item: CartItem; 
  onUpdateQty: (id: string, qty: number) => void; 
  onRemove: (id: string) => void 
}) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{item.name}</h4>
          <p className="text-xs text-muted-foreground">Rs {item.price} x {item.quantity}</p>
        </div>
        <button onClick={() => onRemove(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
          <FiTrash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => onUpdateQty(item.id, item.quantity - 1)}
            className="flex h-7 w-7 items-center justify-center rounded bg-muted hover:bg-muted/80 active:scale-95">
            <FiMinus className="h-3 w-3" />
          </button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <button onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            className="flex h-7 w-7 items-center justify-center rounded bg-muted hover:bg-muted/80 active:scale-95">
            <FiPlus className="h-3 w-3" />
          </button>
        </div>
        <span className="font-bold text-primary">Rs {item.total}</span>
      </div>
    </div>
  )
})

export default function POSPage() {
  const { user, hasPermission } = useAuth()
  const [products, setProducts] = useState<Product[]>(() => getProductsFromLocalCache() || [])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(() => !getProductsFromLocalCache())
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState<Sale | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit'>('Cash')
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [online, setOnline] = useState(true)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const productsCache = useRef<Map<string, Product>>(new Map())
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    setOnline(isOnline())
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    loadProducts()
    checkRestoredCart()
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setSearchQuery('')
        searchInputRef.current?.blur()
      }
      if (e.key === 'F2') {
        e.preventDefault()
        if (cart.length > 0) setCheckoutOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadProducts = async () => {
    try {
      if (online) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .gt('stock', 0)
          .order('name')
        
        if (data) {
          setProducts(data)
          productsCache.current.clear()
          data.forEach(p => productsCache.current.set(p.id, p))
        }
      } else {
        const cached = await getCachedProducts()
        const productList = cached.filter(p => p.stock > 0 && p.status === 'active') as unknown as Product[]
        setProducts(productList)
        productsCache.current.clear()
        productList.forEach(p => productsCache.current.set(p.id, p))
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      const cached = await getCachedProducts()
      setProducts(cached.filter(p => p.stock > 0) as unknown as Product[])
    } finally {
      setLoading(false)
    }
  }

  const checkRestoredCart = () => {
    const restoredCartData = localStorage.getItem('restored_cart')
    const restoredCustomer = localStorage.getItem('restored_customer')
    
    if (restoredCartData) {
      try {
        const items = JSON.parse(restoredCartData) as CartItem[]
        setCart(items)
        toast.success(`Cart restored with ${items.length} items`)
        localStorage.removeItem('restored_cart')
      } catch (e) {
        console.error('Failed to restore cart:', e)
      }
    }
    
    if (restoredCustomer) {
      setCustomerName(restoredCustomer)
      localStorage.removeItem('restored_customer')
    }
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const query = searchQuery.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
      p.barcode?.includes(searchQuery) ||
      p.generic_name?.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  const addToCart = useCallback((product: Product) => {
    startTransition(() => {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id)
        if (existing) {
          if (existing.quantity >= product.stock) {
            toast.error('Stock limit reached')
            return prev
          }
          return prev.map(item => 
            item.id === product.id 
              ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
              : item
          )
        }
        return [...prev, {
          id: product.id,
          name: product.name,
          price: product.price,
          cost: product.cost,
          quantity: 1,
          total: product.price,
          stock: product.stock
        }]
      })
    })
  }, [])

  const updateQuantity = useCallback((id: string, newQty: number) => {
    const product = productsCache.current.get(id)
    if (!product) return
    
    startTransition(() => {
      if (newQty <= 0) {
        setCart(prev => prev.filter(item => item.id !== id))
        return
      }
      if (newQty > product.stock) {
        toast.error('Cannot exceed stock')
        return
      }
      setCart(prev => prev.map(item => 
        item.id === id ? { ...item, quantity: newQty, total: newQty * item.price } : item
      ))
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    startTransition(() => {
      setCart(prev => prev.filter(item => item.id !== id))
    })
  }, [])

  const clearCart = useCallback(() => {
    if (cart.length === 0) return
    setCart([])
    setCustomerName('')
  }, [cart.length])

  const { subtotal, tax, grandTotal } = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + item.total, 0)
    const t = sub * TAX_RATE
    return { subtotal: sub, tax: t, grandTotal: sub + t }
  }, [cart])

  const holdSale = async () => {
    if (cart.length === 0) return

    const heldSale = {
      id: generateOfflineId(),
      customer_name: customerName || 'Walk-in',
      items: cart,
      total: grandTotal,
      note: customerName || 'Held Sale',
      created_at: new Date().toISOString(),
      synced: 0 as number
    }

    if (online) {
      const { error } = await supabase.from('held_sales').insert({
        customer_name: heldSale.customer_name,
        items: heldSale.items,
        total: heldSale.total,
        note: heldSale.note,
        pharmacy_id: user?.pharmacy_id
      })
      if (error) {
        await saveOfflineHeldSale(heldSale)
      }
    } else {
      await saveOfflineHeldSale(heldSale)
    }

    toast.success('Sale held successfully')
    setCart([])
    setCustomerName('')
  }

  const processCheckout = async () => {
    if (cart.length === 0) return
    
    if (paymentMethod === 'Credit' && !customerName.trim()) {
      toast.error('Customer name required for credit sales')
      return
    }

    setProcessingCheckout(true)
    
    const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`
    const saleId = generateOfflineId()
    
    const sale = {
      id: saleId,
      receipt_number: receiptNumber,
      customer_name: customerName || 'Walk-in',
      items: cart,
      subtotal,
      tax,
      discount: 0,
      grand_total: grandTotal,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'Credit' ? 'Pending' : 'Paid',
      amount_paid: paymentMethod === 'Credit' ? 0 : grandTotal,
      change_given: 0,
        created_at: new Date().toISOString(),
        synced: 0 as number
      }

      try {
        for (const item of cart) {
        const product = productsCache.current.get(item.id)
        if (product) {
          const newStock = product.stock - item.quantity
          productsCache.current.set(item.id, { ...product, stock: newStock })
          await updateCachedProductStock(item.id, newStock)
        }
      }

        if (online) {
          const { data: saleData, error: saleError } = await supabase
            .from('sales')
            .insert({
              receipt_number: sale.receipt_number,
              customer_name: sale.customer_name,
              items: sale.items,
              subtotal: sale.subtotal,
              tax: sale.tax,
              discount: 0,
              grand_total: sale.grand_total,
              payment_method: sale.payment_method,
              payment_status: sale.payment_status,
              amount_paid: sale.amount_paid,
              change_given: 0,
              pharmacy_id: user?.pharmacy_id
            })
            .select()
            .single()

        if (saleError) throw saleError

        const stockUpdates = cart.map(item => 
          supabase
            .from('products')
            .update({ stock: (productsCache.current.get(item.id)?.stock || 0) })
            .eq('id', item.id)
        )
        await Promise.all(stockUpdates)

        const { data: lastEntry } = await supabase
          .from('ledger')
          .select('balance')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

          const newBalance = (lastEntry?.balance || 0) + (paymentMethod === 'Credit' ? 0 : grandTotal)

          await supabase.from('ledger').insert({
            description: `POS Sale - ${customerName || 'Walk-in'}`,
            ref_id: receiptNumber,
            ref_type: 'sale',
            credit: paymentMethod === 'Credit' ? 0 : grandTotal,
            debit: 0,
            transaction_type: paymentMethod === 'Credit' ? 'Credit Sale' : 'Sale',
            customer_name: customerName || 'Walk-in',
            balance: newBalance,
            pharmacy_id: user?.pharmacy_id
          })

        if (paymentMethod === 'Credit' && saleData) {
          await supabase.from('credits').insert({
            sale_id: saleData.id,
            receipt_number: receiptNumber,
            customer_name: customerName,
            total_amount: grandTotal,
            remaining_amount: grandTotal,
            status: 'Unpaid',
            pharmacy_id: user?.pharmacy_id
          })
        }

        setCurrentReceipt(saleData as Sale)
      } else {
        await saveOfflineSale(sale)
        setCurrentReceipt(sale as unknown as Sale)
        toast.info('Sale saved offline. Will sync when online.')
      }

      setCheckoutOpen(false)
      setReceiptOpen(true)
      setCart([])
      setCustomerName('')
      
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(c => c.id === p.id)
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.quantity }
        }
        return p
      }).filter(p => p.stock > 0))

      toast.success(online ? 'Sale completed' : 'Sale saved offline')
    } catch (error) {
      console.error('Checkout error:', error)
      await saveOfflineSale(sale)
      toast.warning('Saved offline due to error')
      setCheckoutOpen(false)
      setCart([])
    } finally {
      setProcessingCheckout(false)
    }
  }

  if (!hasPermission('process_sales')) {
    return (
      <DashboardLayout title="Access Denied" subtitle="You don't have permission to access this page">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Contact your administrator for access.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Point of Sale" subtitle="Process sales quickly">
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {online ? <FiWifi className="h-3 w-3" /> : <FiWifiOff className="h-3 w-3" />}
          {online ? 'Online' : 'Offline Mode'}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <FiZap className="h-3 w-3" />
          Instant Mode
        </div>
        {user && (
          <span className="text-xs text-muted-foreground">
            Logged in as: {user.name} ({user.role})
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <div className="lg:col-span-2 xl:col-span-3 space-y-4">
          <div className="rounded-xl bg-card p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search medicine... (Press /)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-muted/50 py-3 pl-12 pr-4 text-base focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-48 rounded-xl border-0 bg-muted/50 px-4 py-3 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-card loading-shimmer" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="rounded-xl border border-border bg-card p-3 text-left transition-all duration-75 hover:border-primary/50 hover:shadow-md active:scale-[0.98] active:bg-primary/5"
                >
                  <h4 className="font-medium text-sm text-foreground line-clamp-1">{product.name}</h4>
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-bold text-primary">Rs {product.price}</span>
                    <span className={`text-xs ${product.stock <= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {product.stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card p-4 shadow-lg lg:sticky lg:top-4 lg:h-[calc(100vh-120px)] flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FiShoppingCart className="h-5 w-5 text-primary" />
              <span className="font-semibold">Cart</span>
            </div>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              {cart.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <FiShoppingCart className="h-10 w-10 opacity-30" />
                <p className="mt-2 text-sm">Empty cart</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">Rs {item.price} x {item.quantity}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-muted hover:bg-muted/80 active:scale-95">
                        <FiMinus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-muted hover:bg-muted/80 active:scale-95">
                        <FiPlus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="font-bold text-primary">Rs {item.total}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rs {subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (5%)</span>
              <span>Rs {tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">Rs {grandTotal.toFixed(0)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={holdSale} disabled={cart.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-amber-500 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 active:scale-[0.98] disabled:opacity-50">
                <FiPause className="h-4 w-4" /> Hold
              </button>
              <button onClick={clearCart} disabled={cart.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-red-500 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 active:scale-[0.98] disabled:opacity-50">
                <FiTrash2 className="h-4 w-4" /> Clear
              </button>
            </div>
            
            <button onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0}
              className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50">
              <FiDollarSign className="mr-1.5 inline h-5 w-5" />
              Checkout (F2)
            </button>
          </div>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Method</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPaymentMethod('Cash')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all ${
                  paymentMethod === 'Cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}>
                <FiDollarSign className={`h-7 w-7 ${paymentMethod === 'Cash' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-semibold">Cash</span>
              </button>
              <button onClick={() => setPaymentMethod('Credit')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all ${
                  paymentMethod === 'Credit' ? 'border-amber-500 bg-amber-50' : 'border-border hover:border-amber-500/50'
                }`}>
                <FiCreditCard className={`h-7 w-7 ${paymentMethod === 'Credit' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                <span className="font-semibold">Credit</span>
              </button>
            </div>
            {paymentMethod === 'Credit' && !customerName && (
              <p className="mt-3 text-sm text-red-500">Customer name required</p>
            )}
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-primary">Rs {grandTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCheckoutOpen(false)}
              className="flex-1 rounded-xl border border-border py-3 font-medium hover:bg-muted">
              Cancel
            </button>
            <button onClick={processCheckout}
              disabled={processingCheckout || (paymentMethod === 'Credit' && !customerName)}
              className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {processingCheckout ? 'Processing...' : 'Complete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {currentReceipt && (
            <div className="rounded-lg border border-dashed border-border p-5 bg-white">
              <div className="text-center border-b border-dashed pb-3 mb-3">
                <h2 className="text-lg font-bold">PharmaPOS</h2>
                <p className="text-xs text-gray-600">{currentReceipt.receipt_number}</p>
                <p className="text-xs text-gray-600">{format(new Date(currentReceipt.created_at), 'PPpp')}</p>
              </div>
              <div className="space-y-1 text-sm border-b border-dashed pb-3 mb-3">
                {currentReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>Rs {item.total}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>Rs {currentReceipt.subtotal}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>Rs {currentReceipt.tax}</span></div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span><span>Rs {currentReceipt.grand_total}</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setReceiptOpen(false)} className="flex-1 rounded-xl border border-border py-3 font-medium hover:bg-muted">
              Close
            </button>
            <button onClick={() => window.print()} className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90">
              <FiPrinter className="mr-2 inline h-4 w-4" /> Print
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
