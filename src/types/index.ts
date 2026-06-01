export interface Product {
  id: string
  name: string
  brand: string | null
  generic_name: string | null
  category_id: string | null
  supplier_id: string | null
  barcode: string | null
  sku: string | null
  stock: number
  min_stock: number
  price: number
  cost: number
  batch_number: string | null
  expiry_date: string | null
  manufacture_date: string | null
  unit: string
  requires_prescription: boolean
  controlled_substance: boolean
  description: string | null
  image_url: string | null
  status: 'active' | 'inactive' | 'discontinued'
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  name: string
  price: number
  cost: number
  quantity: number
  total: number
  stock?: number
}

export interface Sale {
  id: string
  receipt_number: string
  customer_id: string | null
  customer_name: string
  user_id: string | null
  items: CartItem[]
  subtotal: number
  tax: number
  discount: number
  grand_total: number
  payment_method: 'Cash' | 'Credit' | 'Card' | 'EasyPaisa' | 'JazzCash' | 'Mixed'
  payment_status: 'Paid' | 'Pending' | 'Partial'
  amount_paid: number
  change_given: number
  notes: string | null
  prescription_id: string | null
  created_at: string
  updated_at: string
}

export interface HeldSale {
  id: string
  customer_name: string
  items: CartItem[]
  total: number
  note: string | null
  user_id: string | null
  created_at: string
}

export interface Purchase {
  id: string
  purchase_number: string
  supplier_id: string | null
  supplier_name: string | null
  purchase_type: 'manual' | 'supplier_order'
  items: PurchaseItem[]
  subtotal: number
  tax: number
  shipping_cost: number
  total_amount: number
  payment_status: 'Paid' | 'Unpaid' | 'Partial'
  amount_paid: number
  invoice_number: string | null
  notes: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseItem {
  name: string
  qty: number
  cost: number
  total: number
  product_id?: string
}

export interface Return {
  id: string
  return_number: string
  sale_id: string | null
  receipt_number: string | null
  customer_name: string | null
  items: CartItem[]
  reason: string | null
  refund_amount: number
  refund_method: 'Cash' | 'Credit' | 'Store Credit'
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed'
  notes: string | null
  approved_by: string | null
  processed_by: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface LedgerEntry {
  id: string
  date: string
  description: string
  ref_id: string | null
  ref_type: string | null
  credit: number
  debit: number
  balance: number
  transaction_type: 'Sale' | 'Purchase' | 'Income' | 'Expense' | 'Adjustment' | 'Payment' | 'Credit Sale' | 'Return'
  supplier_name: string | null
  customer_name: string | null
  notes: string | null
  user_id: string | null
  created_at: string
}

export interface Credit {
  id: string
  sale_id: string | null
  receipt_number: string | null
  customer_id: string | null
  customer_name: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  status: 'Unpaid' | 'Partial' | 'Paid'
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  notes: string | null
  loyalty_points: number
  credit_limit: number
  outstanding_balance: number
  customer_type: 'regular' | 'vip' | 'wholesale'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string
  payment_terms: string | null
  rating: number
  notes: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'cashier'
  avatar_url: string | null
  phone: string | null
  status?: string
  created_at: string
  updated_at: string
}

export interface Settings {
  id: string
  store_name: string
  store_address: string | null
  store_phone: string | null
  store_email: string | null
  currency: string
  tax_rate: number
  opening_balance: number
  logo_url: string | null
  receipt_header: string | null
  receipt_footer: string | null
  low_stock_threshold: number
  expiry_warning_days: number
  language: string
  theme: string
  created_at: string
  updated_at: string
}

export interface StockAdjustment {
  id: string
  product_id: string | null
  product_name: string | null
  adjustment_type: 'add' | 'remove' | 'correction' | 'expired' | 'damaged'
  quantity_before: number
  quantity_change: number
  quantity_after: number
  reason: string | null
  notes: string | null
  user_id: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  user_id: string | null
  user_name: string | null
  ip_address: string | null
  created_at: string
}

export interface DashboardStats {
  todaySales: number
  todayProfit: number
  totalProducts: number
  lowStockCount: number
  expiringCount: number
  pendingCredits: number
  cashOnHand: number
  monthlyRevenue: number
}
